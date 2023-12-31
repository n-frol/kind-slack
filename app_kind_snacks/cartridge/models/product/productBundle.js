/* global empty */
'use strict';

var decorators = require('*/cartridge/models/product/decorators/index');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');

/**
 * Decorate product with set product information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.options - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.optionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 * @param {Object} factory - Reference to product factory
 *
 * @returns {Object} - Set product
 */
module.exports = function bundleProduct(product, apiProduct, options, factory) {
    decorators.backgroundColor(product, apiProduct);
    decorators.badge(product, apiProduct);
    decorators.base(product, apiProduct, options.productType);
    decorators.benefits(product, apiProduct);
    decorators.byob(product, apiProduct);
    decorators.description(product, apiProduct);
    decorators.featured(product, apiProduct);
    decorators.imageNavigationColor(product, apiProduct);
    decorators.nutrition(product, apiProduct);
    decorators.orderGroove(product, apiProduct);
    decorators.price(product, apiProduct, options.promotions, false, options.options);
    decorators.images(product, apiProduct, { types: ['large', 'small'], quantity: 'all', writable: false });
    decorators.isHiddenComponents(product, apiProduct);
    decorators.quantity(product, apiProduct, options.quantity);
    decorators.description(product, apiProduct);
    decorators.ratings(product);
    decorators.responsiveImages(product, apiProduct);
    decorators.promotions(product, options.promotions);
    decorators.attributes(product, apiProduct.attributeModel);
    decorators.availability(product, options.quantity, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel, apiProduct.custom.maxOrderQuantity);
    decorators.options(product, options.optionModel, options.variables, options.quantity);
    decorators.quantitySelector(product, apiProduct.stepQuantity.value, options.variables, options.options);
    var category = apiProduct.getPrimaryCategory() || '';
    if (empty(category) && apiProduct.variant) {
        category = apiProduct.getMasterProduct().getPrimaryCategory();
    }

    if (!empty(category)) {
        decorators.category(product, category);
        decorators.sizeChart(product, category.custom.sizeChartID);
    }

    if (apiProduct.variant) {
        decorators.variationAttributes(product, options.variationModel, {
            attributes: '*',
            endPoint: 'Variation'
        });
    }

    decorators.currentUrl(product, options.variationModel, options.optionModel, 'Product-Show', apiProduct.ID, options.quantity);
    decorators.bundledProducts(product, apiProduct, options.quantity, factory);
    decorators.bundleReadyToOrder(product);
    decorators.raw(product, apiProduct);
    decorators.clbPrice(product, apiProduct, options.promotions, false, options.options);
    decorators.byobPrice(product, apiProduct, options.promotions, false, options.options);

    masterId(product, apiProduct);

    return product;
};
