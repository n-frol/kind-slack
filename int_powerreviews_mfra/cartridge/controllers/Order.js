var server = require('server');
var assets = require('*/cartridge/scripts/assets');
var URLUtils = require('dw/web/URLUtils');

server.extend(module.superModule);

server.append('Confirm', function (req, res, next) {
    var viewData = res.getViewData();
    var orderNo = viewData.order.orderNumber;

    assets.addJs('https://static.powerreviews.com/t/v1/tracker.js');
    assets.addJs(URLUtils.https('PowerReviews-Config.js').toString());
    assets.addJs(URLUtils.https('PowerReviews-Analytics.js', 'orderNo', orderNo).toString());

    next();
});

module.exports = server.exports();
