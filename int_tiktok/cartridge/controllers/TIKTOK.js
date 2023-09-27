const server = require('server');

server.get('Help', function (req, res, next) {
    const TIKTOK = require('*/cartridge/scripts/utils/TIKTOK');
    if (req.querystring.tiktokPageData) {
        TIKTOK.setPageDataForRender(req.querystring.tiktokPageData, req, res);
    }
    res.render('common/tiktok/tiktok');
    next();
});

module.exports = server.exports();
