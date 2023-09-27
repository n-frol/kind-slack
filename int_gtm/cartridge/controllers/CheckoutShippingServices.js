const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('SubmitShipping', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CHECKOUT, 'Payment'));

server.append('SubmitShipping', function (req, res, next) {
    next();
}, GTM.bind('addShippingInformations'));

module.exports = server.exports();
