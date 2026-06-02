"use strict";

const fs = require("fs");
const userHome = require("user-home");
const { log, locale } = require("@ttn-cli/utils");
const packageConfig = require("../package.json");
const { LOWEST_NODE_VERSION } = require("./const");

module.exports = cli;

async function cli() {
  try {
    await prepare();
  } catch (error) {
    console.error(error);
  }
}

async function prepare() {
  checkPkgVersion(); // 检查当前运行版本
  checkNodeVersion(); // 检查 node 版本
  checkRoot(); // 检查是否为 root 启动
  checkUserHome(); // 检查用户主目录
  checkInputArgs(); // 检查用户输入参数
  checkEnv(); // 检查/加载 环境变量
  await checkGlobalUpdate(); // 检查当前脚手架是否需要更新
}

function checkNodeVersion() {
  const semver = require("semver");
  log.notice("当前 Node.js 版本:", process.version);
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    log.error(`ttn-cli 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`);
    process.exit(1);
  }
}

function checkPkgVersion() {
  log.notice("脚手架当前版本:", packageConfig.version);
  log.success(locale.welcome);
}

function checkRoot() {
  const rootCheck = require("root-check");
  log.notice("检查是否为 root 账户启动:", process.getuid()); // 0 表示 root 账户，其他值表示普通用户
  rootCheck(log.error("请避免使用 root 账户启动本应用"));
}

function checkUserHome() {
  log.notice("当前登录用户主目录:", userHome);
  if (!userHome || !fs.existsSync(userHome)) {
    log.error("当前登录用户主目录不存在！");
    process.exit(1);
  }
}

function checkInputArgs() {}

function checkEnv() {}

async function checkGlobalUpdate() {
  log.verbose("检查 ttn-cli 最新版本");
  const currentVersion = packageConfig.version;
  // const lastVersion = await npm.getNpmLatestSemverVersion(
  //   NPM_NAME,
  //   currentVersion,
  // );
  // if (lastVersion && semver.gt(lastVersion, currentVersion)) {
  //   log.warn(
  //     colors.yellow(`请手动更新 ${NPM_NAME}，当前版本：${packageConfig.version}，最新版本：${lastVersion}
  //               更新命令： npm install -g ${NPM_NAME}`),
  //   );
  // }
}
