'use strict';

/**
 * Account.js
 * @extends app_storefront_base/cartridge/controllers/Account.js
 *
 * Provides extending and overriding of app_storefront_base endpoints for the
 * Account.js controller.
 */

// SFCC system class imports
var ContentMgr = require('dw/content/ContentMgr');

// SFCC module imports
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var server = require('server');

server.extend(module.superModule);

/**
 * Adds metadata for the the page title, page description, & SEO keywords to the
 * response's view-data before rendering the page to the client.
 *
 * @param {Object} req - The request wrapper object.
 * @param {Function} next - The next method in the middleware chain.
 * @param {string} assetName - The name of the myaccount content asset after the
 *      'myaccount-' prefix.
 */
function setResponseMeta(req, next, assetName) {
    var contentAsset = ContentMgr.getContent('myaccount-' + assetName);
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }
    next();
}

/**
 * @extends Account-Show
 *
 * Adds page metadata to the Account-Show web page.
 */
server.append('Show', function (req, res, next) {
    setResponseMeta(req, next, 'home');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Account-EditProfile
 *
 * Adds page metadata to the Account-EditProfile web page.
 */
server.append('EditProfile', function (req, res, next) {
    setResponseMeta(req, next, 'personaldata');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Account-PasswordReset
 *
 * Adds page metadata to the Account-PasswordReset web page.
 */
server.append('PasswordReset', function (req, res, next) {
    setResponseMeta(req, next, 'personaldata');
}, pageMetaData.computedPageMetaData);

/**
 * @extends Account-SetNewPassword
 *
 * Adds page metadata to the Account-PasswordReset web page.
 */
server.append('SetNewPassword', function (req, res, next) {
    setResponseMeta(req, next, 'personaldata');
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();
