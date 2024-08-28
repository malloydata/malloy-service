/*
 * Copyright 2023 Google LLC
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as grpc from '@grpc/grpc-js';
import fs from 'fs';
import path from 'path';
import debug from 'debug';
import {
  MalloyError,
  Runtime,
  StructDef,
  PreparedResult,
  LogMessage,
  PreparedQuery,
} from '@malloydata/malloy';
// Import from auto-generated file
// eslint-disable-next-line n/no-unpublished-import
import {CompilerService, ICompilerServer} from './compiler_grpc_pb';
import {
  CompileRequest,
  CompileResponse,
  CompilerRequest,
  SqlBlock,
  TableSchema,
  ThirdPartyRequest,
  ThirdPartyResponse,
  // Import from auto-generated file
  // eslint-disable-next-line
} from './compiler_pb';

import {CompilerRuntime} from './compiler_runtime';
import {CompilerURLReader} from './compiler_urlreader';
import {StreamingCompileLookupConnection} from './streaming_compile_lookup_connection';
import {
  MissingReferenceError,
  StreamingCompileURLReader,
} from './streaming_compile_urlreader';

/**
 * Malloy Service Compiler - compiles incoming Malloy models and queries.
 * Compiler will only compile and produce sql's for incoming requests. However,
 * compiler will return both compiled sql and PreparedResult object so that the
 * client can use the bundled Malloy Renderer to render the results.
 */
class CompilerHandler implements ICompilerServer {
  log = debug('malloydata:compile_handler');

  /**
   * compileStream
   *
   * @param call GRPC call
   */
  compileStream = (
    call: grpc.ServerDuplexStream<CompileRequest, CompilerRequest>
  ): void => {
    this.log('compileStream Called');
    const urlReader = new StreamingCompileURLReader();
    const lookupConnection = new StreamingCompileLookupConnection();
    const runtime = new Runtime(urlReader, lookupConnection);
    let modelUrl: URL | undefined = undefined;
    let query = '';
    let queryType = 'unknown';

    call.on('data', async (request: CompileRequest) => {
      this.log('compile stream data received');
      const response = new CompilerRequest();
      response.setType(CompilerRequest.Type.UNKNOWN);

      switch (request.getType()) {
        case CompileRequest.Type.COMPILE: {
          this.log('COMPILE received');
          const document = request.getDocument();
          if (document === undefined) {
            response.setContent('Document must be defined for compile request');
            call.write(response);
            return;
          }
          modelUrl = new URL(document.getUrl());
          if (request.getNamedQuery()) {
            query = request.getNamedQuery();
            queryType = 'named';
          } else if (request.getQuery()) {
            query = request.getQuery();
            queryType = 'query';
          } else {
            queryType = 'compile';
          }
          urlReader.addDoc(document);
          break;
        }
        case CompileRequest.Type.REFERENCES:
          this.log('REFERENCES received');
          urlReader.addDocs(request.getReferencesList());
          break;
        case CompileRequest.Type.TABLE_SCHEMAS: {
          const rawJson = JSON.parse(request.getSchema());
          this.log('TABLE SCHEMAS received', Object.keys(rawJson['schemas']));
          for (const [key, schema] of Object.entries(rawJson['schemas']) as [
            string,
            StructDef,
          ][]) {
            if (schema.structRelationship.type === 'basetable') {
              const connection = lookupConnection.getConnection(
                schema.structRelationship.connectionName
              );
              connection.addTableSchema(key, schema);
            }
          }
          break;
        }
        case CompileRequest.Type.SQL_BLOCK_SCHEMAS:
          this.log('SQL BLOCK SCHEMAS received');
          // eslint-disable-next-line no-case-declarations
          const sql_blocks = request.getSqlBlockSchemasList();
          for (const sql_block of sql_blocks) {
            const name = sql_block.getName();
            const schema = JSON.parse(sql_block.getSchema()) as StructDef;
            if (schema.structRelationship.type === 'basetable') {
              const connection = lookupConnection.getConnection(
                schema.structRelationship.connectionName
              );
              connection.addSqlBlockSchema(name, schema);
            }
          }
          break;
      }

      if (modelUrl === undefined) {
        response.setContent('Compile document url is undefined');
        call.write(response);
        return;
      }

      try {
        const modelMaterializer = runtime.loadModel(modelUrl);
        let preparedResult: PreparedResult | undefined = undefined;
        let preparedQuery: PreparedQuery | undefined = undefined;

        switch (queryType) {
          case 'named':
          case 'query':
            {
              const model = await modelMaterializer.getModel();
              if (queryType === 'named') {
                preparedQuery = model.getPreparedQueryByName(query);
                preparedResult = preparedQuery.preparedResult;
              } else {
                preparedQuery = await modelMaterializer
                  .loadQuery(query)
                  .getPreparedQuery();
                preparedResult = preparedQuery.preparedResult;
              }
              for (const problem of preparedQuery.problems) {
                response.addProblems(JSON.stringify(problem));
              }
              response.setConnection(preparedResult.connectionName);
              response.setContent(preparedResult.sql);
              // Stringify twice to handle the escape characters in the string values.
              response.setPreparedResult(
                JSON.stringify(JSON.stringify(preparedResult))
              );
              response.setType(CompilerRequest.Type.COMPLETE);
            }
            break;
          case 'compile':
            {
              const model = await modelMaterializer.getModel();
              for (const problem of model.problems) {
                response.addProblems(JSON.stringify(problem));
              }
              response.setContent(JSON.stringify(model._modelDef));
              response.setType(CompilerRequest.Type.COMPLETE);
            }
            break;
          default:
            throw new Error(`Unhandled query type: ${queryType}`);
        }
      } catch (error) {
        this.mapErrorToResponse(response, error);
      } finally {
        call.write(response);
      }
    });

    call.on('end', () => {
      this.log('compile session ended');
    });
  };

