import fs from 'fs';
import path from 'path';
import axios from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';
import Listr from 'listr';

import { makeName, makeFileName, isDirExist } from './utils.js';

const log = debug('page-loader');
const fsp = fs.promises;

const tagsMapping = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const formatHtmlAndGetLinks = (html, requestURL, filesDirName) => {
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
  log('makeTasks for download files');
  const data = links.map((link) => {
    // const url = encodeURI(link.fileUrl.href);
    const url = link.fileUrl.href;
    const filePath = path.join(filesDirPath, link.fileName);
    // console.log(url);
    const promise = axios.get(url, { responseType: 'arraybuffer' })
      .catch((error) => {
        throw new Error(`${error.message} - "${url}"`);
      })
      .then((response) => fsp.writeFile(filePath, response.data));

    return { title: url, task: () => promise };
  });

  const tasks = new Listr(data, { concurrent: true });

  log('download and write files');
  // return fsp.mkdir(filesDirPath).then(() => tasks.run());

  // return fsp.mkdir(filesDirPath)
  //   .then(() => tasks.run())
  //   .catch(() => tasks.run());

  return fsp.access(filesDirPath)
    .then(() => tasks.run())
    .catch(() => fsp.mkdir(filesDirPath).then(() => tasks.run()));
};

const pageLoader = (request, outputPath = process.cwd()) => {
  log('request - ', request);
  log('outputPath - ', outputPath);
  const requestURL = new URL(request);
  const htmlFileName = makeName(requestURL, 'html');
  const filesDirName = makeName(requestURL, 'files');

  log('make html name - ', htmlFileName);
  log('make dir name - ', filesDirName);
  const htmlFilePath = path.resolve(outputPath, htmlFileName);
  const filesDirPath = path.resolve(outputPath, filesDirName);

  return axios.get(request)
    .catch((error) => {
      throw new Error(`${error.message} - "${request}"`);
    })
    .then((page) => {
      const { html, links } = formatHtmlAndGetLinks(page.data, requestURL, filesDirName);
      return isDirExist(outputPath)
        .then(() => fsp.writeFile(htmlFilePath, html))
        .then(() => downloadAndWriteAssets(links, filesDirPath));
    })
    .then(() => ({ htmlFilePath }))
    .catch((error) => {
      throw new Error(error);
    });
};

export default pageLoader;
