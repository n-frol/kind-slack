/* eslint-disable */
/* global session */ // eslint-disable-line
'use strict';

/**
 * Cart.js
 * @extends app_kind_snacks/cartridge/controllers/Cart.js
 *
 * Extends the behavior for endpoints of the base Cart.js controller.
 */

// SFCC system class imports

// SFCC module imports
var server = require('server');
server.extend(module.superModule);

server.append(
    'Show',
    server.middleware.https,
    function (req, res, next) {
        var Idme = require('*/cartridge/models/idme');
        var idme = new Idme();
        idme.state = "Cart-Show";
        
        var viewData = res.getViewData();
        viewData.idme = idme;

        res.setViewData(viewData);

        return next();
    }
);

module.exports = server.exports();
