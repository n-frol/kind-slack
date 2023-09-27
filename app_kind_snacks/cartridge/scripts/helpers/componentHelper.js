/* global empty */
'use strict';

/**
 * API Includes
 */
var URLUtils = require('dw/web/URLUtils');

/**
 * Script Includes
 */
var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');

/**
 * Get component object
 *
 * @param {dw.catalog.Recommendation} Recommendation - A recommendation
 * @returns {Object} - component object
 */
function getComponentObject(Recommendation) {
    if (!empty(Recommendation)) {
        var Product = Recommendation.getRecommendedItem();

        if (!empty(Product)) {
            var image = Product.getImage('large');
            var normalImage;

            if (!empty(image)) {
                normalImage = responsiveImageUtils.getResponsiveImage(image, 192);
            }

            return {
                id: Product.ID,
                name: Product.name,
                url: URLUtils.https('Product-Show', 'pid', Product.ID),
                quantityDescription: Recommendation.custom.quantityDescription,
                image: normalImage
            };
        }
    }
    return undefined;
}

/**
 * Get components
 *
 * @param {dw.catalog.Product} Product - Product which you want to retrieve the recommendations for
 * @returns {Array} - components array
 */
function getComponents(Product) {
    var componentsArray = [];
    if (!empty(Product)) {
        var components = Product.getRecommendations(2);
        if (!empty(components)) {
            for (var i = 0; components.length > i; i++) {
                var component = getComponentObject(components[i]);
                componentsArray.push(component);
            }
        }
    }
    return componentsArray;
}

module.exports = {
    getComponents: getComponents
};

