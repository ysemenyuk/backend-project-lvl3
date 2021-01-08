import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';

import { getName, getFileName } from './utils.js';

const log = debug('page-loader');
const fsp = fs.promises;

const pageLoader = (request, outputPath = '') => {
  const requestURL = url.parse(request);
  log('request - ', request);

  const htmlFileName = getName(requestURL, 'html');
  const filesDirName = getName(requestURL, 'files');
  log('make htmlFileName - ', htmlFileName);
  log('make filesDirName - ', filesDirName);

  // const htmlInitFilePath = path.resolve(process.cwd(), 'init-html', htmlFileName);
  const htmlFilePath = path.resolve(process.cwd(), outputPath, htmlFileName);
  const filesDirPath = path.resolve(process.cwd(), outputPath, filesDirName);

  const images = [];
  const links = [];
  const scripts = [];

  const promise = Promise.resolve()
    .then(() => fsp.rmdir(path.resolve(process.cwd(), outputPath), { recursive: true }))
    .then(() => fsp.mkdir(path.resolve(process.cwd(), outputPath)))
    // .then(() => axios.get(request))
    // .then((response) => fsp.writeFile(htmlInitFilePath, response.data))
    .then(() => {
      log('GET -', request);
      return axios.get(request);
    })
    .then((response) => {
      log('response.status - ', response.status);
      if (response.status !== 200) {
        throw new Error(`response status ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      // console.log($.html());

      $('img').each((index, item) => {
        const fileUrl = url.parse(item.attribs.src);
        if (fileUrl.host === null || fileUrl.host === requestURL.host) {
          const fileName = getFileName(fileUrl);
          images.push({ fileName, fileUrl });
          $('img').eq(index).attr('src', `${filesDirName}/${fileName}`);
        }
      });

      $('link').each((index, item) => {
        const fileUrl = url.parse(item.attribs.href);
        if (fileUrl.host === null || fileUrl.host === requestURL.host) {
          const fileName = getFileName(fileUrl);
          links.push({ fileName, fileUrl });
          $('link').eq(index).attr('href', `${filesDirName}/${fileName}`);
        }
      });

      $('script').each((index, item) => {
        if (item.attribs.src) {
          const fileUrl = url.parse(item.attribs.src);
          if (fileUrl.host === null || fileUrl.host === requestURL.host) {
            const fileName = getFileName(fileUrl);
            scripts.push({ fileName, fileUrl });
            $('scripts').eq(index).attr('src', `${filesDirName}/${fileName}`);
          }
        }
      });

      log('writeFile -', htmlFilePath);
      // const formattedHTML = prettier.format($.html());
      return fsp.writeFile(htmlFilePath, $.html());
    })
    .then(() => {
      log('mkdir -', filesDirPath);
      fsp.mkdir(filesDirPath);
    })
    .then(() => {
      const imagesPromises = images.map((item) => {
        const link = encodeURI(`${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`);
        // console.log(1, link);
        log('downloadFile - ', link);
        return axios({
          method: 'get',
          url: link,
          responseType: 'stream',
        })
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            log('writeFile - ', filePath);
            return response.data.pipe(fs.createWriteStream(filePath));
          });
      });

      const linksPromises = links.map((item) => {
        const link = `${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`;
        // console.log(2, link);
        log('downloadFile - ', link);
        return axios.get(link)
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            log('writeFile - ', filePath);
            return fsp.writeFile(filePath, response.data);
          });
      });

      const scriptsPromises = scripts.map((item) => {
        const link = `${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`;
        // console.log(3, link);
        log('downloadFile - ', link);
        return axios.get(link)
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            log('writeFile - ', filePath);
            return fsp.writeFile(filePath, response.data);
          });
      });

      return Promise.all([...imagesPromises, ...linksPromises, ...scriptsPromises]);
    })

    .catch((error) => {
      // console.log(error.message);
      throw new Error(error.message);
    });

  return promise;
};

export default pageLoader;
