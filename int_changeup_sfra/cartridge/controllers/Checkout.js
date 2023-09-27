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
        var basketHelpers = require('~/cartridge/scripts/helpers/basketHelpers');
        var Donation = require('~/cartridge/scripts/changeUp/donation');
        var HookMgr = require('dw/system/HookMgr');
        var Money = require('dw/value/Money');
        var checkoutHelpers = require('~/cartridge/scripts/helpers/checkoutHelpers');

        var pli = null;
        var newAmount = null;

        if (basket.allProductLineItems.length == 0) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        Transaction.wrap(function () {
            var donationPLI = basket.getProductLineItems('changeup-donation');

            if (donationPLI && donationPLI.length) {
                basket.removeProductLineItem(donationPLI[0]);
            }

            HookMgr.callHook('dw.order.calculate', 'calculate', basket);
        });

        var changeup = Donation.donationCalculate(basket, false, false);
        var amountSalesUplift = Donation.calculateDonationSalesUplift(basket);
        
        changeup['amountSalesUplift'] = amountSalesUplift.toFormattedString();
        
        basketHelpers.addBasketUpliftAttributes(basket, changeup);
        
        if (changeup.config){
            Transaction.wrap(function () {

                changeup.config.sales_uplift_headline_formatted = changeup.config.sales_uplift_headline.split('X%')[0] + changeup.config.salesuplift_donation + '%' + changeup.config.sales_uplift_headline.split('X%')[1]

                if (changeup.config.donation_type_checkout && !basket.custom.changeupDonationOrgUUID) {
                    basket.custom.changeupDonationOrgUUID = changeup.config.default_charity.uuid;
                } 
                if (changeup.config.donation_type_salesUplift && !basket.custom.changeupDonationSalesUpliftOrgUUID ){
                    basket.custom.changeupDonationSalesUpliftOrgUUID = changeup.config.default_charity.uuid;
                }       
            });
        }

        res.viewData.changeup = changeup;

        pli = basket.getProductLineItems('changeup-donation');

        if (!pli || !pli.length) {
            session.custom.supersize_value = '';
            session.custom.donation_amount = ''; 
            res.viewData.changeup.grossWithoutDonation = basket.totalGrossPrice.value;
        }
        else{
            res.viewData.changeup.grossWithoutDonation = basket.totalGrossPrice.value - pli[0].basePrice.value;
        }
        
        var supersize_value = session.custom.supersize_value ? session.custom.supersize_value : '';
        changeup.supersize = supersize_value;

        if(supersize_value == ''){
            session.custom.donation_amount = changeup.amount_donation;
        }

        res.viewData.changeup.supersize_value = supersize_value;
        res.viewData.changeup.changeupSupersizeAmountCustomer = basket.custom.changeupSupersizeAmountCustomer
        
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
