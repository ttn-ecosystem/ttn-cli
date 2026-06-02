"use strict";

const log = require("./log");
const npm = require("./npm");
const file = require("./file");
const request = require("./request");
const spinner = require("./spinner");
const formatPath = require("./formatPath");
const terminalLink = require("./terminalLink");
const locale = require("./Locale/loadLocale");

module.exports = {
  log,
  npm,
  locale,
  ...file,
  formatPath,
  request,
  spinner,
  terminalLink,
};
