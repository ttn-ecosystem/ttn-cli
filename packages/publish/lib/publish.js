'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { Git, log } = require('@ttn-cli/utils');

function publish() {
  const startTime = new Date().getTime();
  // 检查项目的基本信息
  const projectInfo = checkProjectInfo();
  const { name, version, dir, scripts } = projectInfo;
  if (!scripts || !scripts.build) {
    throw new Error('package.json 中没有 build 脚本');
  }
  // 检查 git 仓库状态
  const git = new Git();
  try{
    git.checkStatus();
  }catch(err){
    log.error(err.message);
    process.exit(1);
  }
  // 云构建+云发布
  const endTime = new Date().getTime();
  log.info('本次发布耗时：', Math.floor((endTime - startTime) / 1000) + '秒');
}

function checkProjectInfo() {
  const projectPath = process.cwd();
  const pkgPath = path.resolve(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json不存在');
  }
  const pkg = fse.readJsonSync(pkgPath);
  console.log('pkg', pkg);
  const { name, version, scripts } = pkg;
  return { name, version, dir: projectPath, scripts };
}

module.exports = publish;