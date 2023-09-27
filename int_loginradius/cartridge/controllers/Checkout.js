/* global empty */
'use strict';

// SFCC API includes
var URLUtils = require('dw/web/URLUtils');

// SFRA Includes
var server = require('server');
var assets = require('*/cartridge/scripts/assets');

server.extend(module.superModule);

/**
 * Adds LoginRadius resources and configuration to view for Login-Show controller endpoint.
 */
server.prepend('Login', function (req, res, next) {
    var LoginRadius = require('*/cartridge/models/loginRadius');

    // Get the view data object to append data to.
    var viewData = res.getViewData();
    var loginRadius = new LoginRadius();

    // If LoginRadius is enabled, add the JS resource for LR, and add API key to
    // the view data object.
    if (loginRadius.enabled) {
        assets.addJs(loginRadius.src);
    }

    viewData.loginRadius = loginRadius;
    viewData.loginRadiusForwardingURL = !empty(req.querystring.ppexpress) &&
        req.querystring.ppexpress ?
        URLUtils.https('PaymentOperator-PaypalExpress') :
        URLUtils.https('Checkout-Begin');

    res.setViewData(viewData);

    next();
});

module.exports = server.exports();

