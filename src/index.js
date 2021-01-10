import axios from 'axios';
import fs from 'fs';
import path from 'path';
import debug from 'debug';
import 'axios-debug-log';

import { getName, formatHtmlAndGetLinks, downloadFiles } from './utils.js';
// import { getName, formatHtmlAndGetLinks, downloadFiles } from './utilsWithOutListr.js';

const log = debug('page-loader');
const fsp = fs.promises;

const pageLoader = (request, outputPath = '/') => {
  const requestURL = new URL(request);
  log('request - ', request);
  log('outputPath - ', outputPath);

  const htmlFileName = getName(requestURL, 'html');
  const filesDirName = getName(requestURL, 'files');
  log('make htmlFileName - ', htmlFileName);
  log('make filesDirName - ', filesDirName);

  // const htmlInitFilePath = path.resolve(process.cwd(), 'init-html', htmlFileName);
  const htmlFilePath = path.resolve(process.cwd(), outputPath, htmlFileName);
  const filesDirPath = path.resolve(process.cwd(), outputPath, filesDirName);

  return Promise.resolve()
    // .then(() => axios.get(request))
    // .then((response) => fsp.writeFile(htmlInitFilePath, response.data))
    .then(() => {
      log('GET -', request);
      return axios.get(request)
        .catch((error) => {
          throw new Error(`"${request}" ${error.message}`);
        });
    })
    .then((response) => {
      log('response.status -', response.status);
      const { html, links } = formatHtmlAndGetLinks(response, requestURL, filesDirName);

      log('writeHtmlFile -', htmlFilePath);
      return fsp.writeFile(htmlFilePath, html)
        .then(() => links);
    })
    .then((links) => {
      log('mkdir -', filesDirPath);
      return fsp.mkdir(filesDirPath)
        .then(() => downloadFiles(links, filesDirPath));
    })
    .then(() => `${outputPath}/${htmlFileName}`)
    .catch((error) => {
      throw new Error(error);
    });
};

export default pageLoader;
