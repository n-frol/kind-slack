const server = require('server');

server.get('Help', function (req, res, next) {
    const GTM = require('*/cartridge/scripts/utils/GTM');
    if (req.querystring.gtmPageData) {
        GTM.setPageDataForRender(req.querystring.gtmPageData, req, res);
    }
    res.render('common/gtm/gtm');
    next();
});

module.exports = server.exports();