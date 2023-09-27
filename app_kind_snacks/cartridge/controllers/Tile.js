/* eslint-disable */
'use strict';

// SFRA Includes
var server = require('server');
var ProductMgr = require('dw/catalog/ProductMgr');
var URLUtils = require('dw/web/URLUtils');
var Site = require("dw/system/Site");

var cache = require('*/cartridge/scripts/middleware/cache');
var variationHelpers = require('*/cartridge/scripts/helpers/variationHelpers');

server.extend(module.superModule);

// Get around not having access to getAbsImageURL in the view
// Get responsive images of specific sizes for PDP primary slider
function responsiveSliderImages(pid) {
    var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
    var product = ProductMgr.getProduct(pid);
    var images;
    if (!empty(product) && !empty(product.getImages('large'))) {
        images = product.getImages('large').toArray();
    }
    var responsiveImages = [];

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push(responsiveImageUtils.getResponsiveImage(image, 475, 950, '', 'jpg'));
        });
    }

    return responsiveImages;
}

server.extend(module.superModule);

/**
 * Adds responsive images to pdict for Product-Show controller endpoint.
 * Checks whether to show the descriptionAndDetails block
 */
server.append('Show', function (req, res, next) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var params = req.querystring;
    var viewData = res.getViewData();
    var product = ProductMgr.getProduct(params.pid);
    var product2 = viewData.product;
    var productCategory = 'None';

    if (!empty(product) && product.categorized) {
        var newProductID = variationHelpers.checkGetVariantProductID(product2);
        if (!empty(newProductID) && !newProductID.error) {
            var newProduct = ProductFactory.get(newProductID);
            if (!empty(newProduct)) {
                viewData.newproduct = newProduct;
            }
        }

        var primary = product.getPrimaryCategory();
        var classification = product.getClassificationCategory();

        if (!empty(primary)) {
            // Start with the primary category.
            productCategory = primary.ID;
        } else if (!empty(classification)) {
            // If the primary is empty, use the classification category.
            productCategory = classification.ID;
        } else {
            // If both primary and classification are empty use first in list.
            var allCategories = product.getCategories();
            productCategory = allCategories.length ?
                allCategories[0].ID : productCategory;
        }

        // If the current category is not the product's primary category, change the path to show current
        if (params.cgid && (params.cgid !== primary.ID)) {
            var productUrl;
            productUrl = URLUtils.url('Product-ShowInCategory', 'pid', product.ID).relative().toString();
            viewData.urls.product = productUrl;
        }
    }

    var responsiveImages = responsiveSliderImages(params.pid);
    viewData.responsiveImages = responsiveImages;
    viewData.productCategory = productCategory;
    viewData.display = viewData.display || {};

    var showQuickView = viewData.display.showQuickView || params.showQuickView;

    viewData.display.showQuickView = showQuickView;

    var template = params.template;

    var visibleVariants = variationHelpers.methods.getVisibleVariants(product.variationModel);
    if (visibleVariants[0] && visibleVariants[0].custom.totalItemQuantity) {
        var totals = visibleVariants[0].custom.totalItemQuantity;
        viewData.product.totalItemQuantity = parseInt(totals, 0);
    }

    // Pass along the template path to be used in gridTile
    if (!empty(template)) {
        viewData.template = template;
        var updateData = Object.create({});
        updateData[params.pid] = {
            quantity: 1
        };

        // If this is a BYOB tile
        if (typeof params.isbyob !== 'undefined' && params.isbyob === 'true') {
            viewData.addToListUrl = URLUtils.https('BYOB-List',
                'action', 'add',
                'update', JSON.stringify(updateData)
            );
            viewData.confirmEmptyUrl = URLUtils.https('BYOB-ConfirmEmpty',
                'context', 'combo',
                'pid', params.pid);
        }
    }
    viewData.sellable = product.custom.sellable;
    res.setViewData(viewData);

    next();
});

