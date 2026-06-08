const { request } = require('@ttn-cli/utils');

module.exports = function() {
  return request({
    url: '/project/template',
  });
};
