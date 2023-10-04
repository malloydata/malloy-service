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

import path from 'path';
import {readPackageJson} from './utils/licenses';
import fs from 'fs';
import https from 'https';
import axios from 'axios';

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
let filePath: string;
let seen: {[id: string]: boolean} = {};

axios.defaults.timeout = 500000;
axios.defaults.httpsAgent = new https.Agent({keepAlive: true});

/*
 * Required components:
 * * The name of the component
 * * Identification of the component's license(s)
 * * The complete text of every unique license (at least once)
 * * The contents of any NOTICE file included with the component (if it includes one)
 */
export async function generateDisclaimer(
  packageJsonPath: string,
  nodeModulesPath: string,
  disclaimerPath: string
): Promise<void> {
  filePath = disclaimerPath;
  const rootPackageJson = readPackageJson(packageJsonPath);

  if (fs.existsSync(filePath)) {
    console.log(`WARN: ${filePath} already exists\n  overwriting...`);
    fs.rmSync(filePath);
  }

  seen = {};
  console.log('Generating third party licenses:');

  // include dev dependencies b/c we put all dependencies there so that npx malloy-service
  // doesn't have to install dependencies for no good reason, as everything is bundled
  // when shipped to npm. This means that the license file also includes things we don't actually
  // ship, but it's a very short list anyways.
  await doDependencies(nodeModulesPath, rootPackageJson, true);
  let response = await axios.get("https://github.com/nodejs/node/raw/main/LICENSE");
  fs.appendFileSync(
    filePath,
      `
  -------
  Package: node
  Url: https://github.com/nodejs/node/blob/main/LICENSE
  License(s): MIT
  License Text:
    ${response.data}
    `
  );
  console.log(`  wrote ${filePath}`);
}

async function doDependencies(
  nodeModulesPath: string,
  packageJson: any,
  includeDevDependencies = false
): Promise<void> {
  // eslint-disable-next-line no-prototype-builtins

  // eslint-disable-next-line no-prototype-builtins
  let dependencies = packageJson.hasOwnProperty('dependencies')
    ? packageJson.dependencies
    : {};

  // eslint-disable-next-line no-prototype-builtins
  if (includeDevDependencies && packageJson.hasOwnProperty('devDependencies')) {
    dependencies = {...dependencies, ...packageJson.devDependencies};
  }

  if (Object.keys(dependencies).length > 0) {
    for (const dependency of Object.keys(dependencies)) {
      if (seen[dependency] === true || !(typeof dependency === 'string')) {
        continue;
      }

      const pkg = readPackageJson(
        path.join(nodeModulesPath, dependency, 'package.json')
      );

      // look for notice & license text
      let notice: string | undefined = undefined;
      let license: string | undefined = undefined;
      try {
        const packageFiles = fs.readdirSync(
          path.join(nodeModulesPath, dependency)
        );
        packageFiles.find(fileName => {
          const base = fileName.split('.')[0].toLowerCase();

          if (base === 'notice' || base === 'notices') {
            notice = fs.readFileSync(
              path.join(nodeModulesPath, dependency, fileName),
              'utf-8'
            );
          }

          if (base === 'license' || base === 'licenses') {
            license = fs.readFileSync(
              path.join(nodeModulesPath, dependency, fileName),
              'utf-8'
            );
          }
        });

        if (license === undefined && pkg.license === undefined) {
          throw new Error(
            `${dependency}: license type undefined in package.json and license file cannot be found`
          );
        }

        const licenseType = pkg.license
          ? pkg.license
          : 'see license text below';

        const url = [
          pkg.homepage,
          pkg.repository?.url,
          pkg.repository?.baseUrl,
          pkg.repo,
          `https://npmjs.com/package/${dependency}`,
        ].find(el => el !== undefined);

        fs.appendFileSync(
          filePath,
          `
  -------
  Package: ${dependency}
  Url: ${url}
  License(s): ${licenseType}
  ${license ? 'License Text:\n' + license + '\n' : ''}
  ${notice ? '\nNotice:\n' + notice + '\n' : ''}
          `
        );

        seen[dependency] = true;
        await doDependencies(nodeModulesPath, pkg);
      } catch (error) {
        console.warn('Could not read package.json', error.message);
      }
    }
  }
}

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
const fullLicenseFilePath = path.join(
  __dirname,
  '..',
  'dist',
  'third_party_notices.txt'
);

generateDisclaimer(packageJsonPath, nodeModulesPath, fullLicenseFilePath);
