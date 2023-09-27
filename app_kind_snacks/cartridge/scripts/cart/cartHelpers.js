/* global empty */
'use strict';

var ProductMgr = require('dw/catalog/ProductMgr');
var Transaction = require('dw/system/Transaction');

var collections = require('*/cartridge/scripts/util/collections');
var BONUS_PRODUCTS_PAGE_SIZE = 6;

var base = module.superModule;

/**
 * Replaces Bundle master product items with their selected variants
 *
 * @param {dw.order.ProductLineItem} apiLineItem - Cart line item containing Bundle
 * @param {string[]} childProducts - List of bundle product item ID's with chosen product variant
 *     ID's
 */
function updateBundleProducts(apiLineItem, childProducts) {
    var bundle = apiLineItem.product;
    var bundleProducts = bundle.getBundledProducts();
    var bundlePids = collections.map(bundleProducts, function (product) { return product.ID; });
    var selectedProducts = childProducts.filter(function (product) {
        return bundlePids.indexOf(product.pid) === -1;
    });
    var bundleLineItems = apiLineItem.getBundledProductLineItems();

    selectedProducts.forEach(function (product) {
        var variant = ProductMgr.getProduct(product.pid);

        collections.forEach(bundleLineItems, function (item) {
            if (!empty(variant) && variant.variant && item.productID === variant.masterProduct.ID) {
                item.replaceProduct(variant);
            }
        });
    });
}


/**
 * Adds a line item for this product to the Cart
 *
 * @param {dw.order.Basket} currentBasket -
 * @param {dw.catalog.Product} product -
 * @param {number} quantity - Quantity to add
 * @param {string[]}  childProducts - the products' sub-products
 * @param {dw.catalog.ProductOptionModel} optionModel - the product's option model
 * @param {dw.order.Shipment} defaultShipment - the cart's default shipment method
 * @param {dw.util.Collection} productLineItems - The existing product line items in the cart
 * @return {dw.order.ProductLineItem} - The added product line item
 */
function addLineItem(
    currentBasket,
    product,
    quantity,
    childProducts,
    optionModel,
    defaultShipment,
    productLineItems
) {
    var productLineItem = currentBasket.createProductLineItem(
        product,
        optionModel,
        defaultShipment
    );

    if (product.bundle && childProducts.length) {
        updateBundleProducts(productLineItem, childProducts);
    }

    var len = productLineItems ? productLineItems.length : 0;
    var isPrexistingLineItem = false;  // Gives us a way to check whether we're incrementing or adding a "repeat"

    for (var i = 0; i < len; i++) {
        var item = productLineItems[i];

        if (item.UUID === productLineItem.UUID) {
            isPrexistingLineItem = true;
            break;
        }
    }

    // If we're incrementing, we need to take the amount already in the cart into account
    if (isPrexistingLineItem) {
        // FR - We need to take into account the minimum order quantity
        var minQty = productLineItem.minOrderQuantityValue > 0 ? productLineItem.minOrderQuantityValue : 1;
        productLineItem.setQuantityValue((quantity - minQty) + productLineItem.quantityValue); // Subtract 1 from the quantity, since createProductLineItem already added 1
    } else {
        productLineItem.setQuantityValue(quantity);
    }

    return productLineItem;
}

/**
 * Sets a flag to exclude the quantity for a product line item matching the provided UUID.  When
 * updating a quantity for an already existing line item, we want to exclude the line item's
 * quantity and use the updated quantity instead.
 * @param {string} selectedUuid - Line item UUID to exclude
 * @param {string} itemUuid - Line item in-process to consider for exclusion
 * @return {boolean} - Whether to include the line item's quantity
 */
function excludeUuid(selectedUuid, itemUuid) {
    return selectedUuid
        ? itemUuid !== selectedUuid
        : true;
}

/**
 * Changes include updating the logic to correctly increment for BYOB boxes
 *
 * Calculate the quantities for any existing instance of a product, either as a single line item
 * with the same or different options, as well as inclusion in product bundles.  Providing an
 * optional "uuid" parameter, typically when updating the quantity in the Cart, will exclude the
 * quantity for the matching line item, as the updated quantity will be used instead.  "uuid" is not
 * used when adding a product to the Cart.
 *
 * @param {string} productId - ID of product to be added or updated
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems - Cart product line items
 * @param {string} [uuid] - When provided, excludes the quantity for the matching line item
 * @return {number} - Total quantity of all instances of requested product in the Cart and being
 *     requested
 */
