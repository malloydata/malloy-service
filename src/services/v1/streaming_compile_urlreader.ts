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
import {DataStyles} from '@malloydata/render';

// Import from auto-generated file
// eslint-disable-next-line node/no-unpublished-import
import {CompileDocument} from './compiler_pb';

export class MissingReferenceError extends Error {}

export function compileDataStyles(styles: string): DataStyles {
  try {
    return JSON.parse(styles) as DataStyles;
  } catch (error) {
    throw new Error(`Error compiling data styles: ${error}`);
  }
}

// TODO replace this with actual JSON metadata import functionality, when it exists
export async function dataStylesForFile(
  reader: URLReader,
  url: URL,
  text: string
): Promise<DataStyles> {
  const PREFIX = '--! styles ';
  let styles: DataStyles = {};
  for (const line of text.split('\n')) {
    if (line.startsWith(PREFIX)) {
      const fileName = line.trimEnd().substring(PREFIX.length);
      const styleUrl = new URL(fileName, url);
      // TODO instead of failing silently when the file does not exist, perform this after the WebView has been
      //      created, so that the error can be shown there.
      let stylesText: string;
      try {
        stylesText = await reader.readURL(styleUrl);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error loading data style '${fileName}': ${error}`);
        stylesText = '{}';
      }
      styles = {...styles, ...compileDataStyles(stylesText)};
    }
  }

  return styles;
}

export class StreamingCompileURLReader implements URLReader {
  private doc_cache = new Map<string, string>();
  private dataStyles: DataStyles = {};

  readURL = async (url: URL): Promise<string> => {
    const docUrl = this.urlToString(url);
    const doc = this.doc_cache.get(docUrl);
    if (doc === undefined) {
      throw new MissingReferenceError(docUrl);
    }
    this.dataStyles = {
      ...this.dataStyles,
      ...(await dataStylesForFile(this, url, doc)),
    };
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

  getHackyAccumulatedDataStyles(): DataStyles {
    return this.dataStyles;
  }
}
