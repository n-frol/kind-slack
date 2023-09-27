'use strict';

/**
 * Compare.js
 * @extends plugin_productcompare/cartridge/controllers/Compare.js
 *
 * Extends the default endpoint behavior for adapting the product compare
 * feature for use with the KIND Snacks.
 */

'use strict';

// SFCC API includes
var ContentMgr = require('dw/content/ContentMgr');
var URLUtils = require('dw/web/URLUtils');

// SFRA Includes
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var server = require('server');

server.extend(module.superModule);

/**
 * @extends Compare-Show
 *
 * Adds a list of URLs to be called for removing each product from the compare
 * list, and adds page metadata for the request from a matching content assett.
 */
server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();
    var contentAsset = ContentMgr.getContent('compare-show');
    var pids = viewData.pids;
    var compareProductsForm = req.querystring;
    var removeUrls = {};

    pids.forEach(function (pid) {
        var urlParams = Object.keys(compareProductsForm)
            .filter(function (key) { return key.indexOf('pid') === 0 && compareProductsForm[key] !== pid; })
            .map(function (key) {
                return key + '=' + compareProductsForm[key];
            })
            .join('&');
        removeUrls[pid] = URLUtils.url('Compare-Show', 'cgid', compareProductsForm.cgid, 'backUrl', compareProductsForm.backUrl);
        removeUrls[pid] += '&' + urlParams;
    });

    // Assign the metadata attributes from the content asset.
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }

    viewData.removeUrls = removeUrls;
    viewData.backUrl = compareProductsForm.backUrl + (compareProductsForm.backUrl.indexOf('?') === -1 ? '?' : '&') + 'comparePids=' + pids.join(',') + '#' + pids.join(',');
    viewData.category.id = compareProductsForm.cgid;

    res.setViewData(viewData);

    next();
}, pageMetaData.computedPageMetaData);

module.exports = server.exports();
