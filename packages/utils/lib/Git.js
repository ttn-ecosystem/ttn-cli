const simpleGit = require("simple-git");

class Git {
  constructor(options = {}) {
    const { cwd = process.cwd() } = options;
    this.git = simpleGit(cwd);
    this.status = null;
  }

  async init() {
    this.status = await this.getGitStatus();
    return this;
  }

  async getGitStatus() {
    try {
      const [branchResult, statusResult] = await Promise.all([
        this.git.branch(),
        this.git.status()
      ]);
      return {
        branch: branchResult.current,
        isMaster: ['master', 'main'].includes(branchResult.current),
        hasUncommitted: statusResult.files.length > 0 || statusResult.staged.length > 0,
      };
    } catch {
      return null;
    }
  }

  async getGitInfo() {
    let remoteUrl = '';
    try {
      const [remotes, branchResult] = await Promise.all([
        this.git.getRemotes(true),
        this.git.branch()
      ]);
      const origin = remotes.find(r => r.name === 'origin');
      if (origin) {
        remoteUrl = origin.refs.fetch;
      }
      return {
        remoteUrl,
        branch: branchResult.current,
      };
    } catch {
      return {
        remoteUrl,
        branch: '',
      };
    }
  }

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
