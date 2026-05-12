#!/usr/bin/env node
/**
 * 本地开发：cd packages/core、npm link、ttn-cli
 * 在 packages/core 目录下执行 npm link 的核心目的是 将本地开发的 CLI 工具链接为全局命令
 * 通过 npm link 创建全局符号链接
 * npm link 执行后
 * /usr/local/bin/ttn-cli  ──符号链接──>  packages/core/bin/ttn-cli.js
 * 
 * npm link 命令会读取当前目录的 package.json
 * 查找 bin 字段定义的可执行文件路径，在全局创建符号链接指向该路径
 */

require('../lib/core')();