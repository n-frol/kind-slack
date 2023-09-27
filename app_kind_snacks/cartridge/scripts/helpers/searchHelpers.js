/* global empty */

'use strict';

var base = module.superModule;

function getFolderData(searchData, model) {
    searchData.template = model.folder.template;
    searchData.folder = model.getFolder();
}

/**
 * Set content search configuration values
 *
 * @param {Object} params - Provided HTTP query parameters
 * @return {Object} - content search instance
 */
function setupContentSearch(params) {
    var ContentSearchModel = require('dw/content/ContentSearchModel');
    var ContentSearch = require('*/cartridge/models/search/contentSearch');
    var apiContentSearchModel = new ContentSearchModel();

    apiContentSearchModel.setRecursiveFolderSearch(true);

    if (!empty(params.q)) {
        apiContentSearchModel.setSearchPhrase(params.q);
    }
    if (!empty(params.fdid)) {
        apiContentSearchModel.setFolderID(params.fdid);
    }

    apiContentSearchModel.search();
    var contentSearchResult = apiContentSearchModel.getContent();
    var count = Number(apiContentSearchModel.getCount());
    var contentSearch = new ContentSearch(contentSearchResult, count, params.q, params.startingPage, null);
    contentSearch.template = '';
    if (apiContentSearchModel.folder) {
        getFolderData(contentSearch, apiContentSearchModel);
    }

    return contentSearch;
}

/**
 * Checks if a product can be showin in the global search
 * @param {string} pid - The ID of the product
 * @param {dw.catalog.ProductSearchModel} productSearch - The current product search model
 * @returns {boolean} - Whether or not the product passes custom logic to be shown
 */
function isShownInGlobalSearch(pid, productSearch) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var Site = require('dw/system/Site');

    var product = ProductMgr.getProduct(pid);
    var isShown = true;

    if (!empty(product) && product.custom.isBlockGlobalSearch) {
        if (!empty(productSearch) && !empty(productSearch.category)) {
            var byobCategoryId = Site.current.getCustomPreferenceValue('byobRootCategoryID');
            var byobCategory = CatalogMgr.getCategory(byobCategoryId);
            var searchCategory = productSearch.category;

            isShown = byobCategoryId === searchCategory.ID || searchCategory.isSubCategoryOf(byobCategory); // Only show globally blocked product on BYOB
        } else {
            isShown = false;
        }
    }

    return isShown;
}

exports.backButtonDetection = base.backButtonDetection;
exports.setupSearch = base.setupSearch;
exports.getCategoryTemplate = base.getCategoryTemplate;
exports.getPageDesignerCategoryPage = base.getPageDesignerCategoryPage;
exports.isShownInGlobalSearch = isShownInGlobalSearch;
exports.setupContentSearch = setupContentSearch;
exports.search = base.search;
exports.applyCache = base.applyCache;
exports.getBannerImageUrl = base.getBannerImageUrl;
