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

import {URLReader} from '@malloydata/malloy';

// Import from auto-generated file
// eslint-disable-next-line node/no-unpublished-import
import {CompileRequest} from './compiler_pb';

export class CompilerURLReader implements URLReader {
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
