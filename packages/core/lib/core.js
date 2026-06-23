"use strict";

const fs = require("fs");
const path = require("path");
const userHome = require("user-home");
const colors = require("colors/safe");
const program = require("commander");
const semver = require("semver");
const packageConfig = require("../package.json");
const { log, locale, npm, Package, exec } = require("@ttn-cli/utils");

// 常量定义
const NPM_NAME = "@ttn-cli/core";
const DEFAULT_CLI_HOME = '.ttn-cli';
const DEPENDENCIES_PATH = 'dependencies';

module.exports = cli;

let args; // 命令行参数
let config = {
  // ~/.ttn-cli/ 脚手架自身的一些依赖，都在 用户根目录下
  cliHome: path.join(userHome, DEFAULT_CLI_HOME),
};

// 命令配置
const commands = [
  {
    name: "init",
    description: "项目初始化",
    options: [
      { name: "--force", description: "是否强制初始化项目" },
    ],
    packageName: "@ttn-cli/init",
    packageVersion: "1.0.0",
  },
  {
    name: "publish",
    description: "发布项目",
    options: [
      { name: "--pre", description: "是否发布到预发环境" },
    ],
    packageName: "@ttn-cli/publish",
    packageVersion: "1.0.0",
  },
];

async function cli() {
  try {
    // 如果输入的指令是看 版本号 / 帮助信息 / 无参数，只注册指令，不执行 prepare 了
    const isVersionOrHelp = ["-V", "--version", "-h", "--help"].some((arg) =>
      process.argv.includes(arg),
    );
    const hasNoArgs = process.argv.slice(2).length === 0;
    if (isVersionOrHelp || hasNoArgs) {
      registerCommand();
      return;
    }
    // 判断如果是未知指令，则直接终止
    if (!isValidCommand()) process.exit(1);
    // 执行脚手架使用前准备
    await prepare();
    // 注册命令
    registerCommand();
  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

function isValidCommand() {
  const availableCommands = commands.map((cmd) => cmd.name);
  const userCommand = process.argv[2];
  if (!availableCommands.includes(userCommand)) {
    log.error("未知的命令: " + userCommand);
    log.info("可用命令: " + availableCommands.join("、"));
    return false;
  }
  return true;
}

// 注册指令
function registerCommand() {
  // 支持 ttn-cli -V / --version
  program.version(packageConfig.version).usage("<command> [options]");
  // 从配置动态注册命令
  commands.forEach((cmd) => {
    let cmdInstance = program.command(cmd.name).description(cmd.description);
    // 支持多个 options
    cmd.options.forEach((opt) => {
      cmdInstance = cmdInstance.option(opt.name, opt.description);
    });
    cmdInstance.passCommandToAction(false).action(async (options) => {
      await execCommand(
        { packageName: cmd.packageName, packageVersion: cmd.packageVersion },
        options,
      );
    });
  });
  // 处理未知命令
  program.on("command:*", function (args) {
    const availableCommands = commands.map((cmd) => cmd.name);
    log.error("未知的命令: " + args[0]);
    log.info("可用命令: " + availableCommands.join(" "));
    process.exit(1);
  });
  // 解析参数
  program.parse(process.argv);
  // 直接输入 ttn-cli 没有子命令时，输出 help 帮助信息
  if (program.args && program.args.length < 1) {
    program.outputHelp();
    console.log(); // 打印空行
  }
}

// 命令包执行器 ，负责 动态加载和执行
async function execCommand({ packageName, packageVersion }, extraOptions) {
  let rootFile;
  try {
    // 检查执行包是否存在（判断是否是开发模式）
    const localPackagePath = path.resolve(__dirname, `../../${packageName.split("/")[1]}`);
    let devPackagePath = null;
    // 本地包路径
    if (fs.existsSync(localPackagePath)) devPackagePath = localPackagePath;
    if (devPackagePath) {
      const execPackage = new Package({
        // 当前包所在的项目根目录
        targetPath: devPackagePath,
        // 包的真实存储目录（物理存放位置）
        storePath: devPackagePath,
        name: packageName,
        version: packageVersion,
      });
      rootFile = execPackage.getRootFilePath(true);
    } else {
      // 生产模式：从缓存目录加载
      const { cliHome } = config; // '/Users/xxx/.ttn-cli'
      const packageDir = `${DEPENDENCIES_PATH}`; // dependencies
      const targetPath = path.resolve(cliHome, packageDir); // '/Users/xxx/.ttn-cli/dependencies'
      const storePath = path.resolve(targetPath, "node_modules"); // '/Users/xxx/.ttn-cli/dependencies/node_modules'
      const execPackage = new Package({
        targetPath,
        storePath,
        name: packageName,
        version: packageVersion,
      });
      // 检查本地缓存，不存在则从 npm 安装
      if (await execPackage.exists()) {
        await execPackage.update();
      } else {
        await execPackage.install();
      }
      rootFile = execPackage.getRootFilePath();
    }
    /**
     * _config
     * {
     *    cliHome: '~/.ttn-cli/',
     *    force: true,
     *    pre: true
     * }
     */
    const _config = Object.assign({}, config, extraOptions); // 参数组合成一个对象
    // 判断主入口文件是否存在
    if (fs.existsSync(rootFile)) {
      const code = `require('${rootFile}')(${JSON.stringify(_config)})`;
      const p = exec("node", ["-e", code], { stdio: "inherit" }); // node -e "require('xxx')(config)"
      p.on("error", (e) => {
        log.verbose("命令执行失败:", e);
        handleError(e);
        process.exit(1);
      });
      p.on("exit", (c) => {
        log.verbose("命令执行成功:", c);
        process.exit(c);
      });
    } else {
      throw new Error("入口文件不存在，请重试！");
    }
  } catch (e) {
    log.error(e.message);
  }
}

async function prepare() {
  checkPkgVersion(); // 检查当前脚手架版本
  checkRoot(); // 检查是否为 root 用户
  checkUserHome(); // 检查用户主目录
  checkEnv(); // 检查/加载 环境变量
  await checkGlobalUpdate(); // 检查当前脚手架是否需要更新
}

function checkPkgVersion() {
  log.notice("当前脚手架版本:", packageConfig.version);
  log.success(locale.welcome);
}

function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();  // rootCheck() 执行后会自动将进程从 root 用户切换回普通用户
}

function checkUserHome() {
  log.notice("当前登录用户主目录:", userHome);
  if (!userHome || !fs.existsSync(userHome)) {
    log.error("当前登录用户主目录不存在！");
    process.exit(1);
  }
}

// 加载环境变量
function checkEnv() {
  log.verbose("开始检查环境变量");
  // 将 .env 文件中加载环境变量到 process.env，.env 中可以存放API 密钥、用户名密码
  // 如果 .env 中写了：CLI_HOME=my-cli，那就可以从 process.env.CLI_HOME 中获取到 my-cli 这个值
  const dotenv = require("dotenv");
  const result = dotenv.config({
    path: path.resolve(userHome, ".env"),
  });
  if (result.error) {
    log.verbose(`环境变量加载失败`);
  }
}

// 提示用户更新最新版本的脚手架
async function checkGlobalUpdate() {
  log.verbose("检查 ttn-cli 最新版本");
  const currentVersion = packageConfig.version;
  try {
    // 获取当前脚手架的最新版本
    const lastVersion = await npm.getLatestVersion(NPM_NAME);
    if (lastVersion && semver.gt(lastVersion, currentVersion)) {
      log.warn(
        colors.yellow(`请手动更新 ${NPM_NAME}，当前版本：${currentVersion}，最新版本：${lastVersion}
                更新命令： npm install -g ${NPM_NAME}`),
      );
    }
  } catch (error) {
    log.verbose(`版本检查失败: ${error.message}`);
  }
}
