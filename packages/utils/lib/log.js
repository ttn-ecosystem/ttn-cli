'use strict';

const pino = require('pino');

const logLevel = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

const logger = pino({
  level: logLevel,
  name: 'ttn',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
      customLevels: {
        success: 20,
        notice: 25
      },
      messageFormat: '[ttn] {msg}',
      levelFirst: true
    }
  }
});

logger.success = logger.info.bind(logger);
logger.notice = logger.info.bind(logger);

logger.level = logLevel;
logger.heading = 'ttn';

module.exports = logger;
