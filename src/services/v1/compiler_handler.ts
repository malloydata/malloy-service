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
import {Runtime, StructDef} from '@malloydata/malloy';
// Import from auto-generated file
// eslint-disable-next-line node/no-unpublished-import
import {CompilerService, ICompilerServer} from './compiler_grpc_pb';
import {
  CompileRequest,
  CompileResponse,
  CompilerRequest,
  SqlBlock,
  // Import from auto-generated file
  // eslint-disable-next-line node/no-unpublished-import
} from './compiler_pb';

import {StreamingCompileConnection} from './streaming_compile_connection';
import {
  StreamingCompileURLReader,
  MissingReferenceError,
} from './streaming_compile_urlreader';
import {CompilerRuntime} from './compiler_runtime';

class CompilerHandler implements ICompilerServer {
  compileStream = (
    call: grpc.ServerDuplexStream<CompileRequest, CompilerRequest>
  ): void => {
    console.log('compileStream Called');
    const urlReader = new StreamingCompileURLReader();
    const connection = new StreamingCompileConnection();
    const runtime = new Runtime(urlReader, connection);
    let modelUrl: URL | undefined = undefined;
    let query = '';
    let queryType = 'unknown';
    call.on('data', (request: CompileRequest) => {
      console.log('compile stream data received');
      const response = new CompilerRequest();
      response.setType(CompilerRequest.Type.UNKNOWN);

      switch (request.getType()) {
        case CompileRequest.Type.COMPILE: {
          console.log('COMPILE received');
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
          }
          if (request.getQuery()) {
            query = request.getQuery();
            queryType = 'query';
          }
          urlReader.addDoc(document);
          break;
        }
        case CompileRequest.Type.REFERENCES:
          console.log('REFERENCES received');
          urlReader.addDocs(request.getReferencesList());
          break;
        case CompileRequest.Type.TABLE_SCHEMAS: {
          console.log('TABLE SCHEMAS received');
          const rawJson = JSON.parse(request.getSchema());
          for (const [name, schema] of Object.entries(rawJson['schemas'])) {
            connection.addTableSchema(name, schema as StructDef);
          }
          break;
        }
        case CompileRequest.Type.SQL_BLOCK_SCHEMAS:
          console.log('SQL BLOCK SCHEMAS received');
          // eslint-disable-next-line no-case-declarations
          const sql_blocks = request.getSqlBlockSchemasList();
          for (const sql_block of sql_blocks) {
            connection.addSqlBlockSchema(sql_block);
          }
          break;
      }

      if (modelUrl === undefined) {
        response.setContent('Compile document url is undefined');
        call.write(response);
        return;
      }

      runtime
        .loadModel(modelUrl)
        .getModel()
        .then(model => {
          switch (queryType) {
            case 'named':
              return model.getPreparedQueryByName(query);
            case 'query':
              return runtime
                .loadModel(modelUrl!)
                .loadQuery(query)
                .getPreparedQuery();
            default:
              throw new Error(`Unhandled query type: ${queryType}`);
          }
        })
        .then(query => query.preparedResult.sql)
        .then(sql => {
          response.setConnectionsList(connection.connectionNames);
          response.setContent(sql);
        })
        .then(() => response.setType(CompilerRequest.Type.COMPLETE))
        .catch(error => this.mapErrorToResponse(response, error))
        .finally(() => {
          call.write(response);
        });
    });
    call.on('end', () => {
      console.log('compile session ended');
    });
  };
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
          // console.log(`Model loaded...`);
          // console.log(JSON.stringify(model, null, 2));
          response.setModel(JSON.stringify(model));
        })
        .then(() => runtime.loadQueryByName(modelUrl, call.request.getQuery()))
        .then(query => query.getSQL())
        .then(sql => {
          // console.log(`sql: ${JSON.stringify(query)}`);
          response.setSql(sql);
        })
        .then(() => {
          // console.log("Response:");
          // console.log(JSON.stringify(response, null, 2));
          callback(null, response);
        })
        .catch(error => {
          console.log(error);
          callback({code: grpc.status.INTERNAL, message: error});
        });
    } catch (ex) {
      console.log(ex);
      callback({
        code: grpc.status.INTERNAL,
        message: 'An internal error has occurred',
      });
    }
  };

  private validate(request: CompileRequest): string[] {
    const errors: string[] = [];
    if (!request.hasDocument()) {
      errors.push('No document to compile was provided');
    }

    return errors;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapErrorToResponse(response: CompilerRequest, error: any) {
    if (error instanceof MissingReferenceError) {
      response.setType(CompilerRequest.Type.IMPORT);
      response.addImportUrls(error.message);
      return;
    }

    if (error.log && error.log[0] && error.log[0].message) {
      const importRegex = new RegExp(/^import error: mlr:\/\/(.+)$/);
      if (importRegex.test(error.log[0].message)) {
        response.setType(CompilerRequest.Type.IMPORT);
        for (const log of error.log) {
          const matches = log.message.match(importRegex);
          if (matches.length > 0) {
            response.addImportUrls(matches[1]);
          } else {
            // console.warn(`Processing import errors, ignoring: ${log.message}`);
          }
        }
        // console.log(response);
        return;
      }

      const schemaRegex = new RegExp(/^No schema data available for {(.+)}$/);
      if (schemaRegex.test(error.log[0].message)) {
        response.setType(CompilerRequest.Type.TABLE_SCHEMAS);
        for (const log of error.log) {
          const matches = log.message.match(schemaRegex);
          if (matches && matches.length > 0) {
            response.addTableSchemas(matches[1]);
          } else {
            // console.warn(`Processing table schemas, ignoring: ${log.message}`);
          }
        }
        console.log(response.getTableSchemasList());
        return;
      }

      const sqlBlockRegex = new RegExp(
        /SQL Block schema missing: \[\[(.+)\]\]{(.+)}$/s
      );
      if (sqlBlockRegex.test(error.log[0].message)) {
        response.setType(CompilerRequest.Type.SQL_BLOCK_SCHEMAS);
        for (const log of error.log) {
          const matches = log.message.match(sqlBlockRegex);
          if (matches && matches.length > 0) {
            const sqlBlock = new SqlBlock();
            sqlBlock.setName(matches[1]);
            sqlBlock.setSql(matches[2]);
            response.setSqlBlock(sqlBlock);
          } else {
            // console.warn(`Processing sql block schemas, ignoring: ${log.message}`);
          }
        }
        // console.log(response);
        return;
      }
    }

    response.setType(CompilerRequest.Type.UNKNOWN);
    response.setContent(error.message);
  }
}

export default {
  service: CompilerService,
  handler: new CompilerHandler(),
};
