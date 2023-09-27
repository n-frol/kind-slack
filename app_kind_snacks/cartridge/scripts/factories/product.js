/* global empty, request */
'use strict';

/**
 * product.js
 *
 * @extends app_storefront_base/cartridge/scripts/factories/product.js
 * Extends the base product factory behavior to include the creation of a new
 * product model type: productListItem.
 */

var ProductMgr = require('dw/catalog/ProductMgr');
var PromotionMgr = require('dw/campaign/PromotionMgr');
var productHelper = require('*/cartridge/scripts/helpers/productHelpers');
var bonusProduct = require('*/cartridge/models/product/bonusProduct');
var fullProduct = require('*/cartridge/models/product/fullProduct');
var productSet = require('*/cartridge/models/product/productSet');
var productBundle = require('*/cartridge/models/product/productBundle');
var productLineItem = require('*/cartridge/models/productLineItem/productLineItem');
var bonusProductLineItem = require('*/cartridge/models/productLineItem/bonusProductLineItem');
var bundleProductLineItem = require('*/cartridge/models/productLineItem/bundleLineItem');
var orderLineItem = require('*/cartridge/models/productLineItem/orderLineItem');
var bonusOrderLineItem = require('*/cartridge/models/productLineItem/bonusOrderLineItem');
var bundleOrderLineItem = require('*/cartridge/models/productLineItem/bundleOrderLineItem');

var ProductListItemModel = require('*/cartridge/models/productList/productListItem');
var ProductTile = require('*/cartridge/models/product/productTile');

function isSnackClubItem(productID) {
    var ArrayList = require("dw/util/ArrayList");
    var cookies = request.getHttpCookies();
    var value = false;
    var autoShipJSON = null;

    if (!empty(cookies)) {
        for (var i = 0; i < cookies.getCookieCount(); i++) {
            var cookie = cookies[i];
            var cookieName = cookie.getName();
            if (cookieName === "og_cart_autoship") {
                autoShipJSON = decodeURIComponent(cookie.getValue());
            }
        }
        var autoShipCart = JSON.parse(autoShipJSON);
        var items = new ArrayList();
        if (!empty(autoShipCart)) {
            for (var j = 0; j < autoShipCart.length; j++) {
                var item = autoShipCart[j];
                items.add(item.id.toString());
            }
        }
        value = items.contains(productID);
    }
    return value;
}

function checkPromotionExclusivity(promotions, productID) {
    var ArrayList = require('dw/util/ArrayList');
    var promotionIter = promotions.iterator();
    var result = new ArrayList();
    var isClubItem = isSnackClubItem(productID);

    while (promotionIter.hasNext()) {
        var curPromotion = promotionIter.next();
        var isDiscountInclusionSelected = Object.hasOwnProperty.call(curPromotion.getCustom(), 'orderGrooveDiscountInclusion');
        if (isDiscountInclusionSelected) {
            var inclusions = curPromotion.getCustom().orderGrooveDiscountInclusion.map(function (item) { return item.value; });
            if (inclusions.indexOf('adh') >= 0 && !isClubItem) {
                result.add(curPromotion);
            }
            if (inclusions.indexOf('clb') >= 0 && isClubItem) {
                result.add(curPromotion);
            }
        }
    }
    return result;
}

