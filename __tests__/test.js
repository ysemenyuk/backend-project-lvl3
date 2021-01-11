import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import path from 'path';
import fs from 'fs';

import pageLoader from '../src/index.js';

const fsp = fs.promises;
nock.disableNetConnect();
axios.defaults.adapter = httpAdapter;

const fullpathTestPage = path.resolve('__fixtures__/page.html');
const fullpathScript = path.resolve('__fixtures__/files/script.js');
const fullpathStyle = path.resolve('__fixtures__/files/style.css');
const fullpathOtherPage = path.resolve('__fixtures__/files/other-page.html');
const fullpathImg = path.resolve('__fixtures__/files/image.png');

const fullpathExpectedPage = path.resolve('__fixtures__/expected.html');

let tmpDir;
// const tmpDir = '__tmp__';

// beforeEach(async () => {
//   tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
// });

test('Successful', async () => {
  const testPage = await fsp.readFile(fullpathTestPage, 'utf8');
  const script = await fsp.readFile(fullpathScript, 'utf8');
  const style = await fsp.readFile(fullpathStyle, 'utf8');
  const otherPage = await fsp.readFile(fullpathOtherPage, 'utf8');
  const img = await fsp.readFile(fullpathImg);

  nock('http://test.ru')
    .get('/page')
    .reply(200, testPage)
    .get('/files/script.js')
    .reply(200, script)
    .get('/files/style.css')
    .reply(200, style)
    .get('/other-page.html')
    .reply(200, otherPage)
    .get('/files/image.png')
    .reply(200, img);

  await pageLoader('http://test.ru/page', tmpDir);

  const expectedPage = await fsp.readFile(fullpathExpectedPage, 'utf8');

  const fullpathTmpPage = path.resolve(tmpDir, 'test-ru-page.html');
  const fullpathTmpScript = path.resolve(tmpDir, 'test-ru-page_files/test-ru-files-script.js');
  const fullpathTmpStyle = path.resolve(tmpDir, 'test-ru-page_files/test-ru-files-style.css');
  const fullpathTmpOtherPage = path.resolve(tmpDir, 'test-ru-page_files/test-ru-other-page.html');
  const fullpathTmpImg = path.resolve(tmpDir, 'test-ru-page_files/test-ru-files-image.png');

  const formattedPage = await fsp.readFile(fullpathTmpPage, 'utf8');
  const downloadedScript = await fsp.readFile(fullpathTmpScript, 'utf8');
  const downloadedStyle = await fsp.readFile(fullpathTmpStyle, 'utf8');
  const downloadedOtherPage = await fsp.readFile(fullpathTmpOtherPage, 'utf8');
  const downloadedImg = await fsp.readFile(fullpathTmpImg);

  expect(formattedPage).toEqual(expectedPage);
  expect(downloadedScript).toEqual(script);
  expect(downloadedStyle).toEqual(style);
  expect(downloadedOtherPage).toEqual(otherPage);
  expect(downloadedImg).toEqual(img);
});

test('Error request fail', async () => {
  nock('http://test.ru')
    .get('/not-exist-page')
    .reply(404, '');

  await expect(pageLoader('http://test.ru/not-exist-page', tmpDir)).rejects.toThrow('status code 404');
});

test('Error nonExistOutputPath', async () => {
  nock('http://test.ru')
    .get('/page')
    .reply(200, 'data');

  await expect(pageLoader('http://test.ru/page', 'notExixstPath')).rejects.toThrow('no such file or directory');
});
