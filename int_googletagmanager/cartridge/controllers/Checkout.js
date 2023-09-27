
'use strict';

// SFRA Includes
var server = require('server');
var assets = require('*/cartridge/scripts/assets');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var Locale = require('dw/util/Locale');
var OrderModel = require('*/cartridge/models/order');
var CartModel = require('*/cartridge/models/cart');

var GTM = require('int_googletagmanager/cartridge/scripts/helpers/GTM');

server.extend(module.superModule);

/**
 * Adds necessary GTM datalayer resources for Product-Show
 * controller endpoint.
 */
server.append('Login',
    server.middleware.https,
    consentTracking.consent,
    csrfProtection.generateToken,
    function (req, res, next) {
        var currentBasket = BasketMgr.getCurrentBasket();
        if (!currentBasket) {
            res.redirect(URLUtils.url('Cart-Show'));
            return next();
        }

        var currentCustomer = req.currentCustomer.raw;
        var currentLocale = Locale.getLocale(req.locale.id);

        if (currentBasket.shipments.length <= 1) {
            req.session.privacyCache.set('usingMultiShipping', false);
        }

        var usingMultiShipping = req.session.privacyCache.get('usingMultiShipping');

        // Loop through all shipments and make sure all are valid
        var allValid = COHelpers.ensureValidShipments(currentBasket);

        var orderModel = new OrderModel(
            currentBasket,
            {
                customer: currentCustomer,
                usingMultiShipping: usingMultiShipping,
                shippable: allValid,
                countryCode: currentLocale.country,
                containerView: 'basket'
            }
        );

        var viewData = res.getViewData();
        viewData.order = orderModel;
        res.setViewData(viewData);

        next();
    }
);

/**
 * Adds necessary GTM datalayer resources for Checkout-Begin
 * controller endpoint.
 */
server.append('Begin', function (req, res, next) {
    // Get the view data object to append data to.
    var viewData = res.getViewData();
    viewData.gtmPageType = 'cart';

    var currentBasket = BasketMgr.getCurrentBasket();
    var basketModel = new CartModel(currentBasket);
    viewData.items = basketModel.items;
    viewData.totals = basketModel.totals;

    res.setViewData(viewData);

    next();
});
module.exports = server.exports();
