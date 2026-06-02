"use strict";

const fs = require("fs");
const path = require("path");
const userHome = require("user-home");
const colors = require('colors/safe');
const { log, locale, npm } = require("@ttn-cli/utils");
const packageConfig = require("../package.json");
const { LOWEST_NODE_VERSION, DEFAULT_CLI_HOME, NPM_NAME, DEPENDENCIES_PATH } = require("./const");

module.exports = cli;

let args; // 命令行参数
let config; // 环境变量配置

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

function checkPkgVersion() {
  log.notice("脚手架当前版本:", packageConfig.version);
  log.success(locale.welcome);
}

function checkNodeVersion() {
  const semver = require("semver");
  log.notice("当前 Node.js 版本:", process.version);
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    log.error(`ttn-cli 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`);
    process.exit(1);
  }
}

function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
}

function checkUserHome() {
  log.notice("当前登录用户主目录:", userHome);
  if (!userHome || !fs.existsSync(userHome)) {
    log.error("当前登录用户主目录不存在！");
    process.exit(1);
  }
}

function checkInputArgs() {
  log.verbose("开始校验输入参数");
  const minimist = require("minimist"); // 将命令行参数转换为结构化的 JavaScript 对象
  args = minimist(process.argv.slice(2)); // 解析查询参数
  checkArgs(args); // 校验参数
  log.verbose("输入参数", args);
}

function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = "debug";
  } else {
    process.env.LOG_LEVEL = "info";
  }
  // 设置日志级别
  log.level = process.env.LOG_LEVEL;
}

function checkEnv() {
  log.verbose("开始检查环境变量");
  // 从 .env 文件中加载环境变量到 process.env
  const dotenv = require("dotenv");
  dotenv.config({
    path: path.resolve(userHome, ".env"),
  });
  config = createCliConfig(); // 准备基础配置
  log.verbose("环境变量", config);
}

function createCliConfig() {
  const cliConfig = {
    home: userHome,
  };
  if (process.env.CLI_HOME) {
    cliConfig["cliHome"] = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliConfig["cliHome"] = path.join(userHome, DEFAULT_CLI_HOME); // .ttn-cli
  }
  return cliConfig;
}

async function checkGlobalUpdate() {
  log.verbose("检查 ttn-cli 最新版本");
  const currentVersion = packageConfig.version;
  // 获取当前脚手架的最新版本
  const lastVersion = await npm.getNpmLatestSemverVersion(
    NPM_NAME,
    currentVersion,
  );
  if (lastVersion && semver.gt(lastVersion, currentVersion)) {
    log.warn(
      colors.yellow(`请手动更新 ${NPM_NAME}，当前版本：${packageConfig.version}，最新版本：${lastVersion}
                更新命令： npm install -g ${NPM_NAME}`),
    );
  }
}
