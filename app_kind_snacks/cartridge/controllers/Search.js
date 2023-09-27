/* global session */
'use strict';

var CatalogMgr = require('dw/catalog/CatalogMgr');
var Site = require('dw/system/Site');

var server = require('server');
server.extend(module.superModule);

var URLUtils = require('dw/web/URLUtils');
var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
var cache = require('*/cartridge/scripts/middleware/cache');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var ProductSearch = require('*/cartridge/models/search/productSearch');
var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');
var socialCards = require('*/cartridge/scripts/middleware/pageSocialCards');

function handleSwap(req, res, next) {
    var byobTemplate = 'rendering/category/swapConfiguration';
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var apiProductSearch = new ProductSearchModel();
    var currentCategory = CatalogMgr.getCategory("byob");
    var par = req.querystring;
    var reflink = par.ref;
    par.cgid = "byob";
    apiProductSearch.setCategoryID(currentCategory.ID);

    var currentCategoryParent = currentCategory.getParent() ? currentCategory.getParent().ID : null;
    apiProductSearch = searchHelper.setupSearch(apiProductSearch, par);
    apiProductSearch.search();

    par.sz = apiProductSearch.count + 1;

    // Append metadata title to category search with no template.

    var productSearch = new ProductSearch(
        apiProductSearch,
        par,
        par.srule,
        CatalogMgr.getSortingOptions(),
        currentCategory
    );

    var viewData = res.viewData;
    viewData.isSwap = true;
    viewData.isByob = false;

    var productsPerCategory = {};

    productSearch.productIds.forEach(function (p) {
        if (p.productSearchHit.product.getPrimaryCategory()) {
            if (!productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID]) {
                productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID] = [];
            }
            productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID].push(p);
        }
    });

    var subCategories = currentCategoryParent === 'byob' ? [currentCategory] : apiProductSearch.category.onlineSubCategories.toArray();

    var byobProducts = subCategories.map(function (subCategory) {
        if (productsPerCategory[subCategory.ID]) {
            return {
                category: {
                    id: subCategory.ID,
                    name: subCategory.displayName
                },

                products: productsPerCategory[subCategory.ID]

            };
        }
        return false;
    });

    productSearch.productIds = byobProducts;
    viewData.productSearch = productSearch;

    viewData.reflink = reflink;

    res.setViewData(viewData);

    res.render(byobTemplate, req.viewData);
    return next(); // Linter requires something be returned
}

/**
 * Replaces the rendering of the search template for BYOB pages
 *
 * @param {Object} req - Standard controller req object
 * @param {Object} res - Standard controller res object
 * @param {Object} next - Standard controller next object
 * @param {dw.catalog.ProductSearchModel} apiProductSearchIn - Active DWRE product search model
 * @returns {*} - If the function redirects, it returns next(), as is standard for controllers.
 */
