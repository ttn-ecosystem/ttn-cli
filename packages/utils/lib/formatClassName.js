function formatClassName(name) {
  return require('kebab-case')(name).replace(/^-/, '');
}

module.exports = formatClassName;