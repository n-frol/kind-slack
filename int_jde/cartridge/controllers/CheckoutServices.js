'use strict';

/**
 * CheckoutServices.js
 *
 * @extends app_storefront_base/cartridge/controllers/CheckoutServices.js
 * Extends the base functionality for endpoints in the CheckoutServices.js controller.
 */

// SFRA module imports
var server = require('server');

// Extend the base controller
server.extend(module.superModule);

/**
 * Appends the base functionality of the endpoint by appending JRE attributes to
 * the parts of the order.
 */
server.prepend('PlaceOrder', function (req, res, next) {
    var CustomOrderHelpers = require(
        '*/cartridge/scripts/checkout/customOrderHelpers');
    CustomOrderHelpers.addJDEAttributesToBasket();
    this.on('route:BeforeComplete', CustomOrderHelpers.addJDEAttributesToOrder);

    return next();
});

module.exports = server.exports();