function overrideByobTemplate(req, res, next, apiProductSearchIn) {
    var ProductList = require('dw/customer/ProductList');
    var ProductListMgr = require('dw/customer/ProductListMgr');

    var ProductListModel = require('*/cartridge/models/product/productList');
    var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
    var byobBoxMasterId = Site.current.getCustomPreferenceValue('byobMasterProductID');
    var params = req.querystring;
    var byobTemplate = 'rendering/category/byobConfiguration';
    var categoryParam = params.cgid;
    var categoryTemplate = '';
    var currentCategory = !empty(categoryParam) ?
        CatalogMgr.getCategory(categoryParam) : null;
    var currentCategoryParent = currentCategory.getParent() ? currentCategory.getParent().ID : null;
    var isAjax = Object.hasOwnProperty.call(req.httpHeaders, 'x-requested-with') &&
        req.httpHeaders['x-requested-with'] === 'XMLHttpRequest';
    var resultsTemplate = byobTemplate;
    var viewData = res.getViewData();
    // increase page size just for PLP
    if (!params.sz) {
        params.sz = apiProductSearchIn.count + 1;
    }

    // Variable definitely gets used conditionally, so linter has no right to complain
    var reportingURLs; // eslint-disable-line no-unused-vars

    // Set the category of the ProductSearchModel class to narrow the
    // results to only BYOB configured category.
    apiProductSearchIn.setCategoryID(currentCategory.ID);
    var apiProductSearch = searchHelper.setupSearch(apiProductSearchIn, params);
    apiProductSearch.search();
    categoryTemplate = searchHelper.getCategoryTemplate(apiProductSearch);

    var productSearch = new ProductSearch(
        apiProductSearch,
        params,
        params.srule,
        CatalogMgr.getSortingOptions(),
        currentCategory
    );

    var productsPerCategory = {};

    productSearch.productIds.forEach(function (p) {
        if (p.productSearchHit.product.getPrimaryCategory()) {
            if (!productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID]) {
                productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID] = [];
            }
            productsPerCategory[p.productSearchHit.product.getPrimaryCategory().ID].push(p);
        }
    });

    var subCategories = currentCategoryParent === 'byob' ? [currentCategory] : apiProductSearchIn.category.onlineSubCategories.toArray();

    var byobProducts = subCategories.map(function (subCategory) {
        if (productsPerCategory[subCategory.ID]) {
            return {
                category: {
                    id: subCategory.ID,
                    name: subCategory.displayName
                },

                products: productsPerCategory[subCategory.ID]

            };
        }
        return false;
    });

    productSearch.productIds = byobProducts;
    viewData.productSearch = productSearch;
    viewData.activeStep = 3;

    pageMetaHelper.setPageMetaTags(req.pageMetaData, productSearch);

    // If this is a BYOB search set the flag on the product search model &
    // set the category search rendering template.
    productSearch.isBYOBSearch = true;
    categoryTemplate = byobTemplate;

    // Check if there is an existing list BYOB list set.
    if (empty(session.custom.currentByobId)) {
        // Get product lists of type: ProductList.TYPE_CUSTOM_1
        var pListCollection = ProductListMgr.getProductLists(
            session.customer,
            ProductList.TYPE_CUSTOM_1
        );

        // Loop through the customer's product lists to find the BYOB
        // list if it exists.
        if (!empty(pListCollection)) {
            pListCollection.toArray().forEach(function (pList) {
                if (!empty(pList.custom.isAddedToCart) &&
                    pList.custom.isAddedToCart === false
                ) {
                    session.custom.currentByobId = pList.ID;
                }
            });
        }
    }

    var currentBYOBBoxId = session.custom.currentByobId;

    // If no list is found then redirect to the container product page
    // so the customer can create one.
    if (empty(currentBYOBBoxId) && !empty(byobBoxMasterId)) {
        res.redirect(URLUtils.https('Product-Show', 'pid', byobBoxMasterId));
        return next();
    }

    var byobList = BYOBHelpers.getBYOBList(session.customer);
    var plModel = new ProductListModel(byobList);
    viewData.byobList = plModel;

    if (productSearch.searchKeywords !== null &&
        !productSearch.selectedFilters.length
    ) {
        reportingURLs = reportingUrlsHelper
            .getProductSearchReportingURLs(productSearch);
    }

    if (productSearch.isCategorySearch
        && !productSearch.isRefinedCategorySearch
        && categoryTemplate
        && apiProductSearch.category.parent.ID === 'root'
    ) {
        pageMetaHelper.setPageMetaData(req.pageMetaData,
            productSearch.category);

        if (isAjax) {
            res.render(resultsTemplate, viewData);
        } else {
            res.render(categoryTemplate, viewData);
        }
    } else {
        res.render(resultsTemplate, viewData);
    }

    return next(); // Linter requires something be returned
}

/**
 * Used to render a content asset.
 */
