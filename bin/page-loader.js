#!/usr/bin/env node

import program from 'commander';
import pageLoader from '../index.js';

program
  .version('1.0.0')
  .description('Download html page into local directory')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir (default "app/")')
  .action((url) => pageLoader(url, program.output)
    .then((outputPath) => {
      console.log(`Page was successfully downloaded into '${outputPath}'`);
      process.exit();
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
      // throw new Error(error);
    }))
  .parse(process.argv);
