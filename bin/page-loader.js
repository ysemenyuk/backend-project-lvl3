#!/usr/bin/env node

import program from 'commander';
import pageLoader from '../index.js';

program
  .version('1.0.0')
  .description('page loader description')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir (default "app/")')
  .action((url) => pageLoader(url, program.output)
    .then((outputPath) => console.log(`Page was successfully downloaded into 'app/${outputPath}'`))
    .catch((error) => {
      console.error(error.message);
      // throw new Error(error.message);
    }))
  .parse(process.argv);
