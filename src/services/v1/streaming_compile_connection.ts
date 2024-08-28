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

import debug from 'debug';
import {
  Connection,
  MalloyQueryData,
  QueryRunStats,
  SQLBlock,
  StructDef,
} from '@malloydata/malloy';
import {BaseConnection} from '@malloydata/malloy/connection';

export class StreamingCompileConnection
  extends BaseConnection
  implements Connection
{
  private table_schema_cache = new Map<string, StructDef>();
  private sql_block_cache = new Map<string, StructDef>();

  private log = debug('malloydata:streamimg_compile_connection');

  constructor(public readonly name: string) {
    super();
  }

  get dialectName(): string {
    throw new Error('Method not implemented.');
  }

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
        error: `SQL Block schema missing: [[${block.name}]]{${this.name}}{${block.selectStr}}`,
      };
    }
  };

  runSQL = async (
    _sql: string,
    _options?: unknown
  ): Promise<MalloyQueryData> => {
    this.log('ERROR: runSQL() called.');
    throw new Error('Method not implemented.');
  };

  canFetchSchemaAndRunSimultaneously = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunStreamSimultaneously = async (): Promise<Boolean> =>
    false;

  async fetchSchemaForTables(tables: Record<string, string>): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    const result = {
      schemas: {} as Record<string, StructDef>,
      errors: {} as Record<string, string>,
    };
    for (const tableKey in tables) {
      const schema = this.table_schema_cache.get(tableKey);
      if (schema === undefined) {
        result.errors[tableKey] =
          `No schema data available for {${tableKey}} {${this.name}} {${tables[tableKey]}}`;
      } else {
        result.schemas[tableKey] = schema;
      }
    }

    return result;
  }

  addTableSchema = (tableKey: string, schema: StructDef): void => {
    this.table_schema_cache.set(tableKey, schema);
  };

  addSqlBlockSchema = (name: string, schema: StructDef): void => {
    this.sql_block_cache.set(name, schema);
  };

  async estimateQueryCost(_sqlCommand: string): Promise<QueryRunStats> {
    return {
      queryCostBytes: undefined,
    };
  }

  async close(): Promise<void> {}
}
