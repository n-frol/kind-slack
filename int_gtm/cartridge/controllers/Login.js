const server = require('server');
const GTM = require('*/cartridge/scripts/utils/GTM');

server.extend(module.superModule);

server.prepend('Show', function (req, res, next) {
    const Resource = require('dw/web/Resource');

    const viewData = res.getViewData();
    const gtmLoginSection = !empty(req.querystring.gtmLoginSection) ? req.querystring.gtmLoginSection : Resource.msg('label.header', 'gtm', null);

    viewData.gtmLoginSection = gtmLoginSection;
    res.setViewData(viewData);
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.LOGIN));

server.prepend('Logout', function (req, res, next) {
    next();
}, GTM.bind('addPageData', GTM.PAGE_TYPE.LOGIN));

module.exports = server.exports();
