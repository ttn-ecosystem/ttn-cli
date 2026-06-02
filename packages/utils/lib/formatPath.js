const path = require('path');

/**
 * 格式化路径
 * @param {string} p - 路径字符串
 * @returns {string} - 格式化后的路径字符串
 */
module.exports = function formatPath(p) {
    const sep = path.sep;
    // 如果返回 / 则为 macOS
    if (sep === '/') {
        return p;
    } else {
        return p.replace(/\\/g, '/');
    }
}
