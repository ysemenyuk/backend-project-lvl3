#!/usr/bin/env node

import program from 'commander';
import pageLoader from '../index.js';

program
  .version('0.0.1')
  .description('page loader description')
  .arguments('<url>')
  .option('-o, --output [dir]', 'output dir', '/app')
  .action((url) => pageLoader(url, program.output))
  .parse(process.argv);
