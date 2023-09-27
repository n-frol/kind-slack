const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('SubmitPayment', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.CHECKOUT, 'Review Order'));

server.append('SubmitPayment', function (req, res, next) {
    next();
}, GTM.bind('addPaymentInformations'));

module.exports = server.exports();
