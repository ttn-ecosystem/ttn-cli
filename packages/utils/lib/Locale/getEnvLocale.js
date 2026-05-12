function getEnvLocale(env) {
  // process 是一个全局对象，表示当前正在运行的 Node.js 进程
  // 获取当前进程的环境变量的值，用于确定当前系统的语言环境
  // zh_CN.UTF-8 -> 中文环境
  // en_US.UTF-8 -> 英文环境
  env = env || process.env;
  return env.LC_ALL || env.LC_MESSAGES || env.LANG || env.LANGUAGE;
}

module.exports = getEnvLocale();