import nock from 'nock';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';

import pageLoader from '../src/index.js';

nock.disableNetConnect();
axios.defaults.adapter = httpAdapter;

let pathTmp;
// const pathTmp = '__tmp__';

beforeEach(async () => {
  pathTmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('test1', async () => {
  const fullpathExp = path.resolve('__fixtures__/expected.html');
  const data = await fsp.readFile(fullpathExp, 'utf8');

  nock('http://test.ru').get('/page').reply(200, data);

  await pageLoader('http://test.ru/page', pathTmp);

  const fullpathTmp = path.resolve(pathTmp, 'test-ru-page.html');
  const downloaded = await fsp.readFile(fullpathTmp, 'utf8');

  expect(downloaded).toEqual(data);
});
