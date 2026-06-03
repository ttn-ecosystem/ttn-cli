"use strict";

const log = require("./log");
const npm = require("./npm");
const file = require("./file");
const request = require("./request");
const spinner = require("./spinner");
const formatPath = require("./formatPath");
const terminalLink = require("./terminalLink");
const inquirer = require('./inquirer');
const locale = require("./Locale/loadLocale");

const Package = require('./Package');

module.exports = {
  log,
  npm,
  locale,
  ...file,
  formatPath,
  request,
  spinner,
  terminalLink,
  Package,
  inquirer,
};
