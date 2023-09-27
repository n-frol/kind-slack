const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('Subscribe', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.SUBSCRIBE));

module.exports = server.exports();
