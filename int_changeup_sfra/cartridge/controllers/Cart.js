'use strict';

var server = require('server');

server.extend(module.superModule);

server.prepend('MiniCart', function (req, res, next) {
    var basket = require('dw/order/BasketMgr').currentBasket;
    var donationPLI = null;

    if (basket) {
        donationPLI = basket.getProductLineItems('changeup-donation');

        if (donationPLI && donationPLI.length) {
            basket.removeProductLineItem(donationPLI[0]);
        }
    }

    next();
});

server.append('MiniCartShow', function (req, res, next) {
    var config = require('~/cartridge/models/config').getConfig();
        res.setViewData({
            changeup: {
                config: config
               }
        });
    next();
});

server.append('RemoveProductLineItem', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var CartModel = require('*/cartridge/models/cart');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!currentBasket) {
        res.setStatusCode(500);
        res.json({
            error: true,
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        next();
    }

    var isProductLineItemFound = false;
    var bonusProductsUUIDs = [];

    Transaction.wrap(function () {
        if (req.querystring.pid && req.querystring.uuid) {
            var productLineItems = currentBasket.getAllProductLineItems();
            if(req.querystring.pid) {
                currentBasket.custom.changeupAgreedToDonate = false;
            }
            // if there's 1 remaining product
            if(productLineItems.length == 1){
                var item = productLineItems[0];

                // if remaining product is changeup-donation, then it is removed from basket
                if(item.productID == 'changeup-donation'){
                    currentBasket.custom.changeupAgreedToDonate = false;
                    currentBasket.removeProductLineItem(item);
                    isProductLineItemFound = true;
                }
            }
        }
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    if (isProductLineItemFound) {
        var basketModel = new CartModel(currentBasket);
        var basketModelPlus = {
            basket: basketModel,
            toBeDeletedUUIDs: bonusProductsUUIDs
        };
        res.json(basketModelPlus);
    }

    next();
});

server.append(
    'Show',
    server.middleware.https,
    function (req, res, next) {
        var config = require('~/cartridge/models/config').getConfig();
        res.setViewData({
            changeup: {
                config: config
               }
        });
        next();
    }
);

module.exports = server.exports();