server.get('ShowContent',
    cache.applyShortPromotionSensitiveCache,
    consentTracking.consent,
    function (req, res, next) {
        // SFCC API imports
        var ContentMgr = require('dw/content/ContentMgr');
        var Logger = require('dw/system/Logger');

        // Model & Helper imports
        var FolderModel = require('*/cartridge/models/folder');

        var contentSearch = searchHelper.setupContentSearch(req.querystring);
        var canonicalURL = URLUtils.https('Search-ShowContent');

        if (!empty(req.querystring.fdid)) {
            // If they've passed in a folder ID, use our folder model to get
            // subfolders as well.

            var apiFolder = ContentMgr.getFolder(req.querystring.fdid);

            if (!empty(apiFolder)) {
                var folder = new FolderModel(apiFolder);

                pageMetaHelper.setPageMetaData(req.pageMetaData, folder);

                if (!empty(folder.template)) {
                    canonicalURL.append('fdid', apiFolder.ID);
                    res.render(folder.template, {
                        folder: folder,
                        contentSearch: contentSearch,
                        canonicalURL: canonicalURL
                    });
                } else {
                    Logger.warn('Library Folder with ID {0} is offline',
                        req.querystring.fdid);
                    res.render('/components/content/offlineContent');
                }
            } else {
                Logger.warn('Library Folder with ID {0} was included but not found',
                    req.querystring.fdid);
            }
        } else {
            // otherwise, do a normal content search. Doesn't need page metadata
            // because it's an Ajax response.
            res.render(!empty(contentSearch.template) ? contentSearch.template :
                '/search/contentGrid', {
                    contentSearch: contentSearch,
                    canonicalURL: canonicalURL
                });
        }

        return next();
    },
    pageMetaData.computedPageMetaData
);

/**
 * @extends Search-Show
 *
 * Extends the base Search-Show endpoint to do the following:
 *  - Adds a canonicalURL for the page to the returned View Data object.
 *  - Sets metadata for category searches that are missing a rendering template.
 */
server.append('Show', function (req, res, next) {
    // SFCC API imports

    if (req.querystring.cgid === "swap") { return handleSwap(req, res, next); }
    if (req.querystring.isswap) { return handleSwap(req, res, next); }

    var ProductSearchModel = require('dw/catalog/ProductSearchModel');

    var canonicalURL = URLUtils.https('Search-Show');
    var categoryParam = req.querystring.cgid;
    var viewData = res.getViewData();
    var apiProductSearch = new ProductSearchModel();
    var categoryTemplate;
    var isAjax = Object.hasOwnProperty.call(req.httpHeaders, 'x-requested-with')
        && req.httpHeaders['x-requested-with'] === 'XMLHttpRequest';

    if (!empty(req.querystring.cgid)) {
        // If a category was specified, append it to the canonical URL.
        canonicalURL.append('cgid', req.querystring.cgid);
    } else if (!empty(req.querystring.q)) {
        // If a search string was specified, add that to the canonical link URL.
        canonicalURL.append('q', req.querystring.q);
    }

    //eslint-disable-next-line
    var cat = dw.catalog.CatalogMgr.getCategory(req.querystring.cgid);
    viewData.cat = cat;

    // Add any product selected for compare, but not currently visible because of infinite scroll resetting, to the product search model
    if (!empty(req.querystring.comparePids)) {
        var productSearcView = viewData.productSearch;
        var comparePids = req.querystring.comparePids.split(',');
        var len = productSearcView.productIds.length;

        // Check for products being compared that are visible
        // If a match is found, remove it from comparePids so we don't get duplicate product tiles
        for (var i = 0; i < len; i++) {
            // Disabling linting here, because using a variable name in two distinct scopes is not the same as using it out of scope
            var pid = productSearcView.productIds[i]; // eslint-disable-line block-scoped-var
            var compareInd = comparePids.indexOf(pid.productID); // eslint-disable-line block-scoped-var

            if (compareInd !== -1) {
                comparePids.splice(compareInd, 1);
            }
        }

        // The remaining pids correspond to products not visible in the search, so display them
        var compareLen = comparePids.length;
        if (compareLen > 0) {
            productSearcView.showMoreUrl += '&comparePids=' + comparePids.join(',');
        }
        for (var j = 0; j < compareLen; j++) {
            // Disabling linting here, because using a variable name in two distinct scopes is not the same as using it out of scope
            var pid = comparePids[j]; // eslint-disable-line block-scoped-var, no-redeclare
            productSearcView.productIds.push({
                productID: pid, // eslint-disable-line block-scoped-var
                productSearchHit: {}
            });
        }
    }

    viewData.canonicalURL = canonicalURL;

    apiProductSearch = searchHelper.setupSearch(apiProductSearch, req.querystring);
    apiProductSearch.search();

    // Append metadata title to category search with no template.
    categoryTemplate = searchHelper.getCategoryTemplate(apiProductSearch);

    var productSearch = new ProductSearch(
        apiProductSearch,
        req.querystring,
        req.querystring.srule,
        CatalogMgr.getSortingOptions(),
        CatalogMgr.getSiteCatalog().getRoot()
    );

    // If there is a template (and category isn't a sub-category), the default SFRA implementation will handle.
    if (!categoryTemplate) {
        // Only assign to category search for top level categories.
        if (productSearch.isCategorySearch &&
            !productSearch.isRefinedCategorySearch &&
            apiProductSearch.category.parent.ID === 'root'
        ) {
            pageMetaHelper.setPageMetaData(req.pageMetaData,
                productSearch.category);
        }
    }
    //eslint-disable-next-line
    if (!categoryTemplate || categoryTemplate == "") {
        categoryTemplate = "rendering/search/searchResultsV2";
    }
    /**
     * Handle category template for sub-category since SFRA doesn't
     * Only overriding where needed
     */
    if ((categoryTemplate && apiProductSearch.category && apiProductSearch.category.parent.ID !== 'root') || isAjax) {
        if (productSearch.isCategorySearch &&
            !productSearch.isRefinedCategorySearch
        ) {
            pageMetaHelper.setPageMetaData(req.pageMetaData,
                productSearch.category);
        }
        viewData.isAjax = true;
        res.render(categoryTemplate);
    }

    var ContentMgr = require('dw/content/ContentMgr');
    var contentAsset = ContentMgr.getContent('search-results');
    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }

    // Set a flag for BYOB vs General Search.
    var isBYOB = req.querystring.isbyob ||
        BYOBHelpers.isBYOBCategory(categoryParam);

    viewData.isBYOB = isBYOB;

    if (cat) {
        viewData.catName = cat.pageTitle;
    } else {
        viewData.catName = "Search";
    }
    res.setViewData(viewData);

    // If this is a BYOB search use the BYOB rendering template & refine
    // the results to only BYOB category products.
    if (isBYOB) {
        return overrideByobTemplate(req, res, next, apiProductSearch); // Only returning here so we can have a consistent return value and to satisfy linter
    }

    return next();
}, socialCards, pageMetaData.computedPageMetaData);

