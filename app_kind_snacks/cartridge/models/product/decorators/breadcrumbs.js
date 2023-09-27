/* global empty */
'use strict';

var URLUtils = require('dw/web/URLUtils');
var CatalogMgr = require('dw/catalog/CatalogMgr');

/**
 * Creates the breadcrumbs object
 * @param {string} cgid - category ID from navigation and search
 * @param {string} product - product ID
 * @param {Array} breadcrumbs - array of breadcrumbs object
 * @returns {Array} an array of breadcrumb objects
 *
 * Pulled in from SFRA Product.js and modified
 */
function getAllBreadcrumbs(cgid, product, breadcrumbs) {
    var category;

    if (!empty(product)) {
        category = product.variant
            ? product.masterProduct.primaryCategory
            : product.primaryCategory;
    } else if (!empty(cgid)) {
        category = CatalogMgr.getCategory(cgid);
    }

    if (!empty(category) && breadcrumbs && !empty(breadcrumbs.push)) {
        breadcrumbs.push({
            htmlValue: category.displayName,
            url: URLUtils.url('Search-Show', 'cgid', category.ID)
        });

        if (!empty(category.parent) && !empty(category.parent.ID) && category.parent.ID !== 'root') {
            return getAllBreadcrumbs(category.parent.ID, null, breadcrumbs);
        }
    }

    return breadcrumbs;
}

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'breadcrumbs', {
        enumerable: true,
        writable: true,
        value: getAllBreadcrumbs(null, apiProduct, [])
    });
};
