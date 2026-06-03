const inquirer = require("inquirer");

module.exports = function ({
  choices,          // 选项列表（用于 list 类型）
  defaultValue,     // 默认值
  message,          // 提示信息
  type = "list",    // 输入类型，默认为 list
  require = true,   // 是否必填，默认为 true
  mask = "*",       // 密码掩码，默认为 *
  validate,         // 验证函数
  pageSize = 10,    // 分页大小，默认为 10
  loop = false,     // 是否循环选择
}) {
  const options = {
    type,
    name: "name",
    message,
    default: defaultValue,
    require,
    mask,
    validate,
    pageSize,
    loop,
  };
  if (type === "list") {
    options.choices = choices;
  }
  return inquirer.prompt(options).then((answer) => answer.name);
};

/**
 * 使用示例
 * 
 * 基础列表选择
 * const answer = await inquirer({
        message: '请选择一个选项',
        choices: ['选项A', '选项B', '选项C'],
   });
 * 
 * 输入框
 * const name = await inquirer({
        type: 'input',
        message: '请输入姓名',
        defaultValue: '张三',   
    });
 * 
 * 密码输入
 * const password = await inquirer({
        type: 'password',
        message: '请输入密码',
        mask: '*',  // 可自定义掩码字符
    });
 * 
 * 带验证的输入
 * const email = await inquirer({
        type: 'input',
        message: '请输入邮箱',
        validate: (value) => {
            const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            return isValid ? true : '请输入有效的邮箱地址';
        },
    });
 * 
 * 确认框
 * const confirm = await inquirer({
        type: 'confirm',
        message: '确定要删除吗？',
        defaultValue: false,
    });
 */
