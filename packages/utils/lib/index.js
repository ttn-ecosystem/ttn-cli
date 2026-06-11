"use strict";

const log = require("./log");
const npm = require("./npm");
const exec = require("./exec");
const file = require("./file");
const Git = require("./Git.js");
const sleep = require("./sleep");
const request = require("./request");
const spinner = require("./spinner");
const formatPath = require("./formatPath");
const terminalLink = require("./terminalLink");
const formatName = require("./formatName");
const inquirer = require('./inquirer');
const locale = require("./Locale/loadLocale");

const Package = require('./Package');
const ejs = require('./ejs');

module.exports = {
  log,
  npm,
  locale,
  ...file,
  formatPath,
  request,
  spinner,
  terminalLink,
  formatName,
  Git,
  inquirer,
  Package,
  ejs,
  exec,
  sleep,
};
