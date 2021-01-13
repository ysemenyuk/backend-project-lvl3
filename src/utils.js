import fs from 'fs';
import path from 'path';

const fsp = fs.promises;

const nameTypesMapping = {
  html: '.html',
  files: '_files',
};

const formatName = (name) => name.split(/[^а-яa-z0-9]/).filter((i) => i).join('-');

export const makeName = (url, type) => {
  const formattedName = formatName(`${url.host}${url.pathname}`);
  return `${formattedName}${nameTypesMapping[type]}`;
};

export const makeFileName = (url) => {
  const { dir, name, ext } = path.parse(url.pathname);
  const formattedName = formatName(`${url.hostname}/${dir}/${name}`);
  return ext ? `${formattedName}${ext}` : `${formattedName}.html`;
};

export const isDirExist = (pathname) => fsp.access(pathname)
  .catch((error) => {
    throw new Error(`${error.code}: no such directory "${pathname}"`);
  });
