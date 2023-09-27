/* global empty */
'use strict';

/**
 * API Includes
 */
var CatalogMgr = require('dw/catalog/CatalogMgr');
var URLUtils = require('dw/web/URLUtils');

function getOccasions(Product) {
    var occasionsArray = [];

    if (!empty(Product.custom.occasion)) {
        var Occasion = Product.custom.occasion;
        for (var i = 0; Occasion.length > i; i++) {
            var value = Occasion[i].value;
            if (!empty(value)) {
                var occasionCategory = CatalogMgr.getCategory(value);
                if (!empty(occasionCategory)) {
                    occasionsArray.push({
                        value: Occasion[i].displayValue,
                        URL: URLUtils.https('Search-Show', 'cgid', value)
                    });
                }
            }
        }
    }

    return occasionsArray;
}

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'occasion', {
        enumerable: true,
        writable: true,
        value: getOccasions(apiProduct)
    });
};
