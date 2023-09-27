'use strict';

function addLineItem(
    currentBasket,
    product,
    optionModel,
    defaultShipment
) {
    var productLineItem = currentBasket.createProductLineItem(
        product,
        optionModel,
        defaultShipment
    );

    return productLineItem;
}

function getQtyAlreadyInCart(productId, lineItems, uuid) {
    return 1;
}

function getExistingProductLineItemsInCart(product, productId, productLineItems, childProducts, options) {
    return {};
}

module.exports = {
    addLineItem: addLineItem,
    getExistingProductLineItemsInCart,
    getQtyAlreadyInCart: getQtyAlreadyInCart
};
