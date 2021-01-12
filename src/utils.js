import cheerio from 'cheerio';
import path from 'path';
import axios from 'axios';
import fs from 'fs';
import Listr from 'listr';
import debug from 'debug';
import 'axios-debug-log';

const log = debug('page-loader');
const fsp = fs.promises;

const nameTypesMapping = {
  html: '.html',
  files: '_files',
};

const formatName = (name) => name.split(/[^а-яa-z0-9]/).filter((i) => i).join('-');

export const getName = (url, type) => {
  const formattedName = formatName(`${url.host}${url.pathname}`);
  return `${formattedName}${nameTypesMapping[type]}`;
};

export const getFileName = (url) => {
  const { dir, name, ext } = path.parse(url.pathname);
  const formattedName = formatName(`${url.hostname}/${dir}/${name}`);
  return ext ? `${formattedName}${ext}` : `${formattedName}.html`;
};

export const loadPage = (request) => {
  log('GET -', request);
  return axios.get(request)
    .catch((error) => {
      throw new Error(`${error.message} - "${request}"`);
    });
};

const tagsMapping = {
  img: 'src',
  link: 'href',
  script: 'src',
};

export const formatHtmlAndGetLinks = (html, requestURL, filesDirName) => {
  const links = [];
  const $ = cheerio.load(html);

  Object.keys(tagsMapping).forEach((tag) => {
    $(tag).each((index, item) => {
      if ($(item).attr(tagsMapping[tag])) {
        const fileUrl = new URL($(item).attr(tagsMapping[tag]), requestURL.origin);
        if (fileUrl.origin === requestURL.origin) {
          const fileName = getFileName(fileUrl);
          links.push({ tag, fileName, fileUrl });
          $(tag).eq(index).attr(tagsMapping[tag], `${filesDirName}/${fileName}`);
        }
      }
    });
  });

  return { html: $.html(), links };
};

export const writeHtmlFile = (html, htmlFilePath, outputPath) => {
  log('writeHtmlFile -', htmlFilePath);
  return fsp.writeFile(htmlFilePath, html)
    .catch((error) => {
      throw new Error(`${error.code}: no such directory "${outputPath}"`);
    });
};

export const downloadAndWriteFiles = (links, filesDirPath) => {
  log('makeTasks for download files');
  const data = links.map((link) => {
    // const url = encodeURI(link.fileUrl.href);
    const url = link.fileUrl.href;
    const filePath = path.join(filesDirPath, link.fileName);

    if (link.tag === 'img') {
      // console.log(1, url);
      const promise = axios.get(url, { responseType: 'stream' })
        .then((response) => response.data.pipe(fs.createWriteStream(filePath)))
        .then(() => 'done')
        .catch((error) => {
          throw new Error(`download file from "${url}" ${error.message}`);
        });
      return { title: url, task: () => promise };
    }
    // console.log(2, url);
    const promise = axios.get(url)
      .then((response) => fsp.writeFile(filePath, response.data.trim()))
      .catch((error) => {
        throw new Error(`download file from "${url}" ${error.message}`);
      });
    return { title: url, task: () => promise };
  });

  const tasks = new Listr(data, { concurrent: true });
  log('download and write files');
  return fsp.mkdir(filesDirPath).then(() => tasks.run());
};
