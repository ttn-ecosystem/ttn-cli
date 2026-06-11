const { execSync } = require('child_process');

class Git {
  constructor() {
    this.status = this.getGitStatus();
  }
  // 获取 git 仓库状态
  getGitStatus() {
    try {
      // 获取当前分支
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
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
      console.error('当前目录不是 git 仓库');
      process.exit(1);
    }
    if (!this.status.isMaster) {
      console.warn(`当前分支为 ${this.status.branch}，非 master 分支`);
    }
    if (this.status.hasUncommitted) {
      console.warn('存在未提交的变更，请先提交后再执行');
    }
  }
}

export default Git;

// const git = new Git();
// git.checkStatus();