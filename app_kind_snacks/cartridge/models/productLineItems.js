/* global empty */
// 'use strict';

var base = module.superModule;

var Resource = require('dw/web/Resource');

var collections = require('*/cartridge/scripts/util/collections');
var responsiveImageUtils = require('*/cartridge/scripts/util/responsiveImageUtils');
var ArrayList = require('dw/util/ArrayList');

function filterChangeUpProduct(items) {
    // return items;
    var result = new ArrayList();
    collections.forEach(items, function (lineItem) {
        if (lineItem.productID !== 'changeup-donation') {
            result.add(lineItem);
        }
    });
    return result;
}

/**
 * Loops through all of the product line items and adds the quantities together.
 * @param {dw.util.Collection<dw.order.ProductLineItem>} items - All product
 * line items of the basket
 * @returns {number} a number representing all product line items in the lineItem container.
 */
function getTotalQuantity(items) {
    // TODO add giftCertificateLineItems quantity
    var totalQuantity = 0;
    collections.forEach(items, function (lineItem) {
        if (empty(lineItem.custom.boxID) || (!empty(lineItem.product) && lineItem.product.custom.isByobMaster)) {
            totalQuantity += lineItem.quantity.value;
        }
    });

    return totalQuantity;
}

/**
 * @constructor
 * @classdesc class that represents a collection of line items and total quantity of
 * items in current basket or per shipment
 *
 * @param {dw.util.Collection<dw.order.ProductLineItem>} productLineItems - the product line items
 *                                                       of the current line item container
 * @param {string} view - the view of the line item (basket or order)
 */
function ProductLineItems(productLineItems, view) {
    var newLineItems = filterChangeUpProduct(productLineItems);
    base.apply(this, [newLineItems, view]);

    // Update for BYOB products
    // No need to update if there's no products
    if (this.totalQuantity > 0) {
        this.totalQuantity = getTotalQuantity(newLineItems);
    }
    // Thanks to js object properties, changes to an item inside itemsJson also updates the source in this.items
    var itemsJson = {};
    var byobBoxesJson = {}; // Tracks the BYOB box ID and/or the line items inside of it.  Allows for mapping the line items to their containing box

    var len = this.items.length;
    // Remap to allow for inserting images to the correct location
    for (var i = 0; i < len; i++) {
        var item = this.items[i];
        itemsJson[item.UUID] = item;

        if (!empty(item.bonusProducts)) {
            var bonusLen = item.bonusProducts.length;

            for (var j = 0; j < bonusLen; j++) {
                var bonusItem = item.bonusProducts[j];

                itemsJson[bonusItem.UUID] = bonusItem;
            }
        }
        if (!empty(item.boxId)) {
            if (!byobBoxesJson[item.boxId]) {
                byobBoxesJson[item.boxId] = {
                    items: [],
                    uuid: null
                };
            }

            if (item.isByobMaster) {
                byobBoxesJson[item.boxId].boxUuid = item.UUID;

                // We can reasonably expect to for all of the child BYOB items to be coming after, but check just to be sure
                if (!empty(byobBoxesJson[item.boxId].items)) {
                    item.byobLineItems = byobBoxesJson[item.boxId].items; // Get the items if any have been parsed already
                } else {
                    item.byobLineItems = [];
                }
            } else {
                item.options = item.options || [];
                item.options.push(Resource.msg('label.byob.qtyinbox', 'product', null) + ': ' + item.quantity); // Set it so the quantity in the box appears

                // We can reasonably expect to for this to be happening after the containing box has been handled, but check just to be sure
                if (empty(byobBoxesJson[item.boxId].boxUuid)) {
                    byobBoxesJson[item.boxId].items.push(item); // Box hasn't been set up, save the items for when we get to it
                } else {
                    // Box has been set up, so get it and pass the item right in
                    var box = itemsJson[byobBoxesJson[item.boxId].boxUuid];
                    box.byobLineItems.push(item);
                }
            }
        }
    }

    collections.forEach(newLineItems, function (lineItem) {
        if (empty(itemsJson[lineItem.UUID])) { return; }
        if (!lineItem.product || empty(lineItem.product.getImages('large')) || !empty(itemsJson[lineItem.UUID].responsiveImages)) { return; }
        itemsJson[lineItem.UUID].responsiveImages = [{ normal: responsiveImageUtils.getResponsiveImage(lineItem.product.getImages('large')[0], 125) }];
    });
}

ProductLineItems.getTotalQuantity = getTotalQuantity;

module.exports = ProductLineItems;
