/* global empty */
'use strict';

var Resource = require('dw/web/Resource');
var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var outOfStock = false;
var inStock = false;

// eslint-disable-next-line valid-jsdoc
/**
 * Currently SFCC is pulling in the backorder date from the Sellable Virtual sku inventory record and
 * not from the item component/each.
 *
 * @param {Object} object - The current product model object
 */
function getCustomAvailableDate(object) {
    var collection = require('*/cartridge/scripts/util/collections');
    var ProductMgr = require('dw/catalog/ProductMgr');
    var ArrayList = require('dw/util/ArrayList');
    var PropertyComparator = require('dw/util/PropertyComparator');
    var Site = require('dw/system/Site');

    try {
        var productId = object.id;
        var apiProduct = ProductMgr.getProduct(productId);
        var result = new ArrayList();
        var currentSite = Site.getCurrent();

        if ((currentSite.ID !== 'kind_b2b' && apiProduct.custom.showOnPDP) || (currentSite.ID === 'kind_b2b' && apiProduct.custom.showOnPDPB2B)) {
            collection.forEach(apiProduct.bundledProducts, function (pVariant) {
                var isInventoryRecordExist = Object.hasOwnProperty.call(pVariant.availabilityModel, 'inventoryRecord');
                if (isInventoryRecordExist) {
                    var inventoryRecord = pVariant.availabilityModel.inventoryRecord;
                    var isStockDateExist = Object.hasOwnProperty.call(inventoryRecord, 'inStockDate');
                    if (isStockDateExist) {
                        var inStockDate = inventoryRecord.inStockDate ? new Calendar(inventoryRecord.inStockDate) : null;
                        if (inStockDate !== null && pVariant.availabilityModel.availabilityStatus === 'BACKORDER') {
                            result.push(inStockDate);
                        }
                    }
                }
            });

            var pComparator = new PropertyComparator('time', false, false);
            result.sort(pComparator);
            var firstElement = collection.first(result);
            if (firstElement) {
                var inStockDate = StringUtils.formatCalendar(new Calendar(firstElement.time), 'MM/dd/yyyy');
                return inStockDate;
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

/**
 *
 * @param {Object} object - The current product model object
 * @param {number} maxOrderQuantity - The maximum number orderable quantity per order of the product
 * @returns {boolean} Whether or not the product's availability passes our custom validation
 */
function getCustomAvailability(object, maxOrderQuantity) {
    var BasketMgr = require('dw/order/BasketMgr');
    var cartHelpers = require('*/cartridge/scripts/cart/cartHelpers');

    var available = true;
    var currentBasket = BasketMgr.getCurrentBasket();

    // If the property isn't set, don't filter by it
    if (maxOrderQuantity < 1 || empty(currentBasket)) {
        return available;
    }

    var qtyInCart = cartHelpers.getQtyAlreadyInCart(object.id, currentBasket.getAllProductLineItems());
    available = available && qtyInCart < maxOrderQuantity;

    return available;
}

module.exports = function (object, quantity, minOrderQuantity, availabilityModel, maxOrderQuantityIn) {
    var maxOrderQuantity = maxOrderQuantityIn || -1;
    var customAvailability = getCustomAvailability(object, maxOrderQuantity);
    Object.defineProperty(object, 'availability', {
        enumerable: true,
        writable: true,
        value: (function () {
            var availability = {};
            availability.messages = [];
            var productQuantity = quantity ? parseInt(quantity, 10) : minOrderQuantity;
            var availabilityModelLevels = availabilityModel.getAvailabilityLevels(productQuantity);
            var inventoryRecord = availabilityModel.inventoryRecord;
            outOfStock = false; // Reset to ensure proper scoping
            inStock = false; // Reset to ensure proper scoping

            availability.inStockDate = null;
            if (inventoryRecord && inventoryRecord.inStockDate &&
                (availabilityModelLevels.preorder.value > 0 || availabilityModelLevels.backorder.value > 0)) {
                /*
                  SFCC Inventory Feed is Not Pulling Backorder Date Correctly
                  looks at the furthest date out for all components that are out of stock
                  and surfaces this date to the site for an OOS item.
                 */
                var customAvailableDate = getCustomAvailableDate(object);
                availability.inStockDate = customAvailableDate || StringUtils.formatCalendar(new Calendar(inventoryRecord.inStockDate), 'MM/dd/yyyy');
            }

            if (availabilityModelLevels.inStock.value > 0) {
                if (availabilityModelLevels.inStock.value === productQuantity) {
                    inStock = true;
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.quantity.in.stock',
                            'common',
                            null,
                            availabilityModelLevels.inStock.value
                        )
                    );
                }
            }

            if (availabilityModelLevels.preorder.value > 0) {
                if (availabilityModelLevels.preorder.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.preorder', 'common', null));
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.preorder.items',
                            'common',
                            null,
                            availabilityModelLevels.preorder.value
                        )
                    );
                }
            }

            if (availabilityModelLevels.backorder.value > 0) {
                if (availabilityModelLevels.backorder.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.back.order', 'common', null));
                } else {
                    availability.messages.push(
                        Resource.msgf(
                            'label.back.order.items',
                            'common',
                            null,
                            availabilityModelLevels.backorder.value
                        )
                    );
                }
            }

            if (availabilityModelLevels.notAvailable.value > 0) {
                outOfStock = true;

                if (availabilityModelLevels.notAvailable.value === productQuantity) {
                    availability.messages.push(Resource.msg('label.not.available', 'common', null));
                } else {
                    availability.messages.push(Resource.msg('label.not.available.items', 'common', null));
                }
            }

            return availability;
        }())
    });
    Object.defineProperty(object, 'available', {
        enumerable: true,
        writable: true,
        value: availabilityModel.isOrderable(parseFloat(quantity) || minOrderQuantity) && customAvailability
    });
    Object.defineProperty(object, 'outOfStock', {
        enumerable: true,
        writable: true,
        value: outOfStock
    });
    Object.defineProperty(object, 'inStock', {
        enumerable: true,
        writable: true,
        value: inStock
    });
};
