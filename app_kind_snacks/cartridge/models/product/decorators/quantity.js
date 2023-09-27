/* global empty */
'use strict';

var DEFAULT_MAX_ORDER_QUANTITY = 9;

var Decimal = require('dw/util/Decimal');
var variationHelpers = require('*/cartridge/scripts/helpers/variationHelpers');

/**
 * Gets the bundle item quantity
 *
 * @param {dw.catalog.Product} product - A product
 * @param {dw.value.Quantity} quantity - The quantity of the product
 * @returns {dw.value.Quantity} - The bundled quantity
 */
function getBundleItemQuantity(product, quantity) {
    var bundleQuantity = new Decimal(0);

    if (!empty(quantity)) {
        var quantityNumber = parseInt(quantity, 10);
        var QuantityDecimal = new Decimal(quantityNumber);
        bundleQuantity = QuantityDecimal;

        if (!empty(product.custom.totalItemQuantity)) {
            bundleQuantity = QuantityDecimal.multiply(product.custom.totalItemQuantity);
        }
    }

    return bundleQuantity;
}

/**
 * Gets the container type custom field
 * If the product is a master whose value isn't set, tries the default variant
 *
 * @param {dw.catalog.Product} product - A product
 * @returns {string} - The container type, if set
 */
function getContainerType(product) {
    var type = product.custom.containerType || '';
    if (empty(type) && product.master) {
        var defaultVar = product.variationModel.defaultVariant;

        if (!empty(defaultVar) && !empty(defaultVar.custom)) {
            type = defaultVar.custom.containerType || '';
        }
    }

    return type;
}

/**
 * Gets the total item quantity custom field
 * If the product is a master whose value isn't set, tries the default variant
 *
 * @param {dw.catalog.Product} product - A product
 * @returns {dw.value.Quantity} - The total item quantity, if set
 */
function getTotalItemQuantity(product) {
    var qty = product.custom.totalItemQuantity || '';
    var defaultVar;
    if (empty(qty) && product.master) {
        var visibleVariants = variationHelpers.methods.getVisibleVariants(product.variationModel);
        if (visibleVariants) {
            defaultVar = visibleVariants[0];
        } else {
            defaultVar = product.variationModel.defaultVariant;
        }

        if (!empty(defaultVar) && !empty(defaultVar.custom)) {
            qty = defaultVar.custom.totalItemQuantity || '';
        }
    }

    return qty;
}

/**
 * Gets the product type custom field
 * If the product is a master whose value isn't set, tries the default variant
 *
 * @param {dw.catalog.Product} product - A product
 * @returns {string} - The product type, if set
 */
function getProductType(product) {
    var type = product.custom.productType || '';
    if (empty(type) && product.master) {
        var defaultVar = product.variationModel.defaultVariant;

        if (!empty(defaultVar) && !empty(defaultVar.custom)) {
            type = defaultVar.custom.productType || '';
        }
    }

    return type;
}

module.exports = function (object, product, quantity) {
    var minOrderQty = product && product.minOrderQuantity ?
        product.minOrderQuantity.value : 1;
    Object.defineProperty(object, 'selectedQuantity', {
        enumerable: true,
        writable: true,
        value: !isNaN(parseInt(quantity, 10)) ? parseInt(quantity, 10) : minOrderQty
    });
    Object.defineProperty(object, 'minOrderQuantity', {
        enumerable: true,
        writable: true,
        value: product && product.minOrderQuantity ? product.minOrderQuantity.value : 1
    });
    Object.defineProperty(object, 'maxOrderQuantity', {
        enumerable: true,
        writable: true,
        value: DEFAULT_MAX_ORDER_QUANTITY
    });
    Object.defineProperty(object, 'containerType', {
        enumerable: true,
        writable: true,
        value: getContainerType(product)
    });
    Object.defineProperty(object, 'totalItemQuantity', {
        enumerable: true,
        writable: true,
        value: getTotalItemQuantity(product)
    });
    Object.defineProperty(object, 'bundleItemQuantity', {
        enumerable: true,
        writable: true,
        value: getBundleItemQuantity(product, quantity) || ''
    });
    // Have to change name so no overlap with default productType field
    Object.defineProperty(object, 'productTypeDetail', {
        enumerable: true,
        writable: true,
        value: getProductType(product)
    });
};
