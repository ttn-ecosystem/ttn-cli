'use strict';

const { Git, log } = require('@ttn-cli/utils');

function publish() {
  // 检查 git 仓库状态
  const git = new Git();
  try{
    git.checkStatus();
  }catch(err){
    log.error(err.message);
    process.exit(1);
  }
}

module.exports = publish;