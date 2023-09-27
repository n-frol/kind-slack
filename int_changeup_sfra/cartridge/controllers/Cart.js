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

/**
 * Cart-Show : The Cart-Show endpoint renders the cart page with the current basket
 * @name ChangeUp/Cart-Show
 * @function
 * @memberof Cart
 */
 server.prepend('Show', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    var donationPLI = null;
    if (currentBasket) {
        Transaction.wrap(function () {
            donationPLI = currentBasket.getProductLineItems('changeup-donation');
            if (donationPLI && donationPLI.length) {
                currentBasket.removeProductLineItem(donationPLI[0]);
                basketCalculationHelpers.calculateTotals(currentBasket);
            }

        });
    }
    next();
});

/**
 * Cart-MiniCartShow : The Cart-MiniCartShow is responsible for getting the basket and showing the contents when you hover over minicart in header
 * @name ChangeUp/Cart-MiniCartShow
 * @function
 * @memberof Cart
 */
server.prepend('MiniCartShow', function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var currentBasket = BasketMgr.getCurrentBasket();
    var donationPLI = null;
    if (currentBasket) {
        Transaction.wrap(function () {
            donationPLI = currentBasket.getProductLineItems('changeup-donation');
            if (donationPLI && donationPLI.length) {
                currentBasket.removeProductLineItem(donationPLI[0]);
                basketCalculationHelpers.calculateTotals(currentBasket);
            }

        });
    }
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

    var isProductLineItemFound = true;
    var bonusProductsUUIDs = [];

    Transaction.wrap(function () {
        if (req.querystring.pid && req.querystring.uuid) {
            var productLineItems = currentBasket.getAllProductLineItems();

            // if there's 1 remaining product
            if(productLineItems.length == 1) {
                var item = productLineItems[0];

                // if remaining product is changeup-donation, then it is removed from basket
                if(item.productID == 'changeup-donation'){
                    currentBasket.custom.changeupAgreedToDonate = false;
                    currentBasket.removeProductLineItem(item);
                    isProductLineItemFound = true;
                }
            }
            if(productLineItems.length == 0) {
                isProductLineItemFound = true;
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
    } else {
        res.setStatusCode(500);
        res.json({ errorMessage: Resource.msg('error.cannot.remove.product', 'cart', null) });
    }

    next();
});

module.exports = server.exports();
