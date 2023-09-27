/* global empty */

'use strict';

/**
 * socialCards.js
 * @module SocialCards
 *
 * Exports a single model class for passing metadata for social card meta tags
 * in the view data object in a consistant format.
 */

// meta tag types for social cards
var SOCIAL_CARD_FIELDS = ['URL', 'title', 'description', 'image', 'imageAlt'];

/**
 * A private helper function used to get the default values from the site
 * preference value configured in BM for each Social Card metadata value.
 *
 * @returns {{twitter: Object}} -
 *      Returns an Object literal with the default metadata values from the BM
 *      configuration set as properties of the object.
 */
function getDefaultSiteValues() {
    // SFCC API imports
    var Site = require('dw/system/Site');

    // Get the default preference values.
    var defaults = { twitter: {}, openGraph: {} };
    var site = Site.getCurrent();

    SOCIAL_CARD_FIELDS.forEach(function (fieldName) {
        ['tc', 'og'].forEach(function (prefix) {
            // name of the custom attribute.
            var prefName = prefix + fieldName.charAt(0).toUpperCase() +
                fieldName.substring(1);

            // Get the site preference defaults.
            var prefVal = site.getCustomPreferenceValue(prefName);

            // Add default attributes to the proper default object property.
            var prop = prefix === 'tc' ? defaults.twitter : defaults.openGraph;
            if (!empty(prefVal)) {
                if (fieldName === 'image') {
                    prop.image = prefVal.absURL.toString();
                } else if (fieldName === 'URL') {
                    prop.URL = prefVal.toString();
                } else {
                    prop[fieldName] = prefVal;
                }
            } else if (prefName === 'ocImageAlt') {
                var ocTitle = site.getCustomPreferenceValue('ocTitle');
                if (!empty(ocTitle)) {
                    prop[fieldName] = ocTitle;
                }
            }
        });
    });

    return defaults;
}

/**
 * A constructor function that is instantiated to create new SocialCard model
 * instances that contain metadata needed for rendering the social media card
 * meta tags (twitter & Open Graph).
 *
 * @constructor
 * @param {Object} [args] - An arguments object with key/val pair properties for
 *      any arguments needed for initialization of the class instance (optional).
 * @param {string} [args.currentUrl] - The URL of the current request.
 *      This is included as a parameter because this model is used from url
 *      includes (<isinclude url="..."/>) where the request has it's own context.
 * @param {Object} [args.socialCardsData] - Any social card data that has already
 *      been added to the view data. These values will take precendence over the
 *      defaults.
 */
function SocialCards(args) {
    // Get the default values and set the member properties.
    var defaults = getDefaultSiteValues();
    this.twitter = defaults.twitter;
    this.openGraph = defaults.openGraph;

    // Calculate any overrides to the defaults based on the passed in data.
    if (!empty(args)) {
        if (typeof args.currentUrl !== 'undefined') {
            this.twitter.URL = String(args.currentUrl);
            this.openGraph.URL = String(args.currentUrl);
        }

        // Get any existing social card keys in the view data.
        if (typeof args.socialCardsData !== 'undefined') {
            var socData = JSON.parse(args.socialCardsData);

            if (typeof socData.twitter !== 'undefined') {
                this.mergeViewData(socData.twitter, 'twitter');
            }

            if (typeof socData.openGraph !== 'undefined') {
                this.mergeViewData(socData.openGraph, 'openGraph');
            }
        }
    }
}

/**
 * Updates the model class instance with the values from the specified SFCC
 * system object's custom attributes, if they are configured.
 *
 * @memberof SocialCards
 * @param {dw.object.ExtensibleObject} sfccObject - The SFCC API class instance that
 *      will be used to fill the Twitter meta tags if the custom attributes have
 *      been configured in BM.
 */
SocialCards.prototype.updateMetaFromSystemObject = function (sfccObject) {
    var instance = this;

    if (!empty(sfccObject)) {
        var custom = sfccObject.getCustom();
        SOCIAL_CARD_FIELDS.forEach(
            function (fieldName) {
                ['tc', 'og'].forEach(function (prefix) {
                    // name of the custom attribute.
                    var prefName = prefix + fieldName.charAt(0).toUpperCase() +
                        fieldName.substring(1);
                    var prop = prefix === 'tc' ? instance.twitter :
                        instance.openGraph;

                    // If the custom attribute is defined then set the
                    // corresponding model property with the value of the attr.
                    if (prefName !== 'tcImageAlt' &&
                        typeof custom[prefName] !== 'undefined' &&
                        !empty(custom[prefName])
                    ) {
                        var prefVal = custom[prefName];
                        if (fieldName === 'URL') {
                            prop.URL = prefVal.toString();
                        } else if (fieldName === 'image') {
                            prop.image = prefVal.absURL.toString();
                        } else {
                            prop[fieldName] = prefVal;
                        }
                    } else if (prefName === 'ogImageAlt' &&
                        typeof custom.ogTitle !== 'undefined' &&
                        !empty(custom.ogTitle)
                    ) {
                        prop.imageAlt = custom.ogTitle;
                    }
                });
            }
        );
    }
};

/**
 * Sets the meta values for the social cards from the values of the custom
 * attributes of the product, or other custom rules.
 *
 * @memberof SocialCards
 * @param {string} productId - The product model instance that is attached to the
 *      product page's view data.
 */
SocialCards.prototype.updateMetaFromProduct = function (productId) {
    var instance = this;
    var ProductMgr = require('dw/catalog/ProductMgr');
    var product = ProductMgr.getProduct(productId);

    if (!empty(product)) {
        // Check if the values are set in the Product custom attribute values.
        var custom = product.getCustom();
        SOCIAL_CARD_FIELDS.forEach(
            function (fieldName) {
                ['tc', 'og'].forEach(function (prefix) {
                    // Get custom attribute name
                    var prefName = prefix + fieldName.charAt(0).toUpperCase() +
                        fieldName.substring(1);
                    var prop = prefix === 'tc' ? instance.twitter :
                        instance.openGraph;

                    // If the custom attribute is defined then set the
                    // corresponding model property with the value of the attr.
                    if (prefName !== 'tcImageAlt' &&
                        typeof custom[prefName] !== 'undefined' &&
                        !empty(custom[prefName])
                    ) {
                        prop[fieldName] = custom[prefName];
                    } else if (fieldName === 'image') {
                        // Set the fallback image to the first product image.
                        var image = product.getImages('large').toArray()[0];
                        var imgUrl;

                        if (image) {
                            imgUrl = image.getAbsImageURL({
                                scaleMode: 'fit'
                            });
                        }

                        if (!empty(imgUrl)) {
                            prop.image = imgUrl.toString();
                        }
                    } else if (prefName === 'ogImageAlt' &&
                        typeof custom.ogTitle !== 'undefined' &&
                        !empty(custom.ogTitle)
                    ) {
                        prop.imageAlt = custom.ogTitle;
                    }
                });
            }
        );
    }
};

/**
 * Gets any metadata values that were already included in the page view data,
 * and re-assigns them instead of using the default values.
 *
 * @param {Object} viewData - The passed in metadata object.
 * @param {string} dataType - The type of social card (twitter or openGraph).
 * @memberof SocialCards
 */
SocialCards.prototype.mergeViewData = function (viewData, dataType) {
    var instance = this;
    SOCIAL_CARD_FIELDS.forEach(function (fieldName) {
        if (typeof viewData[fieldName] !== 'undefined') {
            instance[dataType][fieldName] = viewData[fieldName];
        }
    });
};

module.exports = SocialCards;
