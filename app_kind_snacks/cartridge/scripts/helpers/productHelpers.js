'use strict';

var base = module.superModule;
var productHelpers = {};

/**
 * Create clean, if shallow, copy of base so we can safely reference base methods without risking an unwanted loop
 * Backend doesn't have access to Object.assign or spread operator, so we go with loop
 */
var baseKeys = Object.keys(base);
baseKeys.forEach(function (key) {
    productHelpers[key] = base[key];
});

/**
 * Overrides default getProductType to prioritize a product as a bundle over being a variant
 *
 * Return type of the current product
 * @param  {dw.catalog.ProductVariationModel} product - Current product
 * @return {string} type of the current product
 */
function getProductType(product) {
    var result;
    if (product.master) {
        result = 'master';
    } else if (product.bundle) {
        result = 'bundle';
    } else if (product.variant) {
        result = 'variant';
    } else if (product.variationGroup) {
        result = 'variationGroup';
    } else if (product.productSet) {
        result = 'set';
    } else if (product.optionProduct) {
        result = 'optionProduct';
    } else {
        result = 'standard';
    }
    return result;
}

// eslint-disable-next-line valid-jsdoc
/**
 * @function getDiscountInclusion
 *
 * @param { Array<dw.value.EnumValue> } selectedInclusions
 * @returns {{isAdHocSelected: boolean, isClubSelected: boolean, isRecurringSelected: boolean}}
 * @TODO Move this function to the helper file.
 */
// eslint-disable-next-line no-unused-vars
function getDiscountInclusion(selectedInclusions) {
    var inclusions = selectedInclusions.map(function (item) { return item.value; });
    return {
        isAdHocSelected: !(inclusions.indexOf('adh') < 0),
        isClubSelected: !(inclusions.indexOf('clb') < 0),
        isRecurringSelected: !(inclusions.indexOf('recurring') < 0)
    };
}

function getConfig(apiProduct, params) {
    var baseObj = this;
    var getProductTypeScoped = getProductType;
    if (baseObj.getProductType) {
        getProductTypeScoped = baseObj.getProductType;
    }

    var options = base.getConfig(apiProduct, params);
    options.productType = getProductTypeScoped(apiProduct);

    return options;
}

productHelpers.getProductType = getProductType;
productHelpers.getConfig = getConfig;

module.exports = productHelpers;
