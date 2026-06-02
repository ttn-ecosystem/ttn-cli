const fs = require('fs');
/**
 * 写入文件
 * @param {string} path - 文件路径
 * @param {string|Buffer} data - 要写入的数据
 * @param {Object} [options] - 选项对象
 * @param {boolean} [options.rewrite=true] - 是否覆盖写入
 * @returns {boolean} - 是否成功写入
 */
function writeFile(path, data, { rewrite = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewrite) {
      fs.writeFileSync(path, data);
      return true;
    } else {
      return false;
    }
  } else {
    fs.writeFileSync(path, data);
    return true;
  }
}

/**
 * 读取文件
 * @param {string} path - 文件路径
 * @param {Object} [options] - 选项对象
 * @param {boolean} [options.toJson=false] - 是否将文件内容转换为 JSON 对象
 * @returns {string|Buffer|null} - 文件内容或 null
 */
function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON();
      } else {
        return buffer.toString();
      }
    }
  } else {
    return null;
  }
}

module.exports = {
  readFile,
  writeFile,
};
