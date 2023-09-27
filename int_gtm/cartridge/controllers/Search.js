const server = require('server');

const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.PLP));

server.append('Show', function (req, res, next) {
    next();
}, GTM.bind('setProductViewList'));

server.prepend('ShowContent', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.FOLDER));

module.exports = server.exports();
