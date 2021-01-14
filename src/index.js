import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';
import Listr from 'listr';

import { makeName, makeFileName } from './utils.js';

const log = debug('page-loader');
const fsp = fs.promises;

const tagsMapping = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const makeHtmlAndGetLinks = (html, requestURL, filesDirName) => {
  log('get links for download assets');
  log('make html file with local links');
  const links = [];
  const $ = cheerio.load(html);

  Object.keys(tagsMapping).forEach((tag) => {
    $(tag).each((index, item) => {
      if ($(item).attr(tagsMapping[tag])) {
        const fileUrl = new URL($(item).attr(tagsMapping[tag]), requestURL.origin);
        if (fileUrl.origin === requestURL.origin) {
          const fileName = makeFileName(fileUrl);
          links.push({ tag, fileName, fileUrl });
          $(tag).eq(index).attr(tagsMapping[tag], `${filesDirName}/${fileName}`);
        }
      }
    });
  });

  return { html: $.html(), links };
};

const downloadAndWriteAssets = (links, filesDirPath) => {
  const data = links.map((link) => {
    // const url = encodeURI(link.fileUrl.href);
    const url = link.fileUrl.href;
    const filePath = path.join(filesDirPath, link.fileName);
    const promise = axios.get(url, { responseType: 'arraybuffer' })
      .then((response) => fsp.writeFile(filePath, response.data));

    return { title: url, task: () => promise };
  });

  const tasks = new Listr(data, { concurrent: true });
  log('download and write assets');

  return fsp.mkdir(filesDirPath)
    .then(() => log('make directory for assets (if not exists) -', filesDirPath))
    .catch(() => log('directory for assets already exist -', filesDirPath))
    .then(() => log('download assets into -', filesDirPath))
    .finally(() => tasks.run());
};

const pageLoader = (request, outputPath = process.cwd()) => {
  const requestURL = new URL(request);
  const fullOutputPath = path.resolve(outputPath);
  log('incoming request -', request);
  log('output path -', fullOutputPath);

  const htmlFileName = makeName(requestURL, 'html');
  const filesDirName = makeName(requestURL, 'files');
  log('making name for html file -', htmlFileName);
  log('making name for assets directory -', filesDirName);

  const htmlFilePath = path.join(fullOutputPath, htmlFileName);
  const filesDirPath = path.join(fullOutputPath, filesDirName);

  log('GET - ', request);
  return axios.get(request)
    .then((page) => {
      const { html, links } = makeHtmlAndGetLinks(page.data, requestURL, filesDirName);
      log('Write hmlt file into -', htmlFilePath);
      return fsp.writeFile(htmlFilePath, html)
        .then(() => downloadAndWriteAssets(links, filesDirPath));
    })
    .then(() => log('Page was successfully downloaded into -', fullOutputPath))
    .then(() => ({ fullOutputPath }))
    .catch((error) => {
      throw error;
    });
};

export default pageLoader;
