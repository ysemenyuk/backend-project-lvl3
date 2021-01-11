import path from 'path';
import debug from 'debug';

import {
  getName,
  loadPage,
  formatHtmlAndGetLinks,
  writeHtmlFile,
  downloadAndWriteFiles,
} from './utils.js';

const log = debug('page-loader');

const pageLoader = (request, outputPath = process.cwd()) => {
  log('request - ', request);
  log('outputPath - ', outputPath);

  const requestURL = new URL(request);
  const htmlFileName = getName(requestURL, 'html');
  const filesDirName = getName(requestURL, 'files');

  log('make htmlFileName - ', htmlFileName);
  log('make filesDirName - ', filesDirName);

  const htmlFilePath = path.resolve(outputPath, htmlFileName);
  const filesDirPath = path.resolve(outputPath, filesDirName);

  return loadPage(request)
    .then((page) => {
      const { html, links } = formatHtmlAndGetLinks(page.data, requestURL, filesDirName);
      return writeHtmlFile(html, htmlFilePath, outputPath)
        .then(() => downloadAndWriteFiles(links, filesDirPath));
    })
    .then(() => `${htmlFilePath}`)
    .catch((error) => {
      throw new Error(error);
    });
};

export default pageLoader;
