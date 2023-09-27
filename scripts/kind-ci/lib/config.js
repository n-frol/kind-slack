const fs = require('fs-extra');
const https = require('https');

const merge = require('lodash/merge');
const codeVersion = require('./branch')();

module.exports = argv => {
    const config = merge({ codeVersion }, argv);

  // If webdav isn't provided, fallback to hostname
    config.webdav = config.webdav || config.hostname.trim();
    config.clientId = config.clientId.trim();
    config.clientPassword = config.clientPassword.trim();
    config.apiVersion = config.apiVersion.trim();
    config.username = config.username.trim();
    config.password = config.password.trim();
    config.hostname = config.hostname.trim();
    config.webdav = config.webdav.trim();

    config.request = {
        baseURL: `https://${config.webdav}/on/demandware.servlet/webdav/Sites/`,
        auth: {
            username: config.username.trim(),
            password: config.password.trim()
        },
        httpsAgent: new https.Agent({
            key: config.key ? fs.readFileSync(config.key.trim()) : null,
            cert: config.cert ? fs.readFileSync(config.cert.trim()) : null,
            ca: config.ca ? fs.readFileSync(config.ca.trim()) : null,
            pfx: config.p12 ? fs.readFileSync(config.p12) : null,
            passphrase: config.passphrase ? config.passphrase : null,
            secureProtocol: "TLSv1_2_method"
        })
    };

    return config;
};
