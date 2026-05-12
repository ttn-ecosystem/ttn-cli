'use strict';

const { log, npm, Package, locale } = require('@ttn-cli/utils');

module.exports = cli;

async function cli() {
  try {
    await prepare();
    // 注册指令
    registerCommand();
  } catch (error) {
    console.error(error);
  }
}

async function prepare() {
  // 打印当前 core 包的版本 & 欢迎信息
  checkPkgVersion();
  // 检查 node 版本
  checkNodeVersion();
  // 检查是否为 root 启动
  checkRoot();
  // 检查用户主目录
  checkUserHome();
  // 检查用户输入参数
  checkInputArgs();
  // 检查/加载 环境变量
  checkEnv();
  // 检查当前脚手架是否需要更新
  await checkGlobalUpdate();
}

function checkPkgVersion() {
  log.notice('cli', packageConfig.version);
  // 获取 中文 / 英文环境 的配置
  log.success(locale.welcome);
}
