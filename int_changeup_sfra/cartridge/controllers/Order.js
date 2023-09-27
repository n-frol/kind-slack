'use strict';

var server = require('server');

server.extend(module.superModule);
var CaptureReporting = require('bm_changeup/cartridge/scripts/services/captureReporting');
var prefs = require('dw/system/Site').current.preferences.custom;
var orderMgr = require('dw/order/OrderMgr');

server.append('Confirm', server.middleware.https, function (req, res, next) {
    var Money = require('dw/value/Money');

    var config = require('~/cartridge/models/config').getConfig();
    if(config){
        var merchantDonate = config.donation_type_actor === 'merchant';
        var salesUplift = config.donation_type_salesUplift;
        var checkout = config.donation_type_checkout;

        if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
            var order = require('dw/order/OrderMgr').getOrder(req.form.orderID, req.form.orderToken);
            var amount = null;
            var amountSalesUplift = null;
            var donationPLI = null;

            donationPLI = order.getProductLineItems('changeup-donation');
            
            if (donationPLI && donationPLI.length) {
                amount = donationPLI[0].adjustedGrossPrice;
            } else if (merchantDonate && checkout) {
                amount = new Money(order.custom.changeupDonationAmountMerchant.match(/\d+.\d+/)[0], req.session.currency.currencyCode);
            }else{
                amount = '';
            }
            if(salesUplift){
                amountSalesUplift = new Money(order.custom.changeupDonationAmountMerchantSalesUplift.match(/\d+.\d+/)[0], req.session.currency.currencyCode);
            } else{
                amountSalesUplift = '';
            }

            config['sales_uplift_headline_formatted'] = config.sales_uplift_headline.split('X%')[0] + config.salesuplift_donation + '%' + config.sales_uplift_headline.split('X%')[1]

            if (prefs.changeupEnabled && prefs.widgetChangeUpEnable) {
                CaptureReporting.sendOrderDMS(order);
            }
            else {
                CaptureReporting.sendOrder(order);
            }

            res.setViewData({
                changeup: {
                    config: config,
                    agreedToDonate: merchantDonate || order.custom.changeupAgreedToDonate,
                    amountSalesUplift: amountSalesUplift != '' ? amountSalesUplift.toFormattedString() : '',
                    amount: amount != '' ? amount.toFormattedString() : '',
                    percentOfTotal: ((amount.value / order.totalGrossPrice.value).toPrecision(2) * 100) + '%'
                }
            });
        }
    }

    next();
});

module.exports = server.exports();
