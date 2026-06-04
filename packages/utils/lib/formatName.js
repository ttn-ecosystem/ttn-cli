function camelTrans(str, isBig) {
  let i = isBig ? 0 : 1;
  str = str.split('-');
  for (; i < str.length; i += 1) {
    str[i] = firstUpperCase(str[i]);
  }
  return str.join('');
}

module.exports = function formatName(name) {
  if (name) {
    name = `${name}`.trim();
    if (name) {
      if (/^[.*_\/\\()&^!@#$%+=?<>~`\s]/.test(name)) {
        name = name.replace(/^[.*_\/\\()&^!@#$%+=?<>~`\s]+/g, '');
      }
      if (/^[0-9]+/.test(name)) {
        name = name.replace(/^[0-9]+/, '');
      }
      if (/[.*_\/\\()&^!@#$%+=?<>~`\s]/.test(name)) {
        name = name.replace(/[.*_\/\\()&^!@#$%+=?<>~`\s]/g, '-');
      }
      return camelTrans(name, true);
    } else {
      return name;
    }
  } else {
    return name;
  }
}