module.exports = {
    get: function (params) {
        var productId = params.pid;
        var apiProduct = ProductMgr.getProduct(productId);
        var productType = productHelper.getProductType(apiProduct);
        var product = Object.create(null);
        var options = null;
        var promotions;

        switch (params.pview) {
            case 'tile':
                promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
                // eslint-disable-next-line no-redeclare
                options = {
                    promotions: checkPromotionExclusivity(promotions, productId),
                    quantity: params.quantity,
                    variables: params.variables,
                    lineItem: params.lineItem,
                    productType: productType
                };
                product = new ProductTile(product, apiProduct, productType, options, false);
                break;
            case 'bonusProductLineItem':
                promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
                options = {
                    promotions: checkPromotionExclusivity(promotions, productId),
                    quantity: params.quantity,
                    variables: params.variables,
                    lineItem: params.lineItem,
                    productType: productType
                };

                switch (productType) {
                    case 'bundle':
                        product = bundleProductLineItem(product, apiProduct, options, this);
                        break;
                    default:
                        var variationsBundle = productHelper.getVariationModel(apiProduct, params.variables);
                        if (variationsBundle) {
                            apiProduct = variationsBundle.getSelectedVariant() || apiProduct; // eslint-disable-line
                        }

                        var optionModelBundle = apiProduct.optionModel;
                        var optionLineItemsBundle = params.lineItem.optionProductLineItems;
                        var currentOptionModelBundle = productHelper.getCurrentOptionModel(
                            optionModelBundle,
                            productHelper.getLineItemOptions(optionLineItemsBundle, productId)
                        );
                        var lineItemOptionsBundle = optionLineItemsBundle.length
                            ? productHelper.getLineItemOptionNames(optionLineItemsBundle)
                            : productHelper.getDefaultOptions(optionModelBundle, optionModelBundle.options);


                        options.variationModel = variationsBundle;
                        options.lineItemOptions = lineItemOptionsBundle;
                        options.currentOptionModel = currentOptionModelBundle;

                        if (params.containerView === 'order') {
                            product = bonusOrderLineItem(product, apiProduct, options);
                        } else {
                            product = bonusProductLineItem(product, apiProduct, options);
                        }

                        break;
                }

                break;
            case 'productLineItem':
                promotions = PromotionMgr.activeCustomerPromotions.getProductPromotions(apiProduct);
                options = {
                    promotions: checkPromotionExclusivity(promotions, productId),
                    quantity: params.quantity,
                    variables: params.variables,
                    lineItem: params.lineItem,
                    productType: productType
                };

                switch (productType) {
                    case 'bundle':

                        if (params.containerView === 'order') {
                            product = bundleOrderLineItem(product, apiProduct, options, this);
                        } else {
                            product = bundleProductLineItem(product, apiProduct, options, this);
                        }
                        break;
                    default:
                        var variationsPLI = productHelper.getVariationModel(apiProduct, params.variables);
                        if (variationsPLI) {
                            apiProduct = variationsPLI.getSelectedVariant() || apiProduct; // eslint-disable-line
                        }

                        var optionModelPLI = apiProduct.optionModel;
                        var optionLineItemsPLI = params.lineItem.optionProductLineItems;
                        var currentOptionModelPLI = productHelper.getCurrentOptionModel(
                            optionModelPLI,
                            productHelper.getLineItemOptions(optionLineItemsPLI, productId)
                        );
                        var lineItemOptionsPLI = optionLineItemsPLI.length
                            ? productHelper.getLineItemOptionNames(optionLineItemsPLI)
                            : productHelper.getDefaultOptions(optionModelPLI, optionModelPLI.options);


                        options.variationModel = variationsPLI;
                        options.lineItemOptions = lineItemOptionsPLI;
                        options.currentOptionModel = currentOptionModelPLI;

                        if (params.containerView === 'order') {
                            product = orderLineItem(product, apiProduct, options);
                        } else {
                            product = productLineItem(product, apiProduct, options);
                        }

                        break;
                }

                break;
            case 'bonus':
                options = productHelper.getConfig(apiProduct, params);

                switch (productType) {
                    case 'set':
                        break;
                    case 'bundle':
                        product = bonusProduct(product, options.apiProduct, options, params.duuid);
                        break;
                    default:
                        product = bonusProduct(product, options.apiProduct, options, params.duuid);
                        break;
                }

                break;
            case 'productListItem':
                /* ==============================================================
                 * Product List Item
                 * ============================================================== */
                options = {
                    quantity: params.quantity,
                    lineItem: params.lineItem,
                    productType: productType
                };
                product = new ProductListItemModel(product, apiProduct, options);
                break;
            case 'byobTile':
                /* ==============================================================
                 * BYOB Product Tile
                 * ============================================================== */
                return new ProductTile(product, apiProduct, productType, options, true);
            default: // PDP
                options = productHelper.getConfig(apiProduct, params);

                switch (productType) {
                    case 'set':
                        product = productSet(product, options.apiProduct, options, this);
                        break;
                    case 'bundle':
                        product = productBundle(product, options.apiProduct, options, this);
                        break;
                    default:
                        product = fullProduct(product, options.apiProduct, options);
                        break;
                }
        }

        return product;
    }
};
