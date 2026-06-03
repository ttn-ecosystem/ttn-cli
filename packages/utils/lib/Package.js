const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const npminstall = require("npminstall");
const log = require("./log");
const npm = require("./npm");
const formatPath = require("./formatPath");

// 控制是否使用官方npm源
const useOriginNpm = false;

/**
 * Package 类，用于管理动态下载的库文件
 */
class Package {
  constructor(options) {
    log.verbose("options", options);
    this.targetPath = options.targetPath; // 包安装目标路径
    this.storePath = options.storePath; // 包缓存路径
    this.packageName = options.name; // npm包名（如 "lodash"、"@vue/cli"）
    this.packageVersion = options.version; // 包版本号
    this.npmFilePathPrefix = this.packageName.replace("/", "_"); // 将包名中的"/"替换为"_"，用于生成存储目录名
  }
  // 计算并返回 npm 包在本地缓存中的实际存储路径
  get npmFilePath() {
    return path.resolve(
      this.storePath,
      `_${this.npmFilePathPrefix}@${this.packageVersion}@${this.packageName}`,
    );
  }
  // 安装前的准备工作，确保必要目录存在，并尝试获取最新版本号
  async prepare() {
    // 检查目标路径是否存在
    if (!fs.existsSync(this.targetPath)) {
      // 不存在则递归创建目录
      fse.mkdirpSync(this.targetPath);
    }
    if (!fs.existsSync(this.storePath)) {
      fse.mkdirpSync(this.storePath);
    }
    log.verbose(this.targetPath);
    log.verbose(this.storePath);
    // 获取包的最新版本
    const latestVersion = await npm.getLatestVersion(this.packageName);
    log.verbose("latestVersion", this.packageName, latestVersion);
    if (latestVersion) {
      this.packageVersion = latestVersion;
    }
  }

  // 执行实际的包安装
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: npm.getNpmRegistry(useOriginNpm),
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion,
        },
      ],
    });
  }
  // 检查包是否已在本地缓存中
  async exists() {
    await this.prepare();
    return fs.existsSync(this.npmFilePath);
  }
  // 获取包的 package.json 文件内容
  getPackage(isOriginal = false) {
    if (!isOriginal) {
      return fse.readJsonSync(path.resolve(this.npmFilePath, "package.json"));
    }
    return fse.readJsonSync(path.resolve(this.storePath, "package.json"));
  }
  // 根据 package.json 中的 main 字段，计算并返回包的入口文件绝对路径。
  // 返回包入口文件路径（格式化后）
  getRootFilePath(isOriginal = false) {
    const pkg = this.getPackage(isOriginal);
    if (pkg) {
      if (!isOriginal) {
        return formatPath(path.resolve(this.npmFilePath, pkg.main));
      }
      return formatPath(path.resolve(this.storePath, pkg.main));
    }
    return null;
  }
  // 获取本地已安装包的版本号
  async getVersion() {
    await this.prepare();
    return (await this.exists()) ? this.getPackage().version : null;
  }
  //基于 semver 规范获取包的最新可用版本，用于更新检测。
  async getLatestVersion() {
    const version = await this.getVersion();
    if (version) {
      const latestVersion = await npm.getNpmLatestSemverVersion(
        this.packageName,
        version,
      );
      return latestVersion;
    }
    return null;
  }
  // 将已安装的包更新到最新版本
  async update() {
    const latestVersion = await this.getLatestVersion();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: npm.getNpmRegistry(useOriginNpm),
      pkgs: [
        {
          name: this.packageName,
          version: latestVersion,
        },
      ],
    });
  }
}

module.exports = Package;
