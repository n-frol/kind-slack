/* global empty */

'use strict';

/**
 * PaymentOperator.js
 * @extends int_computop/cartridge/controllers/PaymentOperator.js
 *
 * Provides extended and/or overrides behavoirs of the PaymentOperator
 * controller endpoints from the int_computop cartridge.
 */

// SFCC API imports
var Transaction = require('dw/system/Transaction');

// SFRA module imports
var server = require('server');

// Extend the base controller
server.extend(require('int_computop/cartridge/controllers/PaymentOperator'));

/**
 * Assigns the email address for the basket.customer to the default shipment's
 * shipping address, and appends the stage parameter to the URL for the redirect
 * to go straight to the placeOrder stage of the checkout.
 *
 * @requires dw.system.Transaction
 * @extends PaymentOperator-SuccessPaypalExpress
 */
server.prepend('SuccessPaypalExpress', function (req, res, next) {
    // Append a callback to the route:Redirect event.
    this.on('route:Redirect', function (rReq, rRes) {
        var BasketMgr = require('dw/order/BasketMgr');

        var basket = BasketMgr.getCurrentBasket();
        var redirectUrl = rRes.redirectUrl;
        redirectUrl.append('stage', 'placeOrder');
        rRes.redirectUrl = redirectUrl;

        if (!empty(basket)) {
            var shipment = basket.getDefaultShipment();
            var address = !empty(shipment) ?
                shipment.getShippingAddress() : null;

            // The base implementation sets the returned email address from PayPal
            // to the customer address for the current basket.
            var ppEmail = basket.getCustomerEmail();
            if (!empty(ppEmail)) {
                Transaction.wrap(function () {
                    address.custom.email = ppEmail;
                });
            }
        }
    });

    return next();
});

/**
 * Clears the PayPal order number from the session variable on successful
 * order processing.
 *
 * @extends PaymentOperator-RedirectSuccess
 */
server.append('RedirectSuccess', function (req, res, next) {
    // Clear any stale PayPal session data.
    req.session.privacyCache.set('payPalOrderNumber', null);
    return next();
});

module.exports = server.exports();
