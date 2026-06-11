const { execSync } = require('child_process');

class Git {
  constructor() {
    this.status = this.getGitStatus();
  }
  // 获取 git 仓库状态
  getGitStatus() {
    try {
      // 获取当前分支
      const branch = execSync('git symbolic-ref --short HEAD', { encoding: 'utf-8' }).trim();
      // 未提交的变更（有输出 = 有未提交内容）
      const uncommitted = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
      return {
        branch,
        isMaster: ['master', 'main'].includes(branch),
        hasUncommitted: uncommitted.length > 0,
      };
    } catch {
      return null; // 不是 git 仓库
    }
  }
  // 检查 git 仓库状态
  checkStatus() {
    if (!this.status) {
      throw new Error('当前目录不是 git 仓库');
    }
    if (!this.status.isMaster) {
      throw new Error(`当前分支为 ${this.status.branch}，非 master 或 main 分支`);
    }
    if (this.status.hasUncommitted) {
      throw new Error('存在未提交的变更，请先提交后再执行');
    }
  }
}

module.exports = Git;

// const git = new Git();
// git.checkStatus();