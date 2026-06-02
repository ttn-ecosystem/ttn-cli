'use strict';

const pino = require('pino');

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

const logger = pino({
  level: logLevel,
  name: 'ttn',
  transport: {
    target: require.resolve('pino-pretty'),
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      customLevels: {
        success: 20,
        notice: 25
      },
      messageFormat: '[ttn-cli] {msg}',
      levelFirst: true
    }
  }
});

logger.notice = (...args) => logger.info(args.join(' '));
logger.success = (...args) => logger.info(args.join(' '));

logger.level = logLevel;
logger.heading = 'ttn';

module.exports = logger;
