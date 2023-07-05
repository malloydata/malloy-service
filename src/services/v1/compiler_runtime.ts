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
  LookupConnection,
  Connection,
  MalloyQueryData,
  SQLBlock,
  StructDef,
  QueryRunStats,
} from '@malloydata/malloy';

// Import from auto-generated file
// eslint-disable-next-line node/no-unpublished-import
import {CompileRequest} from './compiler_pb';

export class CompilerRuntime
  implements LookupConnection<Connection>, Connection
{
  readonly name = 'compiler_runtime';

  private request: CompileRequest;
  private schemas: Record<string, StructDef>;

  private log = debug('malloydata:compiler_runtime');

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
    this.log('ERROR: fetchSchemaForSQLBlock() called.');
    throw new Error('Method not implemented.');
  };

  runSQL = async (
    _sql: string,
    _options?: unknown
  ): Promise<MalloyQueryData> => {
    this.log('ERROR: runSQL() called.');
    throw new Error('Method not implemented.');
  };

  isPool = async (): Promise<Boolean> => false;

  canPersist = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunSimultaneously = async (): Promise<Boolean> => false;

  canStream = async (): Promise<Boolean> => false;

  canFetchSchemaAndRunStreamSimultaneously = async (): Promise<Boolean> =>
    false;

  async fetchSchemaForTables(tables: Record<string, string>): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    this.log('fetchSchemaForTables', JSON.stringify(tables));
    for (const tableKey in tables) {
      if (!(tableKey in this.schemas)) {
        throw new Error(
          `Requested table (${tableKey}) not found in schema data.`
        );
      }
    }
    return {schemas: this.schemas, errors: {}};
  }

  fetchSchemaForSQLBlocks(_sqlStructs: SQLBlock[]): Promise<{
    schemas: Record<string, StructDef>;
    errors: Record<string, string>;
  }> {
    this.log('ERROR: fetchSchemaForSQLBlocks() called.');
    throw new Error('Method not implemented.');
  }

  lookupConnection = async (
    _connectionName?: string | undefined
  ): Promise<Connection> => {
    this.log('lookupConnection() called.');
    return this;
  };

  async estimateQueryCost(_sqlCommand: string): Promise<QueryRunStats> {
    return {
      queryCostBytes: undefined,
    };
  }

  async close(): Promise<void> {}
}
