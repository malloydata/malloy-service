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
import CompilerHandler from './services/v1/compiler_handler';

const PORT = process.env.PORT || 14310;
const HOST = process.env.HOST || '0.0.0.0';

export function startServer(listeningPort = PORT): grpc.Server {
  const grpcServer = new grpc.Server();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore see: https://github.com/agreatfool/grpc_tools_node_protoc_ts/blob/master/doc/server_impl_signature.md
  grpcServer.addService(CompilerHandler.service, CompilerHandler.handler);

  grpcServer.bindAsync(
    `${HOST}:${listeningPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err: Error | null, port: number) => {
      if (err !== null) {
        return console.error(err);
      }

      console.log(`Server listening on ${port}`);
      grpcServer.start();
    }
  );

  return grpcServer;
}

startServer();

process.on('uncaughtException', ex => {
  console.error(ex);
});

process.on('unhandledRejection', ex => {
  console.error(ex);
});
