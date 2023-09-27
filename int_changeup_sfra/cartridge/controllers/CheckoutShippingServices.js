'use strict';

var server = require('server');

server.extend(module.superModule);

var Locale = require('dw/util/Locale');

var OrderModel = require('*/cartridge/models/order');
var basketHelpers = require('~/cartridge/scripts/helpers/basketHelpers');
var checkoutHelpers = require('~/cartridge/scripts/helpers/checkoutHelpers');


server.append('SelectShippingMethod', server.middleware.https, function (req, res, next) {
    var Transaction = require('dw/system/Transaction');

    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var Donation = require('~/cartridge/scripts/changeUp/donation');
            var changeup = Donation.donationCalculate(basket, true, true);

            if (changeup.agreedToDonate && changeup.donation_type_checkout) {
                if(changeup.donation_type_option ){
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
            }

            res.viewData.order.changeup = changeup;
        });
    }

    return next();
});

server.append('UpdateShippingMethodsList', server.middleware.https, function (req, res, next) {
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;
        var Transaction = require('dw/system/Transaction');
        var HookMgr = require('dw/system/HookMgr');
        var Money = require('dw/value/Money');
        var newAmount = null;
        
        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var Donation = require('~/cartridge/scripts/changeUp/donation');
            
            Transaction.wrap(function () {
                var donationPLI = basket.getProductLineItems('changeup-donation');
    
                if (donationPLI && donationPLI.length) {
                    basket.removeProductLineItem(donationPLI[0]);
                }
    
                HookMgr.callHook('dw.order.calculate', 'calculate', basket);
            });

            var changeup = Donation.donationCalculate(basket, false, false);

            changeup.supersize = (basket.custom.changeupSupersizeAmountCustomer) ? parseFloat(basket.custom.changeupSupersizeAmountCustomer.match(/\d+.\d{2}|0/)[0]) : 0;
            changeup.causeId = (basket.custom.changeupDonationOrgUUID) ? basket.custom.changeupDonationOrgUUID : changeup.config.default_charity.uuid;


            if (changeup.agreedToDonate) {
                newAmount = new Money(changeup.amount_donation + changeup.supersize, session.currency);
            }
            else{
                newAmount = new Money(changeup.supersize, session.currency);
            }

            Transaction.wrap(function () {
                let supersize_amount_formated = new Money(changeup.supersize, session.currency).toFormattedString()

                if(newAmount > 0) {
                    checkoutHelpers.changeupUpdateLineItem(basket, newAmount);
                }
                else{
                    checkoutHelpers.existOrDeleteLineItem(basket);
                }
                HookMgr.callHook('dw.order.calculate', 'calculate', basket);
                basketHelpers.addBasketDonationAttributes(basket, changeup, supersize_amount_formated);
            });

            res.viewData.order = new OrderModel(basket, {
                usingMultiShipping: req.session.privacyCache.get('usingMultiShipping'),
                countryCode: Locale.getLocale(req.locale.id).country,
                containerView: 'basket'
            });
            


            res.viewData.order.changeup = changeup;
            res.viewData.order.supersize = changeup.supersize;
        });

    }

    return next();
});

server.append('SubmitShipping', server.middleware.https, function (req, res, next) {
    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var basket = require('dw/order/BasketMgr').currentBasket;

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var Donation = require('~/cartridge/scripts/changeUp/donation');
            var changeup = Donation.donationCalculate(basket, false, true);
         
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