  /**
   * compile
   *
   * @param call GRPC call
   * @param callback GRPC callback
   * @returns void
   */
  compile = (
    call: grpc.ServerUnaryCall<CompileRequest, CompileResponse>,
    callback: grpc.sendUnaryData<CompileResponse>
  ): void => {
    const validationErrors = this.validate(call.request);
    const response = new CompileResponse();
    if (validationErrors.length !== 0) {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: validationErrors.join(','),
      });
    }

    try {
      const modelUrl = new URL(call.request.getDocument()!.getUrl());
      const compilerRuntime = new CompilerRuntime(call.request);
      const compilerURLReader = new CompilerURLReader(call.request);
      const runtime = new Runtime(compilerURLReader, compilerRuntime);
      runtime
        .loadModel(modelUrl)
        .getModel()
        .then(model => {
          // this.log(`Model loaded...`);
          // this.log(JSON.stringify(model, null, 2));
          response.setModel(JSON.stringify(model));
        })
        .then(() => runtime.loadQueryByName(modelUrl, call.request.getQuery()))
        .then(query => query.getSQL())
        .then(sql => {
          // this.log(`sql: ${JSON.stringify(query)}`);
          response.setSql(sql);
        })
        .then(() => {
          // this.log("Response:");
          // this.log(JSON.stringify(response, null, 2));
          callback(null, response);
        })
        .catch(error => {
          this.log(error);
          callback({code: grpc.status.INTERNAL, message: error});
        });
    } catch (ex) {
      this.log(ex);
      callback({
        code: grpc.status.INTERNAL,
        message: 'An internal error has occurred',
      });
    }
  };

  /**
   * third_party
   *
   * @param call GRPC call
   * @param callback GRPC callback
   * @returns void
   */
  thirdParty = (
    call: grpc.ServerUnaryCall<ThirdPartyRequest, ThirdPartyResponse>,
    callback: grpc.sendUnaryData<ThirdPartyResponse>
  ): void => {
    const response = new ThirdPartyResponse();
    response.setMessage(
      fs
        .readFileSync(path.join(__dirname, '../../third_party_notices.txt'))
        .toString()
    );
    callback(null, response);
  };

  private validate(request: CompileRequest): string[] {
    const errors: string[] = [];
    if (!request.hasDocument()) {
      errors.push('No document to compile was provided');
    }

    return errors;
  }

  private onlyWarnings(messages: LogMessage[]): boolean {
    for (const message of messages) {
      if (message.severity !== 'warn') return false;
    }
    return true;
  }

  private getFirstErrorMessage(messages: LogMessage[]): LogMessage | null {
    for (const message of messages) {
      if (message.severity === 'error') return message;
    }
    return null;
  }

  private mapErrorToResponse(response: CompilerRequest, error: unknown) {
    if (error instanceof MissingReferenceError) {
      response.setType(CompilerRequest.Type.IMPORT);
      response.addImportUrls(error.message);
      return;
    }

    if (error instanceof MalloyError) {
      if (this.onlyWarnings(error.problems)) {
        return;
      }
      const problem = this.getFirstErrorMessage(error.problems);
      if (problem === null) {
        return;
      }
      this.log('mapErrorToResponse', problem.message);

      const importRegex = new RegExp(/^import error: mlr:\/\/(.+)$/);
      if (importRegex.test(problem.message)) {
        response.setType(CompilerRequest.Type.IMPORT);
        for (const problem of error.problems) {
          const matches = problem.message.match(importRegex);
          if (matches && matches.length > 0) {
            response.addImportUrls(matches[1]);
          } else {
            this.log(`Processing import errors, ignoring: ${problem.message}`);
          }
        }
        this.log('mapToErrorResponse importUrls', response.getImportUrlsList());
        return;
      }

      const schemaRegex = new RegExp(
        /^No schema data available for {(?<key>.*)} {(?<connection>.*)} {(?<table>.*)}$/
      );
      if (schemaRegex.test(problem.message)) {
        response.setType(CompilerRequest.Type.TABLE_SCHEMAS);
        for (const problem of error.problems) {
          const matches = problem.message.match(schemaRegex);
          if (matches && matches.groups) {
            const {key, connection, table} = matches.groups;
            const tableSchema = new TableSchema();
            tableSchema.setKey(key);
            tableSchema.setConnection(connection);
            tableSchema.setTable(table);
            response.addTableSchemas(tableSchema);
          } else {
            this.log(`Processing table schemas, ignoring: ${problem.message}`);
          }
        }
        this.log(
          'mapToErrorResponse tableSchemas',
          response.getTableSchemasList()
        );
        return;
      }

      const sqlBlockRegex = new RegExp(
        /SQL Block schema missing: \[\[(?<name>.+)\]\]{(?<connection>.+)}{(?<sql>.+)}$/s
      );
      if (sqlBlockRegex.test(problem.message)) {
        response.setType(CompilerRequest.Type.SQL_BLOCK_SCHEMAS);
        for (const problem of error.problems) {
          const matches = problem.message.match(sqlBlockRegex);
          if (matches && matches.groups) {
            const {name, connection, sql} = matches.groups;
            const sqlBlock = new SqlBlock();
            sqlBlock.setName(name);
            sqlBlock.setConnection(connection);
            sqlBlock.setSql(sql);
            response.setSqlBlock(sqlBlock);
          } else {
            this.log(
              `Processing sql block schemas, ignoring: ${problem.message}`
            );
          }
        }
        // this.log(response);
        return;
      }

      response.setType(CompilerRequest.Type.ERROR);
      let line = '';
      if (problem.at) {
        line = ` at line ${problem.at.range.start.line + 1}`;
      }
      response.setContent(`${problem.severity}: ${problem.message}${line}`);
      return;
    }

    response.setType(CompilerRequest.Type.UNKNOWN);
    response.setContent((error as Error).toString());
  }
}

export default {
  service: CompilerService,
  handler: new CompilerHandler(),
};
