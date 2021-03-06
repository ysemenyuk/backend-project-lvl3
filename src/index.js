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

const makeHtmlAndAssetsLinks = (html, requestURL, filesDirName) => {
  const $ = cheerio.load(html);
  const localLinks = [];
  Object.entries(tagsMapping)
    .forEach(([tagName, attrName]) => {
      const tagElements = [...$(tagName)];
      const tagLocalLinks = tagElements
        .filter((element) => $(element).attr(attrName))
        .map((element) => {
          const fileUrl = new URL($(element).attr(attrName), requestURL.origin);
          return { element, fileUrl };
        })
        .filter(({ fileUrl }) => fileUrl.origin === requestURL.origin);

      tagLocalLinks.forEach(({ element, fileUrl }) => {
        const fileName = makeFileName(fileUrl);
        localLinks.push({ fileName, fileUrl });
        $(element).attr(attrName, `${filesDirName}/${fileName}`);
      });
    });

  return { html: $.html(), localLinks };
};

const makeTasksForAssets = (localLinks, filesDirPath) => {
  const tasks = localLinks.map((link) => {
    const url = (link.fileUrl).toString();
    const filePath = path.join(filesDirPath, link.fileName);
    return {
      title: `Downloading - ${url}`,
      task: (ctx, task) => axios.get(url, { responseType: 'arraybuffer' })
        .then((response) => fsp.writeFile(filePath, response.data))
        .catch((err) => {
          task.skip(err.message);
        }),
    };
  });

  return new Listr(tasks, { concurrent: true });
};

const pageLoader = (request, outputPath = process.cwd()) => {
  const requestURL = new URL(request);
  const fullOutputPath = path.resolve(outputPath);

  const htmlFileName = makeName(requestURL, 'html');
  const filesDirName = makeName(requestURL, 'files');

  const htmlFilePath = path.join(fullOutputPath, htmlFileName);
  const filesDirPath = path.join(fullOutputPath, filesDirName);

  log('incoming request -', request);
  log('output path -', fullOutputPath);

  let assetsLinks;

  return fsp.access(fullOutputPath)
    .then(() => {
      log('GET request -', request);
      return axios.get(request);
    })
    .then((page) => {
      log('response answer code -', page.status);
      const { html, localLinks } = makeHtmlAndAssetsLinks(page.data, requestURL, filesDirName);
      assetsLinks = localLinks;
      log('writing hmlt file into -', htmlFilePath);
      return fsp.writeFile(htmlFilePath, html);
    })
    .then(() => {
      log('making directory for assets -', filesDirPath);
      return fsp.mkdir(filesDirPath);
    })
    .then(() => {
      log('Downloading assets into -', filesDirPath);
      const tasks = makeTasksForAssets(assetsLinks, filesDirPath);
      return tasks.run();
    })
    .then(() => ({ fullOutputPath }));
};

export default pageLoader;
