import cheerio from 'cheerio';
import path from 'path';
import axios from 'axios';
import fs from 'fs';
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
  const formattedName = formatName(`${dir}/${name}`);
  // console.log(formattedName);
  return ext ? `${formattedName}${ext}` : `${formattedName}.html`;
};

const tagsMapping = {
  img: 'src',
  link: 'href',
  script: 'src',
};

export const formatHtmlAndGetLinks = (response, requestURL, filesDirName) => {
  const links = [];
  const $ = cheerio.load(response.data);

  Object.keys(tagsMapping).forEach((tag) => {
    $(tag).each((index, item) => {
      const fileUrl = new URL($(item).attr(tagsMapping[tag]), requestURL.origin);
      if (fileUrl.origin === requestURL.origin) {
        const fileName = getFileName(fileUrl);
        links.push({ tag, fileName, fileUrl });
        $(tag).eq(index).attr(tagsMapping[tag], `${filesDirName}/${fileName}`);
      }
    });
  });

  return { html: $.html(), links };
};

export const downloadFiles = (links, filesDirPath) => {
  const data = links.map((link) => {
    const url = encodeURI(link.fileUrl.href);
    const filePath = path.join(filesDirPath, link.fileName);
    log('download -', url);
    if (link.tag === 'img') {
      // console.log(1, url);
      return axios.get(url, { responseType: 'stream' })
        .then((response) => response.data.pipe(fs.createWriteStream(filePath)))
        .catch((error) => {
          throw new Error(`download file from "${url}" ${error.message}`);
        });
    }
    // console.log(2, url);
    return axios.get(url)
      .then((response) => fsp.writeFile(filePath, response.data))
      .catch((error) => {
        throw new Error(`download file from "${url}"  ${error.message}`);
      });
  });

  return Promise.all(data);
};
