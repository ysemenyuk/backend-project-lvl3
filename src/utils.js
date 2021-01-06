import path from 'path';

export const getName = (url, type) => {
  const name = `${url.host}${url.pathname}`.split(/[^а-яa-z0-9]/).filter((i) => i).join('-');
  switch (type) {
    case 'html':
      return `${name}.html`;
    case 'files':
      return `${name}_files`;
    default:
      return false;
  }
};

export const getFileName = (url) => {
  const { name, ext } = path.parse(url.pathname);
  const formattedName = name.split(/[^а-яa-z0-9]/).filter((i) => i).join('-');
  return ext ? `${formattedName}${ext}` : `${formattedName}.html`;
};
