const server = require('server');

server.extend(module.superModule);

const consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.prepend('Show', consentTracking.consent, function (req, res, next) {
    next();
}, GTM.bind("addPageData", GTM.PAGE_TYPE.PDP), GTM.bind('byobLanding'));

server.append('Show', consentTracking.consent, function (req, res, next) {
    next();
}, GTM.bind("setProductDetail"));

server.prepend('PickYourSnacks', function (req, res, next) {
    next();
}, GTM.bind("addPageData", GTM.PAGE_TYPE.PDP));

module.exports = server.exports();
