'use strict';

var decorators = require('*/cartridge/models/product/decorators/index');
var masterId = require('*/cartridge/models/productLineItem/decorators/masterId');

/**
 * Decorate product with full product information
 * @param {Object} product - Product Model to be decorated
 * @param {dw.catalog.Product} apiProduct - Product information returned by the script API
 * @param {Object} options - Options passed in from the factory
 * @property {dw.catalog.ProductVarationModel} options.variationModel - Variation model returned by the API
 * @property {Object} options.options - Options provided on the query string
 * @property {dw.catalog.ProductOptionModel} options.optionModel - Options model returned by the API
 * @property {dw.util.Collection} options.promotions - Active promotions for a given product
 * @property {number} options.quantity - Current selected quantity
 * @property {Object} options.variables - Variables passed in on the query string
 *
 * @returns {Object} - Decorated product model
 */
module.exports = function fullProduct(product, apiProduct, options) {
    decorators.base(product, apiProduct, options.productType);
    decorators.price(product, apiProduct, options.promotions, false, options.optionModel, false);
    decorators.clbPrice(product, apiProduct, options.promotions, false, options.optionModel);
    decorators.byobPrice(product, apiProduct, options.promotions, false, options.optionModel);

    if (options.variationModel) {
        decorators.images(product, options.variationModel, { types: ['large', 'small'], quantity: 'all', writable: false });
    } else {
        decorators.images(product, apiProduct, { types: ['large', 'small'], quantity: 'all', writable: false });
    }

    decorators.quantity(product, apiProduct, options.quantity);

    decorators.variationAttributes(product, options.variationModel, {
        attributes: '*',
        endPoint: 'Variation'
    });

    decorators.access(product, apiProduct);
    decorators.backgroundColor(product, apiProduct);
    decorators.badge(product, apiProduct);
    decorators.benefits(product, apiProduct);
    decorators.byob(product, apiProduct);
    decorators.components(product, apiProduct);
    decorators.description(product, apiProduct);
    decorators.featured(product, apiProduct);
    decorators.occasion(product, apiProduct);
    decorators.imageNavigationColor(product, apiProduct);
    decorators.nutrition(product, apiProduct);
    decorators.orderGroove(product, apiProduct);
    decorators.ratings(product);
    decorators.responsiveImages(product, apiProduct);
    decorators.promotions(product, options.promotions);
    decorators.texture(product, apiProduct);
    decorators.attributes(product, apiProduct.attributeModel);
    decorators.availability(product, options.quantity, apiProduct.minOrderQuantity.value, apiProduct.availabilityModel, apiProduct.custom.maxOrderQuantity);
    decorators.options(product, options.optionModel, options.variables, options.quantity);
    decorators.quantitySelector(product, apiProduct.stepQuantity.value, options.variables, options.options);
    decorators.powerReviewsVariationProducts(product, apiProduct);

    masterId(product, apiProduct);

    var category = apiProduct.getPrimaryCategory();
    if (!category && options.productType !== 'master' && options.productType === 'variant') {
        category = apiProduct.getMasterProduct().getPrimaryCategory();
    }

    if (category) {
        decorators.category(product, category);
    }
    if (apiProduct.custom.sizeChartId) {
        decorators.sizeChart(product, apiProduct.custom.sizeChartId);
    } else if (category) {
        decorators.sizeChart(product, category.custom.sizeChartID);
    }

    decorators.currentUrl(product, options.variationModel, options.optionModel, 'Product-Show', apiProduct.ID, options.quantity);
    decorators.readyToOrder(product, options.variationModel);
    decorators.online(product, apiProduct);
    decorators.raw(product, apiProduct);
    decorators.pageMetaData(product, apiProduct);
    decorators.template(product, apiProduct);

    return product;
};
