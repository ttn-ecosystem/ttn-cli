"use strict";

const WebSocket = require("ws");
const log = require("../log");

const WS_SERVER = "ws://localhost:3000/ws";
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
    log.notice("云构建任务准备");
  };
  // 建立云构建连接
  init = () => {
    log.notice("云构建任务初始化开始");
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_SERVER);
      this.ws.on("open", () => {
        log.notice("云构建任务初始化成功");
        resolve();
      });
      this.ws.on("message", (data) => {
        log.notice("云构建任务收到:", JSON.parse(data.toString()).message);
      });
      this.ws.on("close", (code, reason) => {
        log.notice("云构建任务断开:", code, reason.toString());
      });
      this.ws.on("error", (err) => {
        log.error("云构建任务出错:", err.message);
        reject(err);
      });
    })
  };
  build = () => {
    return new Promise((resolve, reject) => {
      // 发送 build 消息
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "build",
          payload: this.options,
        }));
      } else {
        log.error("WebSocket 未连接，无法发送 build 消息");
        reject(new Error("WebSocket 未连接，无法发送 build 消息"));
      }
      this.ws.on("close", (code, reason) => {
        if (code === 1000) {
          log.notice("云构建任务主动断开");
          resolve(true);
        } else {
          log.error("云构建任务异常断开:", code, reason.toString());
          reject(new Error(`云构建任务异常断开: ${code} - ${reason}`));
        }
      });
    });
  };
  // 检查当前版本是否已经发布过了
  checkPublished = async () => {
    return false;
  };
}

module.exports = CloudBuild;
