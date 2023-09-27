const ora = require('ora');
const api = require('../lib/api');
const log = require('../lib/log');

module.exports = async ({
  clientId,
  clientPassword,
  hostname,
  apiVersion,
  codeVersion,
  username,
  password
}) => {
  log.info(`Activating ${codeVersion} on ${hostname}`);
  const spinner = ora().start();

  try {
    const method = 'patch';
    const endpoint = `https://${hostname}/s/-/dw/data/${apiVersion}/code_versions/${codeVersion}`;
    const body = {active: true};
    const contentType = 'application/json';
    spinner.text = 'Activating';
    await api({clientId, clientPassword, method, contentType, endpoint, body,username,password,hostname});
    spinner.succeed();
    log.success('Success');
  } catch (err) {
    spinner.fail();
    log.error(err);
  }
};