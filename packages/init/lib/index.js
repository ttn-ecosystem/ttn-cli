'use strict';

const fs = require('fs');
const fse = require('fs-extra');
const { log, inquirer, spinner, Package, sleep, exec, formatName, formatClassName, ejs } = require('@ttn-cli/utils');
const getProjectTemplate = require('./getProjectTemplate');

const COMPONENT_FILE = '.componentrc';
const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';
const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const DEFAULT_TYPE = TYPE_PROJECT;

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
    // 获取项目模板列表
    const { templateList, project } = result;
    // 下载项目模板
    const template = await downloadTemplate(templateList, options);
    log.verbose('template', template);
    // 模板安装阶段
    if (template.type === TEMPLATE_TYPE_NORMAL) {
      await installTemplate(template, project, options);
    } else if (template.type === TEMPLATE_TYPE_CUSTOM) {
      await installCustomTemplate(template, project, options);
    } else {
      throw new Error('未知的模板类型！');
    }
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

// 自定义模板安装 installCustomTemplate
async function installCustomTemplate(template, ejsData, options) {
  const pkgPath = path.resolve(template.sourcePath, 'package.json');
  const pkg = fse.readJsonSync(pkgPath);
  const rootFile = path.resolve(template.sourcePath, pkg.main);
  if (!fs.existsSync(rootFile)) {
    throw new Error('入口文件不存在！');
  }
  log.notice('开始执行自定义模板');
  const targetPath = options.targetPath;
  await execCustomTemplate(rootFile, {
    targetPath,
    data: ejsData,
    template,
  });
  log.success('自定义模板执行成功');
}
// 通过 Node.js 子进程执行自定义模板脚本
function execCustomTemplate(rootFile, options) {
  const code = `require('${rootFile}')(${JSON.stringify(options)})`;
  return new Promise((resolve, reject) => {
    const p = exec('node', ['-e', code], { 'stdio': 'inherit' });
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}
// 执行 npm install ，使用淘宝镜像加速
async function npminstall(targetPath) {
  return new Promise((resolve, reject) => {
    const p = exec('npm', ['install', '--registry=https://registry.npm.taobao.org'], { stdio: 'inherit', cwd: targetPath });
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}

async function execStartCommand(targetPath, startCommand) {
  return new Promise((resolve, reject) => {
    const p = exec(startCommand[0], startCommand.slice(1), { stdio: 'inherit', cwd: targetPath });
    p.on('error', e => {
      reject(e);
    });
    p.on('exit', c => {
      resolve(c);
    });
  });
}

// 创建组件配置文件 .componentrc
async function createComponentFile(template, data, dir) {
  if (template.tag.includes(TYPE_COMPONENT)) {
    const componentData = {
      ...data,
      buildPath: template.buildPath,
      examplePath: template.examplePath,
      npmName: template.npmName,
      npmVersion: template.version,
    }
    const componentFile = path.resolve(dir, COMPONENT_FILE);
    fs.writeFileSync(componentFile, JSON.stringify(componentData));
  }
}

async function installTemplate(template, ejsData, options) {
  // 安装模板
  let spinnerStart = spinner(`正在安装模板...`);
  await sleep(1000);
  // 将模板目录复制到目标目录
  const sourceDir = template.path;
  const targetDir = options.targetPath;
  fse.ensureDirSync(sourceDir);
  fse.ensureDirSync(targetDir);
  fse.copySync(sourceDir, targetDir);

  spinnerStart.stop(true);
  log.success('模板安装成功');

  // 对模板文件进行 EJS 渲染，将用户输入的项目信息注入到模板中
  const ejsIgnoreFiles = [
    '**/node_modules/**',
    '**/.git/**',
    '**/.vscode/**',
    '**/.DS_Store',
  ];
  if (template.ignore) {
    ejsIgnoreFiles.push(...template.ignore);
  }
  log.verbose('ejsData', ejsData);
  await ejs(targetDir, ejsData, {
    ignore: ejsIgnoreFiles,
  });

  // 创建组件配置文件，如果是组件类型，创建 .componentrc 配置文件。
  await createComponentFile(template, ejsData, targetDir);
  // 安装依赖文件
  log.notice('开始安装依赖');
  await npminstall(targetDir); // 调用 npm install 安装项目依赖
  log.success('依赖安装成功');

  // 如果模板定义了启动命令，则执行该命令
  if (template.startCommand) {
    log.notice('开始执行启动命令');
    const startCommand = template.startCommand.split(' ');
    await execStartCommand(targetDir, startCommand);
  }
}

async function downloadTemplate(templateList, options) {
  // 用户选择模板
  const templateName = await inquirer({
    choices: createTemplateChoice(templateList),
    message: '请选择项目模板',
  });
  log.verbose('template', templateName);
  // 选中的模板
  const selectedTemplate = templateList.find(item => item.npmName === templateName);
  log.verbose('selected template', selectedTemplate);

  // 创建 Package 实例
  const { cliHome } = options;
  const targetPath = path.resolve(cliHome, 'template');
  // 基于模板生成 Package 对象
  const templatePkg = new Package({
    targetPath,
    storePath: targetPath,
    name: selectedTemplate.npmName,
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
    log.notice('模板已存在', `${selectedTemplate.npmName}@${selectedTemplate.version}`);
    log.notice('模板路径', `${targetPath}`);
    let spinnerStart = spinner(`开始更新模板...`);
    await sleep(1000);
    await templatePkg.update();
    spinnerStart.stop(true);
    log.success('更新模板成功');
  }

  // 构建模板路径
  // 验证模板目录存在，然后返回包含完整路径信息的模板对象
  const templateSourcePath = templatePkg.npmFilePath;
  const templatePath = path.resolve(templateSourcePath, 'template');
  log.verbose('template path', templatePath);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`[${templateName}]项目模板不存在！`);
  }
  const template = {
    ...selectedTemplate,
    path: templatePath,
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
  // 获取初始化类型：（项目/组件）
  let initType = await getInitType();
  log.verbose('initType', initType);

  // 获取模板列表
  let templateList = await getProjectTemplate();
  if (!templateList || templateList.length === 0) {
    throw new Error('项目模板列表获取失败');
  }

  // 获取项目/组件名称
  let projectName = '';
  let className = '';
  // 获取项目名称
  while (!projectName) {
    projectName = await getProjectName(initType);
    if (projectName) {
      projectName = formatName(projectName); // 格式化为 kebab-case
      className = formatClassName(projectName); // 格式化为 PascalCase
    }
    log.verbose('name', projectName);
    log.verbose('className', className);
  }

  // 获取版本号
  let version = '1.0.0';
  do {
    version = await getProjectVersion(version, initType);
    log.verbose('version', version);
  } while (!version);

  // 返回结果
  if (initType === TYPE_PROJECT) {
    templateList = templateList.filter(item => item.tag.includes('project'));
    return {
      templateList,
      project: {
        name: projectName,
        className,
        version,
      },
    };
  } else {
    templateList = templateList.filter(item => item.tag.includes('component'));
    let description = '';
    while (!description) {
      description = await getComponentDescription();
      log.verbose('description', description);
    }
    return {
      templateList,
      project: {
        name: projectName,
        className,
        version,
        description,
      },
    };
  }
}

function getComponentDescription() {
  return inquirer({
    type: 'string',
    message: '请输入组件的描述信息',
    defaultValue: '',
  });
}

function getProjectVersion(defaultVersion, initType) {
  return inquirer({
    type: 'string',
    message: initType === TYPE_PROJECT ? '请输入项目版本号' : '请输入组件版本号',
    defaultValue: defaultVersion,
  });
}

function getInitType() {
  return inquirer({
    type: 'list',
    choices: [{
      name: '项目',
      value: TYPE_PROJECT,
    }, {
      name: '组件',
      value: TYPE_COMPONENT,
    }],
    message: '请选择初始化类型',
    defaultValue: DEFAULT_TYPE,
  });
}

function getProjectName(initType) {
  return inquirer({
    type: 'string',
    message: initType === TYPE_PROJECT ? '请输入项目名称' : '请输入组件名称',
    defaultValue: '',
  });
}

function createTemplateChoice(list) {
  return list.map(item => ({
    value: item.npmName,
    name: item.name,
  }));
}

module.exports = init;