server.get('ConfigurationCategoryShow', cache.applyPromotionSensitiveCache, function (req, res, next) {
    var viewData = res.getViewData();
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var params = req.querystring;
    var isByob = !empty(params.isbyob) ? params.isbyob : false;
    var isSwap = !empty(params.isswap) ? params.isswap : false;
    viewData.isByob = isByob;
    viewData.isSwap = isSwap;

    var cust = req.currentCustomer;
    var swapids = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementItems');
    var swapbarid = swapids[0];
    if (session.custom.swapbarid) {
        swapbarid = session.custom.swapbarid;
    }
    if (cust.raw.authenticated && cust.raw.profile.custom.swapbar) {
        swapbarid = cust.raw.profile.custom.swapbar;
    }

    viewData.swapbarid = swapbarid;

    // The req parameter has a property called querystring. In this use case the querystring could
    // have the following:
    // pid - the Product ID
    // ratings - boolean to determine if the reviews should be shown in the tile.
    // swatches - boolean to determine if the swatches should be shown in the tile.
    //
    // pview - string to determine if the product factory returns a model for
    //         a tile or a pdp/quickview display
    var productTileParams = { pview: 'tile' };
    Object.keys(req.querystring).forEach(function (key) {
        productTileParams[key] = req.querystring[key];
    });

    // If this is a BYOB tile, then get the quantity from the ProductList.
    if (isByob) {
        productTileParams.isBYOB = true;
        productTileParams.pview = 'byobTile';

        // var byobList = BYOBHelpers.getBYOBList(session.customer);
        // viewData.productList = new ProductListModel(byobList);
    }

    var product;
    var productUrl;
    var productCategory = 'None';
    var quickViewUrl;

    // TODO: remove this logic once the Product factory is
    // able to handle the different product types
    try {
        product = ProductFactory.get(productTileParams);
        productUrl = URLUtils.url('Product-Show', 'pid', product.id).relative().toString();
        if (isByob && !isSwap) {
        quickViewUrl = URLUtils.url('Product-ShowInfoQuickView', 'pid', product.id, 'isByob', isByob, "isSwap", false)
            .relative().toString();
        }
        if (isSwap) {
            quickViewUrl = URLUtils.url('Product-ShowInfoQuickView', 'pid', product.id, 'isSwap', true, "isByob", false) 
        }
    } catch (e) {
        product = false;
        productUrl = URLUtils.url('Home-Show');// TODO: change to coming soon page
        quickViewUrl = URLUtils.url('Home-Show');
    }

    var fullprod = ProductMgr.getProduct(product.id);

    var context = {
        fullprod: fullprod,
        product: product,
        urls: {
            product: productUrl,
            quickView: quickViewUrl
        },
        display: {}
    };

    Object.keys(req.querystring).forEach(function (key) {
        if (req.querystring[key] === 'true') {
            context.display[key] = true;
        } else if (req.querystring[key] === 'false') {
            context.display[key] = false;
        }
    });

    if (!empty(product) && product.categorized) {
        var primary = product.getPrimaryCategory();
        var classification = product.getClassificationCategory();

        if (!empty(primary)) {
            // Start with the primary category.
            productCategory = primary.ID;
        } else if (!empty(classification)) {
            // If the primary is empty, use the classification category.
            productCategory = classification.ID;
        } else {
            // If both primary and classification are empty use first in list.
            var allCategories = product.getCategories();
            productCategory = allCategories.length ?
                allCategories[0].ID : productCategory;
        }

        // If the current category is not the product's primary category, change the path to show current
        if (params.cgid && (params.cgid !== primary.ID)) {
            productUrl = URLUtils.url('Product-ShowInCategory', 'pid', product.ID, 'cgid', params.cgid).relative().toString();
            viewData.urls.product = productUrl;
        }
    }

    var responsiveImages = responsiveSliderImages(params.pid);
    context.responsiveImages = responsiveImages;
    context.productCategory = productCategory;

    var showQuickView = context.display.showQuickView || params.showQuickView;

    context.display.showQuickView = showQuickView;

    res.setViewData(viewData);

    res.render('product/configurationCategoryGridTile.isml', context);

    next();
});

module.exports = server.exports();
