/* eslint-disable */
'use strict';

var base = module.superModule ||
    require('app_kind_snacks/cartridge/models/search/productSearch');
var collections = require('*/cartridge/scripts/util/collections');
var ProductSortOptions = require('*/cartridge/models/search/productSortOptions');
var urlHelper = require('*/cartridge/scripts/helpers/urlHelpers');

var DEFAULT_PAGE_SIZE = 12;

/**
 * Configures and returns a PagingModel instance
 *
 * @param {dw.util.Iterator} productHits - Iterator for product search results
 * @param {number} count - Number of products in search results
 * @param {number} pageSize - Number of products to display
 * @param {number} startIndex - Beginning index value
 * @return {dw.web.PagingModel} - PagingModel instance
 */
function getPagingModel(productHits, count, pageSize, startIndex) {
    var PagingModel = require('dw/web/PagingModel');
    var paging = new PagingModel(productHits, count);

    paging.setStart(startIndex || 0);
    paging.setPageSize(pageSize || DEFAULT_PAGE_SIZE);

    return paging;
}

/**
 * Generates URL for [Show] More button
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @return {string} - More button URL
 */
function getShowMoreUrl(productSearch, httpParams) {
    var showMoreEndpoint = 'Search-UpdateGrid';
    var currentStart = httpParams.start || 0;
    var pageSize = httpParams.sz || DEFAULT_PAGE_SIZE;
    var hitsCount = productSearch.count;
    var nextStart;

    var paging = getPagingModel(
        productSearch.productSearchHits,
        hitsCount,
        pageSize,
        currentStart
    );

    if (pageSize > hitsCount) {
        return '';
    } else if (pageSize > DEFAULT_PAGE_SIZE) {
        nextStart = pageSize;
    } else {
        var endIdx = paging.getEnd();
        nextStart = endIdx + 1 < hitsCount ? endIdx + 1 : null;

        if (!nextStart) {
            return '';
        }
    }

    paging.setPageSize(DEFAULT_PAGE_SIZE);
    paging.setStart(nextStart);

    var baseUrl = productSearch.url(showMoreEndpoint);
    var finalUrl = paging.appendPaging(baseUrl);
    return finalUrl;
}

/**
 * Forms a URL that can be used as a permalink with filters, sort, and page size preserved
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {number} pageSize - 'sz' query param
 * @param {number} startIdx - 'start' query param
 * @return {string} - Permalink URL
 */
function getPermalink(productSearch, pageSize, startIdx) {
    var showMoreEndpoint = 'Search-Show';
    var params = { start: '0', sz: pageSize + startIdx };
    var url = productSearch.url(showMoreEndpoint).toString();
    var appended = urlHelper.appendQueryParams(url, params).toString();
    return appended;
}

/**
 * Forms an array of Marketing Tiles position coordinates
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @return {Array} returns an array of marketing tiles coordinates
 */
function getMarketingTilesPosition(productSearch) {
    var categoryCustomAttributes = productSearch.category.custom;
    var marketingTiles = [];
    marketingTiles.push(categoryCustomAttributes.marketingTileAPosition);
    marketingTiles.push(categoryCustomAttributes.marketingTileBPosition);
    marketingTiles.push(categoryCustomAttributes.marketingTileCPosition);
    return marketingTiles;
}

/**
 * Forms an array of Marketing Tiles coordinates taking into account paging
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @return {Array} returns an array of marketing tiles coordinates within current page
 */
function getMarketingTiles(productSearch, httpParams) {
    var pageSize = parseInt(httpParams.sz, 10) || DEFAULT_PAGE_SIZE;
    var currentStart = httpParams.start || 0;
    var hitsCount = productSearch.count;

    var marketingTilesPosition = getMarketingTilesPosition(productSearch);

    var paging = getPagingModel(
        productSearch.productSearchHits,
        hitsCount,
        pageSize,
        currentStart
    );

    var marketingTiles = marketingTilesPosition.map(function (tilePosition, index) {
        var tileIndex = tilePosition - 1;
        if (tilePosition && tileIndex >= currentStart && tileIndex <= paging.getEnd()) {
            --pageSize;
            return tilePosition - currentStart - index;
        }
        return null;
    });

    httpParams.sz = pageSize.toString();
    return marketingTiles;
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

/**
 * @constructor
 * @classdesc ProductSearch class
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @param {string} sortingRule - Sorting option rule ID
 * @param {dw.util.ArrayList.<dw.catalog.SortingOption>} sortingOptions - Options to sort search
 *     results
 * @param {dw.catalog.Category} rootCategory - Search result's root category if applicable
 */
function ProductSearch(productSearch, httpParams, sortingRule, sortingOptions, rootCategory) {
    var ArrayList = require('dw/util/ArrayList');

    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');

    base.call(this, productSearch, httpParams, sortingRule, sortingOptions, rootCategory);

    if (productSearch.category) {
        this.category.marketingTiles = getMarketingTiles(productSearch, httpParams);
        this.category.isConfigurationCategory = productSearch.category.custom.isConfigurationCategory || false;
    }

    var showProductSearchHits = collections.reduce(productSearch.productSearchHits.asList(), function (filteredItems, item) {
        if (isShownInGlobalSearch(item.productID, productSearch)) {
            filteredItems.push(item);
        }

        return filteredItems;
    }, new ArrayList());

    this.pageSize = parseInt(httpParams.sz, 10) || DEFAULT_PAGE_SIZE;
    var startIdx = httpParams.start || 0;

    // The the shown product hits are less than that of the intitial search, re-search so the data is up-to-date
    if (showProductSearchHits.length !== productSearch.count) {
        this.count = showProductSearchHits.length;
    }

    var paging = getPagingModel(
        showProductSearchHits.iterator(),
        this.count,
        this.pageSize,
        startIdx
    );

    this.pageNumber = paging.currentPage;
    this.productIds = collections.map(paging.pageElements, function (item) {
        return {
            productID: item.productID,
            productSearchHit: item
        };
    });
    this.productSort = new ProductSortOptions(
        productSearch,
        sortingRule,
        sortingOptions,
        rootCategory,
        paging
    );
    this.showMoreUrl = getShowMoreUrl(productSearch, httpParams);
    this.permalink = getPermalink(
        productSearch,
        parseInt(this.pageSize, 10),
        parseInt(startIdx, 10)
    );
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

module.exports = ProductSearch;
