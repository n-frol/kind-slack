'use script';

var server = require('server');
server.extend(module.superModule);

server.append('SubmitPayment', server.middleware.https, function (req, res, next) {
    var Locale = require('dw/util/Locale');

    var OrderModel = require('*/cartridge/models/order');

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

server.prepend('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var currentBasket = BasketMgr.getCurrentBasket();

    /** ChangeUp Injection */
    var changeup = require('~/cartridge/scripts/changeUp/donation')(currentBasket, false);
    var supersize =  require('~/cartridge/scripts/changeUp/supersize')(changeup, currentBasket, false);

    Transaction.wrap(function () {
        var supersize_amount = '';
        if(supersize){
            var pli = null;
            pli = currentBasket.getProductLineItems('changeup-donation');
            if (pli || pli.length) {
                pli = pli[0];
            }
            supersize_amount = pli.adjustedGrossPrice.toFormattedString();
        }
        switch (changeup.config.donation_type_actor) {
            case 'customer':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                    currentBasket.custom.changeupAgreedToDonate = true;
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = changeup.amount;
                }
                currentBasket.custom.changeupDonationAmountMerchant = '0';
                break;
            case 'merchant':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = '0';
                }
                currentBasket.custom.changeupDonationAmountMerchant = changeup.amount;
                currentBasket.custom.changeupAgreedToDonate = true;
                break;
            case 'match':
                if(supersize_amount != ''){
                    currentBasket.custom.changeupDonationAmountCustomer = supersize_amount
                    currentBasket.custom.changeupAgreedToDonate = true;
                } else{
                    currentBasket.custom.changeupDonationAmountCustomer = changeup.amount;
                }
                currentBasket.custom.changeupDonationAmountMerchant = changeup.amount;
                break;
            default:
                break;
        }
    });

    return next();
});

module.exports = server.exports();
