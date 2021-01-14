#!/usr/bin/env node

import program from 'commander';
import pageLoader from '../index.js';

program
  .version('1.0.0')
  .description('Download html page into local directory')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir', process.cwd())
  .action((url) => pageLoader(url, program.output)
    .then(({ fullOutputPath, fails }) => {
      console.log(`Page was successfully downloaded into '${fullOutputPath}'`);
      if (Object.keys(fails).length) {
        console.log('fails', fails);
      }
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
      // throw new Error(error);
    }))
  .parse(process.argv);
