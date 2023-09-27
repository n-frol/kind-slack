'use strict';

// SFRA Includes
var server = require('server');
var assets = require('*/cartridge/scripts/assets');

server.extend(module.superModule);

/**
 * Adds necessary GTM datalayer resources for Cart-Show
 * controller endpoint.
 */
server.append('Show', function (req, res, next) {
    // Get the view data object to append data to.
    var viewData = res.getViewData();
    viewData.gtmPageType = 'cart';
    res.setViewData(viewData);

    next();
});

module.exports = server.exports();

