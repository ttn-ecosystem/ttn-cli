'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const { Git, log, CloudBuild, inquirer } = require('@ttn-cli/utils');

// 发布HTML模板代码
async function uploadTemplate() {

}

function checkProjectInfo() {
  const projectPath = process.cwd();
  const pkgPath = path.resolve(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error('package.json不存在');
  }
  const pkg = fse.readJsonSync(pkgPath);
  const { name, version, scripts } = pkg;
  // 获取 OSS config配置
  const ossConfigPath = path.resolve(projectPath, 'ossConfig.json');
  if (!fs.existsSync(ossConfigPath)) {
    throw new Error('ossConfig.json不存在');
  }
  const ossConfig = fse.readJsonSync(ossConfigPath);
  const { domain, previewDomain } = ossConfig;
  return { name, version, dir: projectPath, scripts, domain, previewDomain };
}

async function publish(options = {}) {
  // 获取要部署的环境
  const { pre = false } = options;
  const env = pre ? 'pre' : 'prod';
  // 如果是生产环境，需要用户确认
  if (env === 'prod') {
    const confirm = await inquirer({
      type: 'confirm',
      message: '确认部署到线上生产环境吗？',
      defaultValue: false,
    });
    if (!confirm) {
      log.info('已取消发布');
      process.exit(0);
    }
  }
  let buildRet = false;
  // 构建开始时间
  const startTime = new Date().getTime();
  // 检查项目的基本信息
  const projectInfo = checkProjectInfo();
  // 和项目相关的信息
  const { name, version, dir, scripts, domain, previewDomain } = projectInfo;
  if (!(scripts && (scripts.build || scripts['build:prod']) && scripts['build:pre'])) {
    log.error('请在 package.json 中添加 build:pre（预发环境）或 build:prod（生产环境）');
    process.exit(1);
  }
  // 检查 git 仓库状态
  const git = await new Git().init();
  try{
    git.checkStatus();
  }catch(err){
    log.error(err.message);
    process.exit(1);
  }
  // 获取 git 远程地址和分支信息
  const { remoteUrl, branch } = await git.getGitInfo();
  if (!remoteUrl || !branch) {
    log.error('获取项目 git 信息失败');
    process.exit(1);
  }
  // 云构建+云发布
  const cloudBuild = new CloudBuild({
    name, version, dir, scripts, remoteUrl, branch, env, domain, previewDomain,
  });
  await cloudBuild.prepare();
  await cloudBuild.init();
  buildRet = await cloudBuild.build();
  if (buildRet) {
    await this.uploadTemplate();
  }
  const endTime = new Date().getTime();
  log.info('本次发布耗时：', Math.floor((endTime - startTime) / 1000) + '秒');
}

module.exports = publish;