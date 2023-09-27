'use script';

var server = require('server');
server.extend(module.superModule);

server.append('SubmitPayment', server.middleware.https, function (req, res, next) {
    var Locale = require('dw/util/Locale');

    var OrderModel = require('*/cartridge/models/order');

    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var Donation = require('~/cartridge/scripts/changeUp/donation');
            var changeup = Donation.donationCalculate(basket, false, true);
            var supersize =  require('~/cartridge/scripts/changeUp/supersize')(changeup, basket, false);
            
            if (changeup.agreedToDonate) {
                res.viewData.order = new OrderModel(basket, {
                    usingMultiShipping: req.session.privacyCache.get('usingMultiShipping'),
                    countryCode: Locale.getLocale(req.locale.id).country,
                    containerView: 'basket'
                });
                res.viewData.order.changeup = changeup;
            }
        });
    }

    return next();
});

server.prepend('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();
    // TO-DO
    // Send donation information to DMS
    return next();
});

module.exports = server.exports();
