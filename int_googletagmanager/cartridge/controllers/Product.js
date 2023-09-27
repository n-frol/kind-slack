'use strict';

// SFRA Includes
var server = require('server');
var assets = require('*/cartridge/scripts/assets');

var GTM = require('int_googletagmanager/cartridge/scripts/helpers/GTM');

server.extend(module.superModule);

/**
 * Addon function that can be called by both Product-Show and Product-ShowInCategory
 *
 * Adds necessary GTM datalayer resources for Product-Show
 * controller endpoint.
 */
function pdpAddon(req, res, next) {
    // Get the view data object to append data to.
    var viewData = res.getViewData();
    viewData.gtmPageType = 'product';
    res.setViewData(viewData);

    next();
}

server.append('Show', pdpAddon);
server.append('ShowInCategory', pdpAddon);

module.exports = server.exports();
