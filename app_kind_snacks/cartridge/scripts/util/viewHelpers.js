
/* global empty */
'use strict';

/**
 * View Helpers are small snippets of code that can be called in your views to help keep isml DRY
 * i.e. Any code that you are repeating regularly can most likely be moved into a helper.
 *
 * Imported from SiteGenesis - GHG 1/23/19:
 *  - Removed all unused methods when importing.
 *  - Updated to CommonJS module from .ds script.
 */

var CatalogMgr = require('dw/catalog/CatalogMgr');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');
var URLUtils = require('dw/web/URLUtils');

/**
 * Gets a list of online categories that have the showInMenu attribute set to true.
 *
 * @param {dw.catalog.Category} category - Category to get child categories for.
 * @returns {Array<dw.catalog.Category>} - Array of Subcategories for menu.
 */
function getSubcategoriesInMenuForCategory(category) {
    var result = [];

    var psm = new ProductSearchModel();
    psm.setCategoryID(category.getID());
    psm.search();
    var psr = psm.getRefinements();
    var level1 = psr.getNextLevelCategoryRefinementValues(category);

    if (!empty(level1)) {
        level1.toArray().forEach(function (psrv) {
            var subCategory = CatalogMgr.getCategory(psrv.value);
            if (('showInMenu' in subCategory.custom) && subCategory.custom.showInMenu) {
                result.push(subCategory);
            }
        });
    }

    // Check for sub-categories of the category as well as refined categories.
    level1 = category.getOnlineSubCategories();
    if (!empty(level1)) {
        level1.toArray().forEach(function (subCat) {
            if (('showInMenu' in subCat.custom) && subCat.custom.showInMenu) {
                result.push(subCat);
            }
        });
    }

    return result;
}

/**
 * Gets the root level Category in the site catalog.
 *
 * @returns {dw.catalog.Category} - Returns the top level category.
 */
function getTopLevelCategory() {
    var siteCatalog = CatalogMgr.getSiteCatalog();
    var root = null;
    if (siteCatalog != null) {
        root = siteCatalog.getRoot();
    }
    return root;
}

/**
 * calculates rendering information based on the category using subcategory
 * information.
 *
 * @param {dw.catalog.Category} topCat - The top level category used to retrieve
 *      the subcategories layout.
 * @returns {Object} - Returns the layout object.
 */
function getSubCategoriesLayout(topCat) {
    var layout = {};
    var subCategories = getSubcategoriesInMenuForCategory(topCat);
    layout.maxColLength = 5;
    layout.subCategories = subCategories;
    layout.banner = !empty(topCat.custom.headerMenuBanner) ? topCat.custom.headerMenuBanner : undefined;
    layout.hasContent = !!(layout.banner || subCategories.length !== 0);
    if ('headerMenuOrientation' in topCat.custom
        && !empty(topCat.custom.headerMenuOrientation)
        && topCat.custom.headerMenuOrientation === 'Horizontal') {
        layout.horizontal = true;
    }
    return layout;
}

/**
 * Prints out category's alternative url if maintained on custom attribute
 * uses custom attribute of type MarkupText to be able to maintain url-util styled urls - i.e $url('GiftCert-Purchase')$
 *
 * @param {dw.catalog.Category} category - The category to get the URL for.
 * @returns {string|dw.web.URL} - Returns the category URL.
 */
function getCategoryUrl(category) {
    var url = URLUtils.https('Search-Show', 'cgid', category.getID());
    if (('alternativeUrl' in category.custom) && !empty(category.custom.alternativeUrl)) {
        url = category.custom.alternativeUrl;
    }
    return url;
}

module.exports = {
    getCategoryUrl: getCategoryUrl,
    getSubcategoriesInMenuForCategory: getSubcategoriesInMenuForCategory,
    getSubCategoriesLayout: getSubCategoriesLayout,
    getTopLevelCategory: getTopLevelCategory
};
