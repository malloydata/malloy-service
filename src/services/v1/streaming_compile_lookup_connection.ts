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
import {Connection, LookupConnection} from '@malloydata/malloy';
import {StreamingCompileConnection} from './streaming_compile_connection';

export class StreamingCompileLookupConnection
  implements LookupConnection<Connection>
{
  private default_connection = 'default_connection';
  private _connections: Record<string, StreamingCompileConnection> = {};

  private log = debug('malloydata:streamimg_compile_lookup_connection');

  async lookupConnection(
    connectionName?: string | undefined
  ): Promise<Connection> {
    if (!connectionName) {
      connectionName = this.default_connection;
    }
    this.log('lookupConnection', connectionName);
    if (!this._connections[connectionName]) {
      this._connections[connectionName] = new StreamingCompileConnection(
        connectionName
      );
    }
    return this._connections[connectionName];
  }

  getConnection(connectionName: string): StreamingCompileConnection {
    this.log('getConnection', connectionName);
    return this._connections[connectionName];
  }
}
