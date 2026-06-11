'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { Git, log, CloudBuild } = require('@ttn-cli/utils');

async function publish() {
  const startTime = new Date().getTime();
  // 检查项目的基本信息
  const projectInfo = checkProjectInfo();
  // 和项目相关的信息
  const { name, version, dir, scripts } = projectInfo;
  if (!scripts || !scripts.build) {
    log.error('请在 package.json 中添加 build 脚本');
    process.exit(1);
  }
  // 检查 git 仓库状态
  const git = new Git();
  try{
    git.checkStatus();
  }catch(err){
    log.error(err.message);
    process.exit(1);
  }
  // 获取 git 远程地址和分支信息
  const { remoteUrl, branch } = git.getGitInfo();
  if (!remoteUrl || !branch) {
    log.error('获取项目 git 信息失败');
    process.exit(1);
  }
  // 云构建+云发布
  const cloudBuild = new CloudBuild({
    name, version, dir, scripts, remoteUrl, branch,
  });
  await cloudBuild.prepare();
  await cloudBuild.init();
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