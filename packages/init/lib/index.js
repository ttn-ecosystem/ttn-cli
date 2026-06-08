'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const { log, inquirer, spinner, Package, sleep, exec, formatName, ejs } = require('@ttn-cli/utils');
const getProjectTemplate = require('./getProjectTemplate');

async function init(options) {
  try {
    // 设置要创建的项目安装的路径，相当于执行 pwd
    let targetPath = process.cwd();
    if (!options.targetPath) {
      options.targetPath = targetPath;
    }
    const result = await prepare(options);
    if (!result) {
      log.info('创建项目终止');
      return;
    }
    // 项目列表 / 当前项目信息
    const { templateList, project } = result;
    // 下载项目模板
    const template = await downloadTemplate(templateList, options);
    log.verbose('template', template);
    // 模板安装阶段
    await installTemplate(template, project, options);
  } catch (e) {
    if (options.debug) {
      log.error('Error:', e.stack);
    } else {
      log.error('Error:', e.message);
    }
  } finally {
    process.exit(0);
  }
}

// 执行 pnpm install ，使用淘宝镜像加速
async function pnpminstall(targetPath) {
  return new Promise((resolve, reject) => {
    const p = exec('pnpm', ['install', '--registry=https://registry.npmmirror.com'], { stdio: 'inherit', cwd: targetPath });
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}

async function installTemplate(template, ejsData, options) {
  // 安装模板
  let spinnerStart = spinner(`正在安装模板...`);
  await sleep(1000);
  // 将模板文件目录复制到目标目录
  const sourceDir = template.path;
  // 要在哪个目录下创建项目
  const targetDir = options.targetPath;
  // 确保 sourceDir 这个目录存在；不存在就创建（递归创建多级也行）
  fse.ensureDirSync(sourceDir);
  fse.ensureDirSync(targetDir);
  // 把 sourceDir 下的所有文件和子目录递归复制到 targetDir
  fse.copySync(sourceDir, targetDir);

  spinnerStart.stop(true);
  log.success('模板安装成功');

  // 对模板文件进行 EJS 渲染，将用户输入的项目信息注入到模板中
  // const ejsIgnoreFiles = [
  //   '**/node_modules/**',
  //   '**/.git/**',
  //   '**/.vscode/**',
  //   '**/.DS_Store',
  // ];
  // log.verbose('ejsData', ejsData);
  // await ejs(targetDir, ejsData, {
  //   ignore: ejsIgnoreFiles,
  // });
  // 安装依赖文件
  log.notice('开始安装依赖');
  await pnpminstall(targetDir);
  log.success('依赖安装成功，请执行项目目录下的启动命令');
}

async function downloadTemplate(templateList, options) {
  // 用户选择模板
  const templateName = await inquirer({
    choices: createTemplateChoice(templateList),
    message: '请选择项目模板',
  });
  log.verbose('template', templateName);
  // 选中的模板
  const selectedTemplate = templateList.find(item => item.name === templateName);
  log.verbose('selected template', selectedTemplate); // { name: 'vue-template', version: '0.0.0' }
  // 创建 Package 实例
  const { cliHome } = options;
  const targetPath = path.resolve(cliHome, 'template'); // ~/.ttn-cli/template/
  // 基于模板生成 Package 对象
  const templatePkg = new Package({
    targetPath,
    storePath: targetPath,
    name: selectedTemplate.name,
    version: selectedTemplate.version,
  });
  // 检查模板是否已存在，不存在则下载，存在则更新。
  if (!await templatePkg.exists()) {
    let spinnerStart = spinner(`正在下载模板...`);
    await sleep(1000);
    await templatePkg.install();
    spinnerStart.stop(true);
    log.success('下载模板成功');
  } else {
    log.notice('模板已存在', `${selectedTemplate.name}@${selectedTemplate.version}`);
    log.notice('模板路径', `${targetPath}`);
    let spinnerStart = spinner(`开始更新模板...`);
    await sleep(1000);
    await templatePkg.update();
    spinnerStart.stop(true);
    log.success('更新模板成功');
  }
  // 验证模板目录是否存在
  const templateSourcePath = templatePkg.npmFilePath;
  const templatePath = path.resolve(templateSourcePath, 'template');
  log.verbose('template path', templatePath);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`[${templateName}]项目模板不存在！`);
  }
  const template = {
    // name / version
    ...selectedTemplate,
    // 模板路径,里面就是 template 目录下的文件目录
    path: templatePath,
    // 模板源路径，包括 readme.md 和 template 目录
    sourcePath: templateSourcePath,
  };
  return template;
}

async function prepare(options) {
  // 目录空检查：读取当前目录，过滤掉 node_modules 、 .git 、 .DS_Store ，如果目录不为空则询问用户是否继续。
  let fileList = fs.readdirSync(process.cwd());
  fileList = fileList.filter(file => ['node_modules', '.git', '.DS_Store'].indexOf(file) < 0);
  log.verbose('fileList', fileList);
  let continueWhenDirNotEmpty = true;
  if (fileList && fileList.length > 0) { // 判断当前目录是否为空
    continueWhenDirNotEmpty = await inquirer({
      type: 'confirm',
      message: '当前文件夹不为空，是否继续创建项目？',
      defaultValue: false,
    });
  }
  if (!continueWhenDirNotEmpty) return;
  // 如果传入了 --force 参数，询问用户是否确认清空目录
  if (options.force) {
    const targetDir = options.targetPath;
    const confirmEmptyDir = await inquirer({
      type: 'confirm',
      message: '是否确认清空当下目录下的文件',
      defaultValue: false,
    });
    if (confirmEmptyDir) {
      fse.emptyDirSync(targetDir);
    }
  }
  // 获取模板列表
  let templateList = await getProjectTemplate();
  if (!templateList || templateList.length === 0) {
    throw new Error('项目模板列表获取失败');
  }
  // 获取项目/组件名称
  let projectName = '';
  // 获取项目名称
  while (!projectName) {
    projectName = await getProjectName();
    if (projectName) {
      projectName = formatName(projectName); // 格式化为 kebab-case
    }
    log.verbose('name', projectName);
  }
  return {
    templateList,
    project: {
      name: projectName
    },
  };
}

function getProjectName() {
  return inquirer({
    type: 'string',
    message: '请输入项目名称',
    defaultValue: '',
  });
}

function createTemplateChoice(list) {
  return list.map(item => ({
    name: item.name,
  }));
}

module.exports = init;
