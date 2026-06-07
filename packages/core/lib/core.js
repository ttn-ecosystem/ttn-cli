"use strict";

const fs = require("fs");
const path = require("path");
const userHome = require("user-home");
const colors = require("colors/safe");
const program = require("commander");
const { log, locale, npm } = require("@ttn-cli/utils");
const packageConfig = require("../package.json");

const {
  LOWEST_NODE_VERSION,
  DEFAULT_CLI_HOME,
  NPM_NAME,
  DEPENDENCIES_PATH,
} = require("./const");

module.exports = cli;

let args; // 命令行参数
let config; // 环境变量配置

async function cli() {
  try {
    // 脚手架准备阶段
    await prepare();
    // 注册命令
    registerCommand();
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

// 注册指令
function registerCommand() {
  program.version(packageConfig.version).usage("<command> [options]"); // 支持 ttn-cli -V
  program
    .command("desc")
    .description("查看 ttn-cli 描述")
    .action(() => {
      log.success("欢迎使用 ttn-cli");
      log.success("官网链接", "https://ttn-ecosystem.github.io/ttn-docs/");
      log.success("作者介绍", "code-YuJun");
    });

  program
    .command("init [type]")
    .description("项目初始化")
    // 判断是否去执行本地代码
    .option("--packagePath <packagePath>", "手动指定init包路径") // 允许用户手动指定 init 包的本地路径（用于开发调试）
    .option("--force", "是否强制初始化项目")
    .action(async (type, { packagePath, force }) => {
      const packageName = "@ttn-cli/init";
      const packageVersion = "1.0.0";
      await execCommand(
        { packagePath, packageName, packageVersion },
        { type, force },
      );
    });

  // 处理未知命令
  program.on("command:*", function (args) {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    log.error("未知的命令: " + args[0]);
    log.info("可用命令: " + availableCommands.join(" "));
    process.exit(1);
  });
  program.option("--debug", "打开调试模式").parse(process.argv);

  // 直接输入 ttn-cli 没有子命令时，输出 help 帮助信息
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log();
  }
}

// 命令包执行器 ，负责 动态加载和执行
async function execCommand({ packagePath, packageName, packageVersion }, extraOptions) {
  let rootFile;
  try {
    if (packagePath) {
      // 使用本地路径加载包
      const execPackage = new Package({
        // 包安装目标路径
        targetPath: packagePath,
        // 全局包缓存路径
        storePath: packagePath,
        name: packageName,
        version: packageVersion,
      });
      rootFile = execPackage.getRootFilePath(true);
    } else {
      // 生产模式：从缓存目录加载
      const { cliHome } = config; // '/Users/qiangyujun/.ttn-cli'
      const packageDir = `${DEPENDENCIES_PATH}`; // dependencies
      const targetPath = path.resolve(cliHome, packageDir); // '/Users/qiangyujun/.ttn-cli/dependencies'
      // 全局包缓存路径
      const storePath = path.resolve(targetPath, 'node_modules'); // '/Users/qiangyujun/.ttn-cli/dependencies/node_modules'
      const initPackage = new Package({
        targetPath,
        storePath,
        name: packageName,
        version: packageVersion,
      });
      // 检查本地缓存，不存在则从 npm 安装
      if (await initPackage.exists()) {
        await initPackage.update();
      } else {
        await initPackage.install();
      }
      rootFile = initPackage.getRootFilePath();
    }
    const _config = Object.assign({}, config, extraOptions, {
      debug: args.debug,
    });
    if (fs.existsSync(rootFile)) {
      const code = `require('${rootFile}')(${JSON.stringify(_config)})`;
      // 通过 node -e 动态执行入口文件
      const p = exec('node', ['-e', code], { 'stdio': 'inherit' }); // node -e "require('xxx')(config)"
      p.on('error', e => {
        log.verbose('命令执行失败:', e);
        handleError(e);
        process.exit(1);
      });
      p.on('exit', c => {
        log.verbose('命令执行成功:', c);
        process.exit(c);
      });
    } else {
      throw new Error('入口文件不存在，请重试！');
    }
  } catch (e) {
    log.error(e.message);
  }
}

async function prepare() {
  checkPkgVersion(); // 检查当前运行版本
  checkNodeVersion(); // 检查 node 版本
  checkRoot(); // 检查是否为 root 启动
  checkUserHome(); // 检查用户主目录
  checkInputArgs(); // 检查用户输入参数
  checkEnv(); // 检查/加载 环境变量
  await checkGlobalUpdate(); // 检查当前脚手架是否需要更新
}

function checkPkgVersion() {
  log.notice("当前脚手架版本:", packageConfig.version);
  log.success(locale.welcome);
}

function checkNodeVersion() {
  const semver = require("semver");
  log.notice("当前 Node.js 版本:", process.version);
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    log.error(`ttn-cli 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`);
    process.exit(1);
  }
}

function checkRoot() {
  const rootCheck = require("root-check");
  // rootCheck() 执行后会自动将进程从 root 用户切换回执行 sudo 命令的普通用户
  rootCheck();
}

function checkUserHome() {
  log.notice("当前登录用户主目录:", userHome);
  if (!userHome || !fs.existsSync(userHome)) {
    log.error("当前登录用户主目录不存在！");
    process.exit(1);
  }
}

function checkInputArgs() {
  log.verbose("开始校验输入参数");
  const minimist = require("minimist"); // 将命令行参数转换为结构化的 JavaScript 对象
  args = minimist(process.argv.slice(2)); // 解析查询参数
  log.verbose("输入参数", args);
}

// 检查/加载 环境变量
function checkEnv() {
  log.verbose("开始检查环境变量");
  // 将 .env 文件中加载环境变量到 process.env，.env 中可以存放API 密钥、用户名密码
  // 如果 .env 中写了：CLI_HOME=my-cli，那就可以从 process.env.CLI_HOME 中获取到 my-cli 这个值
  const dotenv = require("dotenv");
  dotenv.config({
    path: path.resolve(userHome, ".env"),
  });
}

// 提示用户更新最新版本的脚手架
async function checkGlobalUpdate() {
  log.verbose("检查 ttn-cli 最新版本");
  const currentVersion = packageConfig.version;
  try {
    // 获取当前脚手架的最新版本
    const lastVersion = await npm.getNpmLatestSemverVersion(
      NPM_NAME,
      currentVersion,
    );
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
      log.warn(
        colors.yellow(`请手动更新 ${NPM_NAME}，当前版本：${packageConfig.version}，最新版本：${lastVersion}
                更新命令： npm install -g ${NPM_NAME}`),
      );
    }
  } catch (error) {
    log.verbose(`版本检查失败: ${error.message}`);
  }
}
