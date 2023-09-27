const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('List', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Payments list'));

server.prepend('AddPayment', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Add Payment'));

server.prepend('SavePayment', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Save Payment'));

server.prepend('DeletePayment', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.ACCOUNT, 'Delete Payment'));

module.exports = server.exports();
