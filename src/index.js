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
  const links = [];
  const $ = cheerio.load(html);

  Object.keys(tagsMapping).forEach((tag) => {
    $(tag).each((index, item) => {
      if ($(item).attr(tagsMapping[tag])) {
        const fileUrl = new URL($(item).attr(tagsMapping[tag]), requestURL.origin);
        if (fileUrl.origin === requestURL.origin) {
          const fileName = makeFileName(fileUrl);
          links.push({ fileName, fileUrl: fileUrl.toString() });
          $(tag).eq(index).attr(tagsMapping[tag], `${filesDirName}/${fileName}`);
        }
      }
    });
  });

  return { html: $.html(), links };
};

const makeTasksForAssets = (links, filesDirPath) => {
  const tasks = links.map((link) => {
    // const url = encodeURI(link.fileUrl);
    const url = link.fileUrl;
    const filePath = path.join(filesDirPath, link.fileName);
    return {
      title: `Downloading - ${url}`,
      task: (ctx, task) => axios.get(url, { responseType: 'arraybuffer' })
        .then((response) => fsp.writeFile(filePath, response.data))
        .catch((err) => {
          ctx[err.message] = url;
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
      const { html, links } = makeHtmlAndGetLinks(page.data, requestURL, filesDirName);
      assetsLinks = links;
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
      return tasks.run({});
    })
    .then((fails) => ({ fullOutputPath, fails }));
};

export default pageLoader;
