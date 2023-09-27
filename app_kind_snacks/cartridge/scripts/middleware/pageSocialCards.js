/* global request */

'use strict';

/**
 * pageSocialCards.js
 *
 * Exports a middleware function that can be applied to the Product, Category,
 * Folder, and Content rendering endpoints to add social cards metadata to the
 * response view data.
 */

var SocialCardsModel = require('*/cartridge/models/socialCards');

/* Helper Functions - Not Exported
   ========================================================================== */

/**
 * Gets any social card custom attribute data based off the product specified in
 * the Product-Show request.
 *
 * @param {Object} req - The request model object.
 * @param {Object} res - The response model object.
 */
function getProductViewData(req, res) {
    var qString = req.querystring;
    var viewData = res.getViewData();
    var scViewData = new SocialCardsModel({ currentUrl: request.httpURL });
    var pid = qString.pid;

    if (pid) {
        scViewData.updateMetaFromProduct(pid);
    }

    viewData.socialCardsData = scViewData;
    res.setViewData(viewData);
}

/**
 * Gets any Twitter Card custom attributes from the search criteria objects
 * (content, folder, or category) and populates the response view data with the
 * Social Card metadata for the card meta tags.
 *
 * @param {Object} req - The request model object.
 * @param {Object} res - The response model object.
 */
function getSearchViewData(req, res) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var ContentMgr = require('dw/content/ContentMgr');
    var qString = req.querystring;
    var viewData = res.getViewData();
    var scViewData = new SocialCardsModel({ currentUrl: request.httpURL });
    var cgid = qString.cgid;
    var fdid = qString.fdid;
    var cid = qString.cid;

    if (cgid) {
        var category = CatalogMgr.getCategory(cgid);
        scViewData.updateMetaFromSystemObject(category);
    } else if (fdid) {
        var folder = ContentMgr.getFolder(fdid);
        scViewData.updateMetaFromSystemObject(folder);
    } else if (cid) {
        var content = ContentMgr.getContent(cid);
        scViewData.updateMetaFromSystemObject(content);
    }

    viewData.socialCardsData = scViewData;
    res.setViewData(viewData);
}

/* Exported Middleware Functions
   ========================================================================== */

/**
 * Gets any social card custom attribute data based off of the endpoint of the
 * request, and populates the socialCardsData view data property object with the
 * corresponding values.
 *
 * @param {Object} req - The request model object.
 * @param {Object} res - The response model object.
 * @param {Function} next - The callback to execute the next function in the
 *      middleware chain.
 */
function getSocialCardsData(req, res, next) {
    var path = req.path;

    // Handle the routes with custom twitter card data.
    if (path.indexOf('Search-Show') > -1) {
        getSearchViewData(req, res);
    } else if (path.indexOf('Product-Show') > -1) {
        getProductViewData(req, res);
    } else if (path.indexOf('Page-Show') > -1) {
        getSearchViewData(req, res);
    }

    next();
}

module.exports = getSocialCardsData;
