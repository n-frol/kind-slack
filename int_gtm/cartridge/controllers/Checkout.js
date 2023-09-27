const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('Login', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CHECKOUT, 'Login'));

server.prepend('Begin', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CHECKOUT, 'Shipping'));

server.append('Begin', function (req, res, next) {
    next();
}, GTM.bind('setCheckoutDetails'));
module.exports = server.exports();
