'use strict';

module.exports = function (object, lineItem) {
    var product = lineItem.masterProduct;
    if (product.isVariant()) {
        product = product.masterProduct;
    }
    var flavour = product.custom.flavor.displayValue;

    Object.defineProperty(object, 'gmFlavour', {
        enumerable: true,
        writable: true,
        value: flavour
    });
};

