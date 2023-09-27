/* global empty */
'use strict';

/**
 * powerReviewsVariationProducts.js
 *
 * Defines the object models for each variation of master products for sending
 * with the Feedless product data on the PDP.
 */

/**
 * @class
 * @param {dw.catalog.Product} variationProduct - The variant that this instance
 *      will model as a JSON Object.
 */
function PRVariationProduct(variationProduct) {
    var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');
    var availabilityModel = variationProduct.getAvailabilityModel();
    var availabilityStatus = availabilityModel.getAvailabilityStatus();
    var productImages = variationProduct.getImages('large');
    var imgURL = !productImages.empty && !empty(productImages[0].httpsURL) ?
        productImages[0].httpsURL.toString() : '';

    /* Define the class members
       ====================================================================== */
    /** @member {string} - The ID used by PowerReviews for differentiating the variant products. */
    this.page_id_variant = variationProduct.ID;
    /** @member {boolean} - True if the product is in stock, otherwise false. */
    this.in_stock = availabilityStatus === ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK;
    /** @member {string} - The UPC for the variant product. */
    this.upc = !empty(variationProduct.UPC) ? variationProduct.UPC.trim() : '';
    /** @member {string} - The image URL for the product. */
    this.image_url = imgURL;
    /** @member {string} - The product's short description  */
    this.description = !empty(variationProduct.shortDescription) ?
        variationProduct.shortDescription : variationProduct.name;
}

/**
 * Gets an array of JSON objects for the variation products if there are any.
 * Returns an empty array if this is a product w/no variations (master & other).
 *
 * @param {dw.catalog.Product} product - The raw 'apiProduct' or SFCC product
 *      instance.
 * @returns {PRVariationProduct[]} - Returns an array of JSON Objects for the product's variations.
 */
function getPRVariations(product) {
    var variations = [];
    // If this is not a master product, use the master to get the variants.
    var master = product.master ? product : product.variationModel.master;

    if (master) {
        // Use the variation model to get the variants since this method filters out any offline
        // variants, and the Product.variants returns all variants including offline products.
        var variants = master.variationModel.variants;

        if (!variants.empty) {
            variants.toArray().forEach(function (variant) {
                variations.push(new PRVariationProduct(variant));
            });
        }
    }

    return variations;
}

/* Exported Decorator
   ========================================================================== */
module.exports = function (productModel, apiProduct) {
    var variantsArray = getPRVariations(apiProduct);
    Object.defineProperty(productModel, 'powerReviewsVariationProducts', {
        enumerable: true,
        writable: true,
        value: JSON.stringify(variantsArray)
    });
    return true;
};
