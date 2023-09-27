'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('Begin', server.middleware.https, function (req, res, next) {
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var Transaction = require('dw/system/Transaction');
        var Locale = require('dw/util/Locale');
        var basket = require('dw/order/BasketMgr').currentBasket;
        var OrderModel = require('*/cartridge/models/order');
        var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
        var URLUtils = require('dw/web/URLUtils');

        if (basket.allProductLineItems.length == 0) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        var changeup = require('~/cartridge/scripts/changeUp/donation')(basket, false);

        Transaction.wrap(function () {
            basket.custom.changeupDonationOrgUUID = changeup.config.default_charity.uuid;
        });

        res.viewData.changeup = changeup;
        var pli = null;

        pli = basket.getProductLineItems('changeup-donation');

        if (!pli || !pli.length) {
            session.custom.supersize_value = '';
            session.custom.donation_amount = ''; 
        } 
        var supersize_value = session.custom.supersize_value ? session.custom.supersize_value : '';
        if(supersize_value == ''){
            session.custom.donation_amount = changeup.amount_donation;
        }
        res.viewData.changeup.supersize_value = supersize_value;
        var supersize =  require('~/cartridge/scripts/changeUp/supersize')(changeup, basket, false);

        res.viewData.order = new OrderModel(basket, {
            customer: req.currentCustomer.raw,
            usingMultiShipping: req.session.privacyCache.get('usingMultiShipping'),
            shippable: COHelpers.ensureValidShipments(basket),
            countryCode: Locale.getLocale(req.locale.id).country,
            containerView: 'basket'            
        });
    }

    next();
});

module.exports = server.exports();
