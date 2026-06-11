"use strict";

const WebSocket = require("ws");
const log = require("../log");

const WS_SERVER = "ws://localhost:3000";
class CloudBuild {
  constructor(options = {}) {
    this.options = options;
    this._timeout = 1200 * 1000; // 20分钟
    this.ws = null;
  }
  timeout = (fn, timeout) => {
    clearTimeout(this.timer);
    log.notice("设置任务超时时间：", `${+timeout / 1000}秒`);
    this.timer = setTimeout(fn, timeout);
  };
  prepare = async () => {
    log.notice("开始云构建任务准备");
  };
  // 建立云构建连接
  init = () => {
    log.notice("开始云构建任务初始化");
    this.ws = new WebSocket(WS_SERVER);
    this.ws.on("open", () => {
      log.notice("云构建任务初始化成功");
    });
    this.ws.on("message", (data) => {
      // data 是 Buffer，要转字符串
      //   log.notice("收到:", data.toString());
    });
    this.ws.on("close", (code, reason) => {
      log.notice("断开:", code, reason.toString());
    });
    this.ws.on("error", (err) => {
      log.error("出错:", err);
    });
  };
}

module.exports = CloudBuild;
