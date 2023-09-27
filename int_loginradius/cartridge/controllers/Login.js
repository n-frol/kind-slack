/* global empty */
'use strict';

/**
 * Login.js
 * Controller file containing endpoint definitions for authenticating existing
 * accounts, and performing related maintanence tasks like reset and forgot
 * password.
 */

// SFCC API Includes
var URLUtils = require('dw/web/URLUtils');

// SFRA Includes
var server = require('server');
var assets = require('*/cartridge/scripts/assets');

server.extend(module.superModule);

/**
 * Adds LoginRadius resources and configuration to view for Login-Show
 * controller endpoint.
 */
server.prepend('Show', function (req, res, next) {
    var LoginRadius = require('*/cartridge/models/loginRadius');

    // Get the view data object to append data to.
    var viewData = res.getViewData();
    var loginRadius = new LoginRadius();
    var lrForwardURL = URLUtils.https('Account-Show');

    // If LoginRadius is enabled, add the JS resource for LR, and add API key to
    // the view data object.
    if (loginRadius.enabled) {
        assets.addJs(loginRadius.src);
    }

    if (!empty(req.querystring.lrforwardurl)) {
        lrForwardURL = decodeURI(req.querystring.lrforwardurl);
    }

    viewData.loginRadius = loginRadius;
    viewData.loginRadiusForwardingURL = lrForwardURL;
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
