/**
 * 使用模板变量渲染所有文本文件
 */
const path = require("path");
const glob = require("glob"); // 文件匹配模式工具，用于批量查找文件
const ejs = require("ejs"); // EJS 模板引擎
const fse = require("fs-extra");
const get = require("lodash/get"); // Lodash 的 get 方法，安全获取嵌套属性

const log = require("./log");

/**
 * 使用模板变量渲染所有文本文件
 * @param {*} dir 模板目录
 * @param {*} options 模板变量
 * @param {*} extraOptions 额外选项
 * @param {*} diableFormatDotFile 是否禁用格式化点文件
 * @returns 
 */
module.exports = async function (
  dir,
  options = {},
  extraOptions = {},
  diableFormatDotFile = false,
) {
  const ignore = get(extraOptions, "ignore");
  log.verbose("ignore", ignore);
  return new Promise((resolve, reject) => {
    glob(
      "**",
      {
        cwd: dir,
        nodir: true,
        ignore: ignore || "**/node_modules/**",
      },
      (err, files) => {
        if (err) {
          return reject(err);
        }

        log.verbose("render files:", files);

        Promise.all(
          files.map((file) => {
            const filepath = path.join(dir, file);
            return renderFile(filepath, options, diableFormatDotFile);
          }),
        )
          .then(() => {
            resolve();
          })
          .catch((err) => {
            reject(err);
          });
      },
    );
  });
};

function renderFile(filepath, options, diableFormatDotFile) {
  let filename = path.basename(filepath);

  if (filename.indexOf(".png") !== -1 || filename.indexOf(".jpg") !== -1) {
    // console.log('renderFile:', filename);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    ejs.renderFile(filepath, options, (err, result) => {
      if (err) {
        return reject(err);
      }
      if (/^_package.json/.test(filename)) {
        filename = filename.replace("_package.json", "package.json");
        fse.removeSync(filepath);
      }
      if (/\.ejs$/.test(filepath)) {
        filename = filename.replace(/\.ejs$/, "");
        fse.removeSync(filepath);
      }
      if (!diableFormatDotFile && /^_/.test(filename)) {
        filename = filename.replace(/^_/, ".");
        fse.removeSync(filepath);
      }
      const newFilepath = path.join(filepath, "../", filename);
      fse.writeFileSync(newFilepath, result);
      resolve(newFilepath);
    });
  });
}
