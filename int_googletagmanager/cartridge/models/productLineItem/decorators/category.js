'use strict';

module.exports = function (object, lineItem) {

    var category = null;
    var product =lineItem.product;
    if (!empty(product) && product.isVariant()) {
        product = product.masterProduct;
    }
    if (!empty(lineItem.category)) {
        category = getCategoryPath(lineItem.category);
    }
    else if (!empty(product)) {
        if (!empty(product.primaryCategory)) {
            category = product.primaryCategory.ID;
        }
        else if (!empty(product.classificationCategory)) {
            category = product.classificationCategory.ID;
        }
    }

    Object.defineProperty(object, 'category', {
        value: category
    });
};


