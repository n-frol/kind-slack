/* global empty, session */
'use strict';

var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
var decorators = require('*/cartridge/models/product/decorators/index');
var promotionCache = require('*/cartridge/scripts/util/promotionCache');
var ProductSearchModel = require('dw/catalog/ProductSearchModel');

/**
 * Get product search hit for a given product
 * @param {dw.catalog.Product} apiProduct - Product instance returned from the API
 * @returns {dw.catalog.ProductSearchHit} - product search hit for a given product
 */
function getProductSearchHit(apiProduct) {
    var searchModel = new ProductSearchModel();
    searchModel.setSearchPhrase(apiProduct.ID);
    searchModel.search();

    if (empty(searchModel.productSearchHits)) {
        searchModel.setSearchPhrase(apiProduct.ID.replace(/-/g, ' '));
        searchModel.search();
    }

    var hit = searchModel.getProductSearchHit(apiProduct);
    if (!hit) {
        var tempHit = searchModel.getProductSearchHits().next();
        if (tempHit.firstRepresentedProductID === apiProduct.ID) {
            hit = tempHit;
        }
    }
    return hit;
}

// eslint-disable-next-line valid-jsdoc
/**
 * Decorate product with product tile information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {string} productType - Product type information
 * @param {boolean} [isBYOB=false] - An optional argument that can be specified
 *      for BYOB product tiles. If this is set as true, the quantity of the tile
 *      will be set from the quantity of that product in the customer's BYOB
 *      ProductList instance.
 * @returns {Object} - Decorated product model
 */
module.exports = function productTile(product, apiProduct, productType, options, isBYOB) {
    var isByob = !empty(isBYOB) ? isBYOB : false;
    var productSearchHit = getProductSearchHit(apiProduct);

    decorators.access(product, apiProduct);
    decorators.base(product, apiProduct, productType);
    decorators.searchPrice(product, productSearchHit, promotionCache.promotions, getProductSearchHit);
    decorators.images(product, apiProduct, { types: ['large'], quantity: 'single' });
    decorators.orderGroove(product, apiProduct);
    decorators.ratings(product);
    decorators.searchVariationAttributes(product, productSearchHit);
    decorators.description(product, apiProduct);
    decorators.raw(product, apiProduct);
    decorators.texture(product, apiProduct);


    // If this is a BYOB tile, get the quantity of the product in the customer's
    // current BYOB list.
    if (isByob) {
        var byobList = BYOBHelpers.getBYOBList(session.customer);
        var quantity = !empty(byobList) ?
            BYOBHelpers.getBYOBListQuantity(byobList, apiProduct.ID) : 1;
        decorators.quantity(product, apiProduct, quantity);
    } else {
        decorators.quantity(product, apiProduct, 1);
        if (!options.promotions.empty) {
            decorators.promotions(product, options.promotions);
        }
    }

    if (productType === 'master') {
        decorators.masterAvailability(product, null, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel, apiProduct.variationModel);
    } else {
        decorators.availability(product, null, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel);
    }

    decorators.hoverImages(product, apiProduct);

    return product;
};
