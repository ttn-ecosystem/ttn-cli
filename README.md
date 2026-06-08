## 前端脚手架工程
ttn-cli 是一个前端脚手架工程，用于快速搭建前端项目。

### 开发调试
1. 安装依赖
```Bash
cd /Users/qiangyujun/Desktop/study/ttn-cli
pnpm install
```
2. 本地链接 CLI
npm link 会在 /usr/local/bin/ttn-cli 创建符号链接，指向 packages/core/bin/ttn-cli.js
```Bash
cd packages/core
pnpm link # 将 ttn-cli 链接为全局命令
```
3. 验证安装
```Bash
ttn-cli -V    # 查看版本
ttn-cli desc  # 查看描述信息
```

### 使用方式
1. 创建项目目录
```Bash
mkdir my-project
cd my-project
```
2. 初始化项目
```Bash
ttn-cli init
```

### 创建一个新lerna包
```Bash
lerna create my-package
```

### ttn-cli 动态加载包的存储方案
针对脚手架运行时动态下载内部依赖包的场景，强烈建议放在用户目录下的全局缓存，而不是项目目录或脚手架安装目录。

- ~/.ttn-cli/template/ 存储模板包
- ~/.ttn-cli/dependencies/ 存储内部依赖包