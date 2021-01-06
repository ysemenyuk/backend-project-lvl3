import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
// import prettier from 'prettier';
import { getName, getFileName } from './utils.js';

const fsp = fs.promises;

const pageLoader = (request, outputPath = '') => {
  const requestURL = url.parse(request);
  // console.log(requestURL);
  const htmlFileName = getName(requestURL, 'html');
  const filesDirName = getName(requestURL, 'files');

  // const htmlInitFilePath = path.resolve(process.cwd(), 'init-html', htmlFileName);
  const htmlFilePath = path.resolve(process.cwd(), outputPath, htmlFileName);
  const filesDirPath = path.resolve(process.cwd(), outputPath, filesDirName);

  const images = [];
  const links = [];
  const scripts = [];

  const promise = axios.get(request)
    // .then((response) => fsp.writeFile(htmlInitFilePath, response.data))
    // .then(() => axios.get(request))
    .then((response) => {
      console.log(response.status);
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

      // const formattedHTML = prettier.format($.html());
      return fsp.writeFile(htmlFilePath, $.html());
    })
    .then(() => fsp.mkdir(filesDirPath))
    .then(() => {
      const imagesPromises = images.map((item) => {
        const link = `${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`;
        console.log(1, link);
        return axios({
          method: 'get',
          url: link,
          responseType: 'stream',
        })
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            return response.data.pipe(fs.createWriteStream(filePath));
          });
      });

      const linksPromises = links.map((item) => {
        const link = `${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`;
        console.log(2, link);
        return axios.get(link)
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            return fsp.writeFile(filePath, response.data);
          });
      });

      const scriptsPromises = scripts.map((item) => {
        const link = `${requestURL.protocol}//${requestURL.host}${item.fileUrl.path}`;
        console.log(3, link);
        return axios.get(link)
          .then((response) => {
            const filePath = path.join(filesDirPath, item.fileName);
            return fsp.writeFile(filePath, response.data);
          });
      });

      return Promise.all([...imagesPromises, ...linksPromises, ...scriptsPromises]);
    })

    .catch((error) => {
      console.log(error.message);
    });

  return promise;
};

export default pageLoader;
