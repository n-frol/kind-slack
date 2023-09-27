const server = require('server');

const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.append('GetSuggestions', function (req, res, next) {
    next();
}, GTM.bind('setProductViewList'));

module.exports = server.exports();
