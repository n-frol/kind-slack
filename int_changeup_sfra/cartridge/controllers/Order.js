'use strict';

var server = require('server');

server.extend(module.superModule);

server.append('Confirm', server.middleware.https, function (req, res, next) {
    var Money = require('dw/value/Money');

    var config = require('~/cartridge/models/config').getConfig();
    var merchantDonate = config.donation_type_actor === 'merchant';

    if (require('dw/system/Site').current.preferences.custom.changeupEnabled) {
        var order = require('dw/order/OrderMgr').getOrder(req.querystring.ID, req.querystring.token);
        var amount = null;
        var donationPLI = null;

        if (order.custom.changeupAgreedToDonate) {
            donationPLI = order.getProductLineItems('changeup-donation');

            if (donationPLI && donationPLI.length) {
                amount = donationPLI[0].adjustedGrossPrice;
            } else if (merchantDonate) {
                amount = new Money(order.custom.changeupDonationAmountMerchant.match(/\d+.\d+/)[0], req.session.currency.currencyCode);
            }

            res.setViewData({
                changeup: {
                    config: config,
                    agreedToDonate: merchantDonate || order.custom.changeupAgreedToDonate,
                    amount: amount.toFormattedString(),
                    percentOfTotal: ((amount.value / order.totalGrossPrice.value).toPrecision(2) * 100) + '%'
                }
            });
        }
    }

    next();
});

module.exports = server.exports();