server.get('ShowMenu',
    cache.applyShortPromotionSensitiveCache,
    consentTracking.consent,
    function (req, res, next) {
        var ProductSearchModel = require('dw/catalog/ProductSearchModel');
        var categoryParam = req.querystring.cgid;
        var apiProductSearch = new ProductSearchModel();
        apiProductSearch = searchHelper.setupSearch(apiProductSearch, req.querystring);
        apiProductSearch.search();
        var productSearch = new ProductSearch(
            apiProductSearch,
            req.querystring,
            req.querystring.srule,
            CatalogMgr.getSortingOptions(),
            CatalogMgr.getSiteCatalog().getRoot()
        );
        res.render('components/header/searchmenu', {
            results: productSearch,
            cat: categoryParam
        });
        next();
    });

server.append('UpdateGrid', cache.applyPromotionSensitiveCache, function (req, res, next) {
    var viewData = res.getViewData();
    var productSearchModel = viewData.productSearch;

    if (!empty(req.querystring.comparePids)) {
        var comparePids = req.querystring.comparePids.split(',');
        var len = productSearchModel.productIds.length;
        var newProductIds = []; // Create a new array that we can modify so we don't mess with the one we're looping through by editing it.

        // Since the product compare functionality allows us to display products "before their time", we need to remove any that would be added here via AJAX to prevent duplicates
        for (var i = 0; i < len; i++) {
            var pid = productSearchModel.productIds[i];
            var compareInd = comparePids.indexOf('' + pid.productID);

            if (compareInd === -1) {
                newProductIds.push(pid);
            } else {
                comparePids.slice(compareInd, 1); // Once we've preventing the product from being duplicated, we no longer need to check against it
            }
        }

        var compareLen = comparePids.length;
        if (compareLen > 0) {
            productSearchModel.showMoreUrl += '&comparePids=' + comparePids.join(',');
        }

        productSearchModel.productIds = newProductIds;

        viewData.productSearch = productSearchModel;
    }

    res.setViewData(viewData);

    next();
});

module.exports = server.exports();
