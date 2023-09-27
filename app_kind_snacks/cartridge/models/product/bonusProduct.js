'use strict';

var decorators = require('*/cartridge/models/product/decorators/index');
var base = module.superModule;

/**
 * Decorate product with bonus product information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.options - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.optionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 * @param {string} duuid - the UUID of the discount line item
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function bonusProduct(product, apiProduct, options, duuid) {
    base(product, apiProduct, options, duuid);

    decorators.backgroundColor(product, apiProduct);
    decorators.breadcrumbs(product, apiProduct);
    decorators.imageNavigationColor(product, apiProduct);
    decorators.responsiveImages(product, apiProduct);

    return product;
};
