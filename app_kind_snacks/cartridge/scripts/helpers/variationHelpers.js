/* global empty */
'use strict';

var ProductMgr = require('dw/catalog/ProductMgr');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * Retrieve selected value of attribute
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {dw.catalog.ProductVariationAttribute} attr - Attribute value'
 * @returns {string} - selectedValue – selected value of attribute
 */
function retrieveSelectedValue(variationModel, attr) {
    if (!empty(variationModel) && !empty(attr)) {
        var selectedValue = variationModel.getSelectedValue(attr);
        return selectedValue;
    }
    return undefined;
}

/**
 * Gets list of visible variants
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @returns {Object} - List of visible variants
 */
function getVisibleVariants(variationModel) {
    if (!empty(variationModel)) {
        var Site = require('dw/system/Site');
        var site = Site.getCurrent();
        var variants = variationModel.variants;
        var visibleVariants = [];

        if (!empty(variants)) {
            collections.forEach(variants, function (variant) {
                if (
                    (site.getName() !== "Kind B2B" && !empty(variant.custom.showOnPDP) && variant.custom.showOnPDP) ||
                    (site.getName() === "Kind B2B" && !empty(variant.custom.showOnPDPB2B) && variant.custom.showOnPDPB2B)
                    ) {
                    visibleVariants.push(variant);
                }
            });
        }

        return visibleVariants;
    }

    return undefined;
}

/**
 * Gets list of filtered values
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {Object} visibleVariants – list of visible variants
 * @param {dw.catalog.ProductVariationAttribute} attr - Attribute value'
 * @returns {Object[]} - List of filtered attribute values for attribute
 */
function getFilteredValues(variationModel, visibleVariants, attr) {
    if (!empty(variationModel) && !empty(visibleVariants) && !empty(attr)) {
        var allValues = variationModel.getAllValues(attr);
        var filteredValues = [];

        for (var i = 0; visibleVariants.length > i; i++) {
            var variantProductID = visibleVariants[i].ID;

            if (!empty(variantProductID)) {
                var variantProduct = ProductMgr.getProduct(variantProductID);

                if (!empty(variantProduct)) {
                    var variationValue = variationModel.getVariationValue(variantProduct, attr);

                    if (!empty(variationValue) && filteredValues.indexOf(variationValue) === -1) {
                        filteredValues.push(variationValue);
                    }
                }
            }
        }

        if (!empty(filteredValues)) {
            var removeValuesArray = [];
            collections.forEach(allValues, function (value) {
                var removeObject = true;

                for (var v = 0; filteredValues.length > v; v++) {
                    if (value.ID === filteredValues[v].ID) {
                        removeObject = false;
                    }
                }

                if (removeObject) {
                    removeValuesArray.push(value);
                }
            });

            if (!empty(removeValuesArray)) {
                for (var r = 0; removeValuesArray.length > r; r++) {
                    allValues.remove(removeValuesArray[r]);
                }
            }
        }

        return allValues;
    }

    return undefined;
}

/**
 * Gets filtered variants and provides callback for additional functionality
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {function} callback - callback function
 */
function collectFilteredVariants(variationModel, callback) {
    if (!empty(variationModel)) {
        var allAttributes = variationModel.productVariationAttributes;
        var visibleVariants = getVisibleVariants(variationModel);

        if (!empty(visibleVariants)) {
            collections.forEach(allAttributes, function (attr) {
                var filteredValues = getFilteredValues(variationModel, visibleVariants, attr);

                if (!empty(filteredValues)) {
                    var selectedValue = retrieveSelectedValue(variationModel, attr, filteredValues);
                    callback(variationModel, visibleVariants, selectedValue, attr, filteredValues);
                }
            });
        }
    }
}

/**
 * If item custom.showOnPDP is set to false, returns master ID.
 * Used in PDP links on cart page for non-purchasable items to link to master.
 * This can occur when bonus item is non-purchasable.
 *
 * @param {string} productID - the current product id.
 * @returns {string} - product id.
 */
function getVisibleProductID(productID) {
    if (!empty(productID)) {
        var Product = ProductMgr.getProduct(productID);
        var Site = require('dw/system/Site');
        var site = Site.getCurrent();

        // If the product is a variant with the custom.showOnPDP attribute set
        // to false, then get the master product (if there is one).
        if ((site.getName() !== "Kind B2B" && Product.variant && !Product.custom.showOnPDP) ||
        (site.getName() === "Kind B2B" && Product.variant && !Product.custom.showOnPDPB2B)) {
            if (!empty(Product.masterProduct)) {
                return Product.masterProduct.ID;
            }
        }
    }
    return productID;
}

/**
 * Checks to see if the filtered value should be set
 *
 * @param {Object} productModel - the current product model from view data.
 * @returns {{pid:string}} - Object with single property 'pid' for prodcut ID.
 */
function checkGetVariantProductID(productModel) {
    if (!Object.hasOwnProperty.call(productModel, 'id')) {
        return undefined;
    }
    if (!empty(productModel)) {
        var Site = require('dw/system/Site');
        var site = Site.getCurrent();
        var displayProduct = productModel;
        var Product = ProductMgr.getProduct(displayProduct.id);
        var variationModel = Product.variationModel;

        // If the product is a variant with the custom.showOnPDP attribute set
        // to false, then show the master product (if there is one).
        if ((site.getName() !== "Kind B2B" && Product.variant && !Product.custom.showOnPDP) ||
        (site.getName() === "Kind B2B" && Product.variant && !Product.custom.showOnPDPB2B)) {
            if (!empty(Product.masterProduct)) {
                displayProduct = { productType: 'master' };
                variationModel = Product.masterProduct.variationModel;
            } else {
                return undefined;
            }
        }

        if (!empty(variationModel) && displayProduct.productType === 'master') {
            var visibleVariants = getVisibleVariants(variationModel);
            var productID;

            if (!empty(visibleVariants) && visibleVariants.length === 1) {
                productID = visibleVariants[0].ID;
            } else if (!empty(variationModel.defaultVariant) && Product.ID !== "MBYOB") {
                productID = getVisibleProductID(variationModel.defaultVariant.ID);
            } else if (Product.ID !== "MBYOB") {
                productID = Product.ID;
            }

            if (!empty(productID)) {
                return {
                    pid: productID
                };
            }
        }
    }

    return undefined;
}

module.exports.methods = {
    getVisibleVariants: getVisibleVariants
};
module.exports.retrieveSelectedValue = retrieveSelectedValue;
module.exports.checkGetVariantProductID = checkGetVariantProductID;
module.exports.getVisibleProductID = getVisibleProductID;
module.exports.collectFilteredVariants = collectFilteredVariants;
