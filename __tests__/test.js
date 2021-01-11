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

let tmpDir;
const fixtures = '__fixtures__';

function readFile(dirName, fileName, encoding = null) {
  return fsp.readFile(path.resolve(dirName, fileName), encoding);
}

beforeEach(async () => {
  tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('Successful', async () => {
  const testPage = await readFile(fixtures, 'page.html', 'utf8');
  const script = await readFile(fixtures, 'files/script.js', 'utf8');
  const style = await readFile(fixtures, 'files/style.css', 'utf8');
  const otherPage = await readFile(fixtures, 'files/other-page.html', 'utf8');
  const image = await readFile(fixtures, 'files/image.png');

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
    .reply(200, image);

  await pageLoader('http://test.ru/page', tmpDir);

  const expectedPage = await readFile(fixtures, 'expected.html', 'utf8');

  const formattedPage = await readFile(tmpDir, 'test-ru-page.html', 'utf8');
  const downloadedScript = await readFile(tmpDir, 'test-ru-page_files/test-ru-files-script.js', 'utf8');
  const downloadedStyle = await readFile(tmpDir, 'test-ru-page_files/test-ru-files-style.css', 'utf8');
  const downloadedOtherPage = await readFile(tmpDir, 'test-ru-page_files/test-ru-other-page.html', 'utf8');
  const downloadedImage = await readFile(tmpDir, 'test-ru-page_files/test-ru-files-image.png');

  expect(formattedPage).toEqual(expectedPage);
  expect(downloadedScript).toEqual(script);
  expect(downloadedStyle).toEqual(style);
  expect(downloadedOtherPage).toEqual(otherPage);
  expect(downloadedImage).toEqual(image);
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

  await expect(pageLoader('http://test.ru/page', 'notExixstPath')).rejects.toThrow('no such directory');
});
