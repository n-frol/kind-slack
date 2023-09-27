'use strict';

var server = require('server');

server.extend(module.superModule);

var Locale = require('dw/util/Locale');

var OrderModel = require('*/cartridge/models/order');

server.append('SelectShippingMethod', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');
    var selectShippingMethod = true;

    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var changeup = require('~/cartridge/scripts/changeUp/donation')(basket, selectShippingMethod);
            var supersize =  require('~/cartridge/scripts/changeUp/supersize')(changeup, basket, selectShippingMethod);

            if (changeup.agreedToDonate) {
                if(changeup.donation_type_option){
                    var donationPLI = basket.getProductLineItems('changeup-donation');
                    Transaction.wrap(function () {
                        var total = basket.totalGrossPrice.value - donationPLI[0].adjustedGrossPrice;
                        basket.totalGrossPrice.value = total;
                    });
                }
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

server.append('UpdateShippingMethodsList', server.middleware.https, function (req, res, next) {
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var changeup = require('~/cartridge/scripts/changeUp/donation')(basket, false);
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

server.append('SubmitShipping', server.middleware.https, function (req, res, next) {
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var changeup = require('~/cartridge/scripts/changeUp/donation')(basket, false);
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

module.exports = server.exports();
