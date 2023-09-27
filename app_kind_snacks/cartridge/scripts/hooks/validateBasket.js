/* global empty */
'use strict';

var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');

var baseValidateBasket = require('app_storefront_base/cartridge/scripts/hooks/validateBasket');
var ProductFactory = require('*/cartridge/scripts/factories/product');

// Module level declarations
var byobLog = Logger.getLogger('byob', 'byob');


/**
 * Returns the box size for the given product
 * @param {dw.catalog.Product} product - The product to get the box count for
 * @returns {number} box size
 */
function getBoxSize(product) {
    var productModel = ProductFactory.get({
        pid: product.ID
    });

    var len = productModel.variationAttributes.length;

    var size;
    for (var i = 0; i < len; i++) {
        var attribute = productModel.variationAttributes[i];

        if (attribute.attributeId === 'size') {
            size = attribute.displayValue.replace(/[^0-9]/g, '');
            break;
        }
    }

    return parseInt(size, 10);
}


/**
 * validates BYOB box counts in the current users basket
 * @param {dw.order.Basket} basket - The current user's basket
 * @param {boolean} validateTax - boolean that determines whether or not to validate taxes
 * @returns {Object} an error object
 */
function validateBasket(basket, validateTax) {
    var result = baseValidateBasket.validateBasket(basket, validateTax);

    if (result.error) {
        return result;
    }

    var pliIterator = basket.getAllProductLineItems().iterator();

    var boxes = {};
    while (pliIterator.hasNext()) {
        var pli = pliIterator.next();

        if (!empty(pli.product) && pli.product.custom.isByobMaster && !empty(pli.custom.boxID)) {
            boxes[pli.custom.boxID] = {
                boxSize: getBoxSize(pli.product),
                boxCount: 0
            };
        } else if (!empty(pli.product) && !pli.product.custom.isByobMaster && !empty(pli.custom.boxID) && !empty(boxes[pli.custom.boxID])) {
            boxes[pli.custom.boxID].boxCount += pli.quantityValue;
        }
    }

    var boxIDs = Object.keys(boxes);
    for (var i = 0; i < boxIDs.length; i++) {
        var box = boxes[boxIDs[i]];

        if (box.boxSize !== box.boxCount) {
            // log error
            byobLog.error('Incorrect box count for box size. Expected: ' + box.boxSize + ', got: ' + box.boxCount);

            result = {
                error: true,
                message: Resource.msg('error.incorrectboxcount', 'cart', 'We’re sorry, but an error has occurred with your custom box. Please remove it and try again.')
            };
        }
    }

    return result;
}

exports.validateBasket = validateBasket;
