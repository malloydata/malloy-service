import * as grpc from '@grpc/grpc-js';
import {
  Runtime,
  URLReader,
  LookupConnection,
  Connection,
  MalloyQueryData,
  SQLBlock,
  StructDef,
  parseTableURI,
} from '@malloydata/malloy';
import {CompilerService, ICompilerServer} from './compiler_grpc_pb';
import {
  CompileDocument,
  CompileRequest,
  CompileResponse,
  CompilerRequest,
  SqlBlock,
  SqlBlockSchema,
} from './compiler_pb';

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

class CompilerURLReader implements URLReader {
  private request: CompileRequest;

  constructor(request: CompileRequest) {
    this.request = request;
  }

  readURL = async (url: URL): Promise<string> => {
    const urlString = decodeURI(url.toString());
    console.log('readURL() called:');
    console.log(urlString);
    if (this.request.getDocument()?.getUrl() === urlString) {
      console.log('found URL');
      return this.request.getDocument()!.getContent();
    }

    for (const reference of this.request.getReferencesList()) {
      if (reference.getUrl() === urlString) {
        console.log('found reference URL');
        return reference.getContent();
      }
    }

    throw new Error(`No document defined for url: ${urlString}`);
  };
}

class CompilerRuntime implements LookupConnection<Connection>, Connection {
  readonly name = 'compiler_runtime';

  private request: CompileRequest;
  private schemas: Record<string, StructDef>;

  constructor(request: CompileRequest) {
    this.request = request;
    try {
      this.schemas = JSON.parse(this.request.getSchema())['schemas'] as Record<
        string,
        StructDef
      >;
    } catch (ex) {
      this.schemas = {};
      console.warn('Error parsing schema');
      console.warn(ex);
    }
  }

  fetchSchemaForSQLBlock = async (
    _block: SQLBlock
  ): Promise<
    | {structDef: StructDef; error?: undefined}
    | {error: string; structDef?: undefined}
  > => {
    console.log('ERROR: fetchSchemaForSQLBlock() called.');
    throw new Error('Method not implemented.');
  };

  runSQL = async (
    _sql: string,
    _options?: unknown
  ): Promise<MalloyQueryData> => {
    console.log('ERROR: runSQL() called.');
    throw new Error('Method not implemented.');
  };

  isPool = async (): Promise<Boolean> => false;

  canPersist = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunSimultaneously = async (): Promise<Boolean> => false;

  canStream = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunStreamSimultaneously = async (): Promise<Boolean> =>
    false;

  async fetchSchemaForTables(tables: string[]): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    console.log(JSON.stringify(tables));
    for (const table of tables) {
      if (!(table in this.schemas)) {
        throw new Error(`Requested table (${table}) not found in schema data.`);
      }
    }
    return {schemas: this.schemas, errors: {}};
  }

  fetchSchemaForSQLBlocks(_sqlStructs: SQLBlock[]): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    console.log('ERROR: fetchSchemaForSQLBlocks() called.');
    throw new Error('Method not implemented.');
  }

  lookupConnection = async (
    _connectionName?: string | undefined
  ): Promise<Connection> => {
    console.log('lookupConnection() called.');
    return this;
  };

  async close(): Promise<void> {}
}

export default {
  service: CompilerService,
  handler: new CompilerHandler(),
};

class MissingReferenceError extends Error {}

// class MissingTableSchemasError extends Error {
//   public tables: string[];
//   constructor(tables: string[]) {
//     super();
//     this.tables = tables;
//   }
// }

class StreamingCompileURLReader implements URLReader {
  private doc_cache = new Map<string, string>();

  readURL = async (url: URL): Promise<string> => {
    const docUrl = this.urlToString(url);
    const doc = this.doc_cache.get(docUrl);
    if (doc === undefined) {
      throw new MissingReferenceError(docUrl);
    }
    return doc;
  };

  hasDoc = (url: URL): boolean => {
    return this.doc_cache.has(this.urlToString(url));
  };

  addDocs = (docs: CompileDocument[]): void => docs.forEach(this.addDoc);

  addDoc = (doc: CompileDocument): void => {
    const docName = this.decodeUrlString(doc.getUrl());
    this.doc_cache.set(docName, doc.getContent());
  };

  private urlToString = (url: URL): string => {
    return this.decodeUrlString(url.toString());
  };

  private decodeUrlString = (url: string): string => {
    return decodeURI(url);
  };
}

class StreamingCompileConnection implements Connection {
  readonly name = 'streaming_compile';

  private table_schema_cache = new Map<string, StructDef>();
  private sql_block_cache = new Map<string, StructDef>();
  private default_connection = 'default_connection';
  private _connections: string[] = [];

  fetchSchemaForSQLBlock = async (
    block: SQLBlock
  ): Promise<
    | {structDef: StructDef; error?: undefined}
    | {error: string; structDef?: undefined}
  > => {
    const structDef = this.sql_block_cache.get(block.name);
    if (structDef) {
      structDef.structSource['sqlBlock'] = block; //TODO: Do you need to access the information from here that you gave me?
      return {
        structDef: structDef,
        error: undefined,
      };
    } else {
      return {
        structDef: undefined,
        error: `SQL Block schema missing: [[${block.name}]]{${block.selectStr}}`,
      };
    }
  };

  runSQL = async (
    _sql: string,
    _options?: unknown
  ): Promise<MalloyQueryData> => {
    console.log('ERROR: runSQL() called.');
    throw new Error('Method not implemented.');
  };

  isPool = async (): Promise<Boolean> => false;

  canPersist = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunSimultaneously = async (): Promise<Boolean> => false;

  canStream = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunStreamSimultaneously = async (): Promise<Boolean> =>
    false;

  async fetchSchemaForTables(tables: string[]): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    const result = {
      schemas: {} as Record<string, StructDef>,
      errors: {} as Record<string, string>,
    };
    const tableHasConnection = new RegExp(/^.+:(.+)$/);
    for (const table of tables) {
      const schema = this.table_schema_cache.get(table);
      if (schema === undefined) {
        if (tableHasConnection.test(table)) {
          result.errors[table] = `No schema data available for {${table}}`;
        } else {
          result.errors[
            table
          ] = `No schema data available for {${this.default_connection}:${table}}`;
        }
        // console.log(result.errors[table]);
      } else {
        result.schemas[table] = schema;
      }
    }

    return result;
  }

  fetchSchemaForSQLBlocks(_sqlStructs: SQLBlock[]): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    console.log('ERROR: fetchSchemaForSQLBlocks() called.');
    throw new Error('Method not implemented.');
  }

  addTableSchema = (name: string, schema: StructDef): void => {
    const {connectionName, tablePath} = parseTableURI(name);

    if (connectionName === this.default_connection) {
      name = tablePath;
    } else if (connectionName) {
      this._connections.push(connectionName);
    }
    this.table_schema_cache.set(name, schema);
  };

  addSqlBlockSchema = (sqlBlock: SqlBlockSchema): void => {
    this.sql_block_cache.set(
      sqlBlock.getName(),
      JSON.parse(sqlBlock.getSchema()) as StructDef
    );
  };

  get connectionNames() {
    return this._connections;
  }

  async close(): Promise<void> {}
}