function getQtyAlreadyInCart(productId, lineItems, uuid) {
    var qtyAlreadyInCart = 0;

    collections.forEach(lineItems, function (item) {
        if (item.bundledProductLineItems.length) {
            collections.forEach(item.bundledProductLineItems, function (bundleItem) {
                if (bundleItem.productID === productId && excludeUuid(uuid, bundleItem.UUID)) {
                    qtyAlreadyInCart += bundleItem.quantityValue;
                }
            });

            if (item.custom.isByobMaster && item.productID === productId && excludeUuid(uuid, item.UUID)) {
                qtyAlreadyInCart += item.quantityValue;
            }
        } else if (item.productID === productId && excludeUuid(uuid, item.UUID)) {
            qtyAlreadyInCart += item.quantityValue;
        }
    });
    return qtyAlreadyInCart;
}

/**
 * Check if the bundled product can be added to the cart
 * @param {string[]} childProducts - the products' sub-products
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - Collection of the Cart's
 *     product line items
 * @param {number} quantity - the number of products to the cart
 * @return {boolean} - return true if the bundled product can be added
 */
function checkBundledProductCanBeAdded(childProducts, productLineItems, quantity) {
    var atsValueByChildPid = {};
    var totalQtyRequested = 0;
    var canBeAdded = false;

    childProducts.forEach(function (childProduct) {
        var apiChildProduct = ProductMgr.getProduct(childProduct.pid);
        atsValueByChildPid[childProduct.pid] =
        apiChildProduct.availabilityModel.inventoryRecord.perpetual || apiChildProduct.availabilityModel.inventoryRecord.ATS.value;
    });

    canBeAdded = childProducts.every(function (childProduct) {
        var childPid = childProduct.pid;

        if (atsValueByChildPid[childPid] === true) {
            return true;
        }

        var bundleQuantity = quantity;
        var itemQuantity = bundleQuantity * childProduct.quantity;
        totalQtyRequested = itemQuantity + getQtyAlreadyInCart(childPid, productLineItems);
        return totalQtyRequested <= atsValueByChildPid[childPid];
    });

    return canBeAdded;
}

/**
 * Address any baskets that might have dropped the discount bonus amount due to OG subscription toggling
 *
 * @param {dw.order.Basket} basket Basket
 */
function checkBonusDiscountLines(basket) {
    /* eslint-disable */
    var blis = basket.getBonusDiscountLineItems();
    var plis = basket.getProductLineItems();
    var bonus;
    var product;
    var productToAttach;
    for (var i = 0; i < blis.length; i++) {
        bonus = blis[i];
        if (empty(bonus.custom.bonusProductLineItemUUID)) {
            for (var j = 0; j < plis.length; j++) {
                product = plis[j];
                if (product.custom.bonusProductLineItemUUID === 'bonus') {

                    Transaction.wrap(function () {
                        bonus.custom.bonusProductLineItemUUID = product.UUID;
                    });
                }
            }
        }else{
            var attached = false;
            var bonusPLIUUID = bonus.custom.bonusProductLineItemUUID;
            for (var j = 0; j < plis.length; j++) {
                product = plis[j];
                if(product.UUID == bonusPLIUUID){
                    attached = true;
                }else if(empty(productToAttach) && product.grossPrice > 0){
                    productToAttach = product;
                }
            }

            if(!attached && !empty(productToAttach)){
                var bonusProducts = bonus.bonusProductLineItems;
                for(var k = 0; k < bonusProducts.length; k++){
                    Transaction.wrap(function () {
                        bonusProducts[k].custom.bonusProductLineItemUUID = productToAttach.UUID;
                    });
                }

                Transaction.wrap(function () {
                    bonus.bonusProductLineItems[0].custom.bonusProductLineItemUUID = productToAttach.UUID;
                    bonus.custom.bonusProductLineItemUUID = productToAttach.UUID;
                    productToAttach.custom.bonusProductLineItemUUID = 'bonus';
                    productToAttach.custom.preOrderUUID = productToAttach.UUID;
                });

            }

        }
    }
    /* eslint-enable */
}

module.exports = {
    addLineItem: addLineItem,
    addProductToCart: base.addProductToCart,
    checkBonusDiscountLines: checkBonusDiscountLines,
    checkBundledProductCanBeAdded: checkBundledProductCanBeAdded,
    ensureAllShipmentsHaveMethods: base.ensureAllShipmentsHaveMethods,
    getQtyAlreadyInCart: getQtyAlreadyInCart,
    getNewBonusDiscountLineItem: base.getNewBonusDiscountLineItem,
    getExistingProductLineItemInCart: base.getExistingProductLineItemInCart,
    getExistingProductLineItemsInCart: base.getExistingProductLineItemsInCart,
    getMatchingProducts: base.getMatchingProducts,
    allBundleItemsSame: base.allBundleItemsSame,
    hasSameOptions: base.hasSameOptions,
    BONUS_PRODUCTS_PAGE_SIZE: BONUS_PRODUCTS_PAGE_SIZE,
    updateBundleProducts: base.updateBundleProducts,
    getReportingUrlAddToCart: base.getReportingUrlAddToCart
};
