const log = require('npmlog')

// 在模块加载时就检查命令行参数
const minimist = require('minimist');
const args = minimist(process.argv.slice(2));
const logLevel = args.debug ? 'verbose' : (process.env.LOG_LEVEL || 'info');

log.level = logLevel;

log.heading = 'ttn-cli' // 自定义头部
log.addLevel('success', 2000, { fg: 'green', bold: true }) // 自定义success日志
log.addLevel('notice', 2000, { fg: 'blue', bg: 'black' }) // 自定义notice日志

module.exports = log
