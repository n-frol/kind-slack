'use strict';

/**
 * Login.js
 * @extends app_sotrefront_base/cartridge/controllers/Login.js
 *
 * Extends the base behavior of the Login.js controller endpoints.
 */

// SFCC system class imports
const ContentMgr = require('dw/content/ContentMgr');
const Site = require('dw/system/Site');
const currentSite = Site.getCurrent();

// SFCC module imports
const pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
const pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
const server = require('server');

server.extend(module.superModule);

/**
 * @extends Cart-Show
 *
 * Adds page metadata from the myaccount-login content asset for the
 * Login-Show endpoint.
 */
server.append('Show', function (req, res, next) {
    let contentAsset = ContentMgr.getContent('myaccount-login');
    if (currentSite.ID === "CreativeSnacks") {
        contentAsset = ContentMgr.getContent('myaccount-login-cs');
    }
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }
    next();
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();
