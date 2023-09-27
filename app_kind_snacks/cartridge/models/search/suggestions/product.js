/* global empty */
'use strict';

var SuggestModel = require('dw/suggest/SuggestModel');
var URLUtils = require('dw/web/URLUtils');
var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
var ACTION_ENDPOINT = 'Product-Show';
var IMAGE_SIZE = 'large';


/**
 * Get Image URL
 *
 * @param {dw.catalog.Product} product - Suggested product
 * @return {string} - Image URL
 */
function getImageUrl(product) {
    if (empty(product)) {
        return '';
    }

    var imageProduct = product;
    if (product.master) {
        imageProduct = product.variationModel.defaultVariant;
    }
    if (empty(imageProduct.getImage(IMAGE_SIZE))) {
        return '';
    }
    return imageProduct.getImage(IMAGE_SIZE).URL.toString();
}

// Get responsive images of specific sizes for search thumbnail
function responsiveSearchImages(product) {
    var images = product.getImages('large').toArray();
    var responsiveImages = [];

    if (!empty(images)) {
        images.forEach(function (image) {
            responsiveImages.push({
                normal: responsiveImageUtils.getResponsiveImage(image, 230),
                small: responsiveImageUtils.getResponsiveImage(image, 60)
            });
        });
    }

    return responsiveImages;
}

/**
 * Compile a list of relevant suggested products
 *
 * @param {dw.util.Iterator.<dw.suggest.SuggestedProduct>} suggestedProducts - Iterator to retrieve
 *                                                                             SuggestedProducts
*  @param {number} maxItems - Maximum number of products to retrieve
 * @return {Object[]} - Array of suggested products
 */
function getProducts(suggestedProducts, maxItems) {
    var searchHelper = require('*/cartridge/scripts/helpers/searchHelpers');

    var product = null;
    var products = [];

    for (var i = 0; i < maxItems; i++) {
        if (suggestedProducts.hasNext()) {
            product = suggestedProducts.next().productSearchHit.product;

            if (searchHelper.isShownInGlobalSearch(product.ID) === true) {
                products.push({
                    id: product.ID,
                    name: product.name,
                    imageUrl: getImageUrl(product),
                    responsiveImages: responsiveSearchImages(product),
                    url: URLUtils.url(ACTION_ENDPOINT, 'pid', product.ID)
                });
            }
        }
    }

    return products;
}

/**
 * @typedef SuggestedPhrase
 * @type Object
 * @property {boolean} exactMatch - Whether suggested phrase is an exact match
 * @property {string} value - Suggested search phrase
 */

/**
 * Compile a list of relevant suggested phrases
 *
 * @param {dw.util.Iterator.<dw.suggest.SuggestedPhrase>} suggestedPhrases - Iterator to retrieve
 *                                                                           SuggestedPhrases
 * @param {number} maxItems - Maximum number of phrases to retrieve
 * @return {SuggestedPhrase[]} - Array of suggested phrases
 */
function getPhrases(suggestedPhrases, maxItems) {
    var phrase = null;
    var phrases = [];

    for (var i = 0; i < maxItems; i++) {
        if (suggestedPhrases.hasNext()) {
            phrase = suggestedPhrases.next();
            phrases.push({
                exactMatch: phrase.exactMatch,
                value: phrase.phrase
            });
        }
    }

    return phrases;
}

/**
 * @constructor
 * @classdesc ProductSuggestions class
 *
 * @param {dw.suggest.SuggestModel} suggestions - Suggest Model
 * @param {number} maxItemsIn - Maximum number of items to retrieve
 */
function ProductSuggestions(suggestions, maxItemsIn) {
    var maxItems = maxItemsIn;
    var productSuggestions = suggestions.productSuggestions;

    if (!productSuggestions) {
        this.available = false;
        this.phrases = [];
        this.products = [];
        return;
    }

    this.products = getProducts(productSuggestions.suggestedProducts, maxItems);
    maxItems++;

    // Try and get unblocked suggestions until we hit the max, so that blocking a suggestion doesn't return too few results
    while (this.products.length < maxItemsIn && maxItems <= SuggestModel.MAX_SUGGESTIONS) {
        // No need to alter the suggestions object on the first iteration, where the two maxes will be equal
        if (maxItems !== maxItemsIn) {
            suggestions.setMaxSuggestions(maxItems);
        }

        productSuggestions = suggestions.productSuggestions;

        // If the number of suggestions is less than the max, we've run out of applicable suggestions, so stop
        if (productSuggestions.suggestedProducts.asList().size() < maxItems) {
            break;
        }

        this.products = getProducts(productSuggestions.suggestedProducts, maxItems);
        maxItems++;
    }

    this.available = productSuggestions.hasSuggestions();
    var searchPhrasesSuggestions = productSuggestions.searchPhraseSuggestions;
    this.phrases = getPhrases(searchPhrasesSuggestions.suggestedPhrases, maxItems);
}

module.exports = ProductSuggestions;
