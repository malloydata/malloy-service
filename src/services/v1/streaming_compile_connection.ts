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

import {
  Connection,
  MalloyQueryData,
  SQLBlock,
  StructDef,
  parseTableURI,
} from '@malloydata/malloy';

// Import from auto-generated file
// eslint-disable-next-line node/no-unpublished-import
import {SqlBlockSchema} from './compiler_pb';

export class StreamingCompileConnection implements Connection {
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
