/* global empty */
'use strict';

var base = module.superModule || require('app_storefront_base/cartridges/app_storefront_base/cartridge/scripts/cart/cartHelpers');

var ProductMgr = require('dw/catalog/ProductMgr');
var Resource = require('dw/web/Resource');

var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

/**
 * Check if the bundled product can be added to the cart
 *
 * Because we only need to check parent availability model that has been stripped out here
 * Instead, check for a category on the child products, as the lack of one causes an issue in SFRA
 *
 * @param {string[]} childProducts - the products' sub-products
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {number} quantity - the number of products to the cart
 * @return {boolean} - return true if the bundled product can be added
 */
function checkBundledProductCanBeAdded(childProducts, productLineItems, quantity) {
    var canBeAdded = false;

    canBeAdded = childProducts.every(function (childProduct) {
        var apiChildProduct = ProductMgr.getProduct(childProduct.pid);

        return !empty(apiChildProduct) && (!empty(apiChildProduct.getPrimaryCategory()) || (apiChildProduct.variant && !empty(apiChildProduct.masterProduct) && !empty(apiChildProduct.masterProduct.getPrimaryCategory())));
    });

    return canBeAdded;
}

/**
 * Redeclared here to be made accessible, as method isn't exported in the module
 *
 * Filter the product line item matching productId and
 * has the same bundled items or options in the cart
 * @param {dw.catalog.Product} product - Product object
 * @param {string} productId - Product ID to match
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 * @return {dw.order.ProductLineItem} - get the first product line item matching productId and
 *     has the same bundled items or options
 */
function getExistingProductLineItemInCart(product, productId, productLineItems, childProducts, options) {
    return base.getExistingProductLineItemsInCart(product, productId, productLineItems, childProducts, options)[0];
}

/**
 * Updated canBeAdded to not use separate logic for bundles
 *
 * Adds a product to the cart. If the product is already in the cart it increases the quantity of
 * that product.
 * @param {dw.order.Basket} currentBasket - Current users's basket
 * @param {string} productId - the productId of the product being added to the cart
 * @param {number} quantity - the number of products to the cart
 * @param {string[]} childProducts - the products' sub-products
 * @param {SelectedOption[]} options - product options
 *  @return {Object} returns an error object
 */
function addProductToCart(currentBasket, productId, quantity, childProducts, options) {
    var availableToSell;
    var defaultShipment = currentBasket.defaultShipment;
    var perpetual;
    var product = ProductMgr.getProduct(productId);
    var productInCart;
    var productLineItems = currentBasket.productLineItems;
    var productQuantityInCart;
    var quantityToSet;
    var optionModel = productHelper.getCurrentOptionModel(product.optionModel, options);
    var result = {
        error: false,
        message: Resource.msg('text.alert.addedtobasket', 'product', null)
    };

    var totalQtyRequested = 0;
    var canBeAdded = false;

    totalQtyRequested = quantity + base.getQtyAlreadyInCart(productId, productLineItems);
    if (!empty(product.availabilityModel) && !empty(product.availabilityModel.inventoryRecord) && !empty(product.availabilityModel.inventoryRecord.perpetual)) {
        perpetual = product.availabilityModel.inventoryRecord.perpetual;
        canBeAdded =
            (perpetual
            || totalQtyRequested <= product.availabilityModel.inventoryRecord.ATS.value);

        if (product.bundle) {
            canBeAdded = canBeAdded && checkBundledProductCanBeAdded(childProducts, productLineItems, quantity);
        }
    }

    if (!canBeAdded) {
        result.error = true;
        result.message = Resource.msgf(
            'error.alert.selected.quantity.cannot.be.added.for',
            'product',
            null,
            product.name
        );
        return result;
    }

    productInCart = getExistingProductLineItemInCart(
        product, productId, productLineItems, childProducts, options);

    var isByob = !empty(product.custom.isByobMaster) && product.custom.isByobMaster;

    // For BYOB products, we want to hook into the API for creating a new product.  This way, if "repeats" are allowed, a new line item will be created every time
    if (productInCart && !isByob) {
        productQuantityInCart = productInCart.quantity.value;

        // if it's a fraud check item, only allow them to add one to the cart.
        if (!empty(product.custom.isCheckAddressFraud) && product.custom.isCheckAddressFraud) {
            if (!empty(quantity)) {
                quantityToSet = quantity;
            } else {
                quantityToSet = 1;
            }
        } else {
            quantityToSet = quantity ? quantity + productQuantityInCart : productQuantityInCart + 1;
        }
        availableToSell = productInCart.product.availabilityModel.inventoryRecord.ATS.value;

        if (availableToSell >= quantityToSet || perpetual) {
            productInCart.setQuantityValue(quantityToSet);
            result.uuid = productInCart.UUID;
        } else {
            result.error = true;
            result.message = availableToSell === productQuantityInCart
                ? Resource.msg('error.alert.max.quantity.in.cart', 'product', null)
                : Resource.msg('error.alert.selected.quantity.cannot.be.added', 'product', null);
        }
    } else {
        var productLineItem;
        productLineItem = base.addLineItem(
            currentBasket,
            product,
            quantity,
            childProducts,
            optionModel,
            defaultShipment,
            productLineItems
        );

        result.uuid = productLineItem.UUID;
    }

    return result;
}

base.addProductToCart = addProductToCart;

module.exports = base;
