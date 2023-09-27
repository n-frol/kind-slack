/* global empty */
'use strict';

var base = module.superModule;
var ArrayList = require('dw/util/ArrayList');
var ShippingUtil = require('*/cartridge/scripts/ShippingUtil');
var ProductFactory = require('*/cartridge/scripts/factories/product');

/**
 * Generate a product model to be used in the confirmedShipment as a line item
 *
 * @param {Object} shipment - The current confirmed shipment
 * @param {Object} lineItem - The productLineItem from the order that corresponds to the confirmed shipment's product SKU
 * @param {string} view - The containerView from the order model
 * @return {Object} newLineItem - The newly generated product model corresponding to the shipment product
 */
function confirmedShipmentLineItem(shipment, lineItem, view) {
    var params = {
        pid: shipment.ItemSku,
        variables: null,
        containerView: view
    };

    var newLineItem = ProductFactory.get(params);
    newLineItem.priceTotal = lineItem.priceTotal;
    newLineItem.quantity = shipment.QtyShipped;

    // Set data to display items in box in accordion like on order details page
    if (!empty(lineItem) && !empty(newLineItem.raw) && newLineItem.raw.custom.isByobMaster === true) {
        newLineItem.isByobMaster = newLineItem.raw.custom.isByobMaster;
        newLineItem.boxContents = lineItem.boxContents;
        newLineItem.boxId = lineItem.boxId;
        newLineItem.byobLineItems = lineItem.byobLineItems;
    }

    return newLineItem;
}

/**
 * Order class that represents the current order
 * @param {Object} confirmedShipments - JSON string of confirmed shipments
 * @param {Array} lineItems - The order's product line items
 * @param {Object} status - The current order status
 * @param {Object} options - The model's options
 * @return {dw.util.ArrayList} confirmedShipmentsSortedList - ArrayList where individual confirmedShipments have been grouped into JSONs by shipping id
 */
function sortConfirmedShipments(confirmedShipments, lineItems, status, options) {
    var Resource = require('dw/web/Resource');

    // Create unique copy of the order product line items
    // This will be used to copy the line items into confirmed shipments and handle any leftovers
    // Allows easy retrieval of line items by indexing by ID.  Also allows us to edit line items without editing the order.items
    var lineItemsTracker = {};

    // Loop through to create clean copy
    if (!empty(lineItems)) {
        var lineItemsLen = lineItems.length;
        for (var i = 0; i < lineItemsLen; i++) {
            var lineItem = lineItems[i];
            var lineItemCopy = {};

            Object.keys(lineItem).forEach(function (key) { // eslint-disable-line no-loop-func
                lineItemCopy[key] = lineItem[key];
            });

            lineItemsTracker[lineItem.id] = lineItemCopy;
        }
    }

    // Group individaul items by ShipmentNumber and merge duplicate items
    var confirmedShipmentsJSON = JSON.parse(confirmedShipments);
    var confirmedShipmentsSortedList = new ArrayList();
    var confirmedShipmentsSorted = {}; // Since ArrayList doesn't have mapped indices, maintain a partner JSON to help track existing shipments we want to add to

    var confirmedShipmentsLen = confirmedShipmentsJSON.length;
    for (var k = 0; k < confirmedShipmentsLen; k++) {
        var shipment = confirmedShipmentsJSON[k];
        if (!empty(shipment)) {
            var currentShipment = confirmedShipmentsSorted[shipment.ShipmentNumber];
            var origProductLineItem = lineItemsTracker[shipment.ItemSku];
            var product; // Initialize outside of conditional logic so linter doesn't get grumpy

            if (empty(currentShipment)) {
                currentShipment = {
                    BoxID: shipment.BoxID,
                    carrierCode: shipment.CarrierCode,
                    custumerPro: shipment.CustomerPro,
                    dateProcessed: shipment.DateProcessed,
                    dateShipped: shipment.DateShipped,
                    dateUpdated: shipment.DateUpdated,
                    id: shipment.ShipmentId,
                    isProcessed: shipment.IsProcessed,
                    number: shipment.ShipmentNumber,
                    orderNumber: shipment.OrderNumber,
                    orderSource: shipment.OrderSource,
                    orderType: shipment.OrderType,
                    products: {},
                    productLineItems: {
                        items: new ArrayList()
                    }, // Formatted to work with existing templates
                    status: status,
                    trackingNumber: shipment.TrackingNumber,
                    trackingUrl: ShippingUtil.getTrackingURL(shipment.CarrierCode, shipment.TrackingNumber),
                    warehouseId: shipment.WarehouseId
                };

                if (origProductLineItem) {
                    // Generate a new model to save
                    // (We can't use origProductLineItem because decrementing its quantity would affect the confirmedShipment product as well)
                    product = confirmedShipmentLineItem(shipment, origProductLineItem, options.containerView);

                    currentShipment.products[shipment.ItemSku] = product; // Save in JSON so we can easily retrieve it by its ID

                    currentShipment.productLineItems.items.push(product); // Copy to ArrayList so it exists an an iterable for the isml
                    confirmedShipmentsSortedList.push(currentShipment);
                    confirmedShipmentsSorted[shipment.ShipmentNumber] = currentShipment;
                }
            } else {
                currentShipment = confirmedShipmentsSortedList[confirmedShipmentsSortedList.indexOf(currentShipment)];

                if (!empty(currentShipment.products[shipment.ItemSku])) {
                    product = currentShipment.products[shipment.ItemSku];
                    var productLineItem = currentShipment.productLineItems.items[currentShipment.productLineItems.items.indexOf(product)];

                    product.quantity += shipment.QtyShipped;
                    productLineItem.quantity += shipment.QtyShipped;
                } else if (origProductLineItem) {
                    // Generate a new model to save
                    // (We can't use origProductLineItem because decrementing its quantity would affect the confirmedShipment product as well)
                    product = confirmedShipmentLineItem(shipment, origProductLineItem, options.containerView);

                    currentShipment.products[shipment.ItemSku] = product; // Save in JSON so we can easily retrieve it by its ID

                    currentShipment.productLineItems.items.push(product); // Copy to ArrayList so it exists an an iterable for the isml
                }
            }
            if (!empty(origProductLineItem)) {
                // Decrement from the tracker quantity and remove if needed
                // Allows us to know what is leftover
                origProductLineItem.quantity -= shipment.QtyShipped;
                if (origProductLineItem.quantity === 0) {
                    delete lineItemsTracker[shipment.ItemSku];
                }
            }
        }
    }

    // Add remaining, unshipped line items to a "shipment" to be added to the page
    if (!empty(lineItemsTracker)) {
        var lineItemsTrackerKeys = Object.keys(lineItemsTracker);

        // Make sure empty() hasn't handled the JSON
        if (lineItemsTrackerKeys.length) {
            var unshippedShipment = {
                id: 'unshipped products',
                productLineItems: {
                    items: []
                },
                status: {
                    displayValue: Resource.msg('order.summary.shipping.notshipped', 'order', null)
                }
            };

            // Copy items in lineItemsTracker JSON to iterable ArrayList
            lineItemsTrackerKeys.forEach(function (key) {
                var lineItem = lineItemsTracker[key]; // eslint-disable-line no-shadow

                // BYOB box contents aren't displaying as separate items in the history, so don't add them to a shipment as if they are
                if (empty(lineItem.boxId) || lineItem.isByobMaster === true) {
                    unshippedShipment.productLineItems.items.push(lineItem);
                }
            });

            if (unshippedShipment.productLineItems.items.length > 0) {
                confirmedShipmentsSortedList.push(unshippedShipment);
            }
        }
    }


    return confirmedShipmentsSortedList;
}

/**
 * Order class that represents the current order
 * @param {dw.order.LineItemCtnr} lineItemContainer - Current users's basket/order
 * @param {Object} options - The current order's line items
 * @param {Object} options.config - Object to help configure the orderModel
 * @param {string} options.config.numberOfLineItems - helps determine the number of lineitems needed
 * @param {string} options.countryCode - the current request country code
 * @constructor
 */
function OrderModel(lineItemContainer, options) {
    // Run parent "constructor"
    base.apply(this, [lineItemContainer, options]);

    if (!empty(lineItemContainer) && Object.hasOwnProperty.call(lineItemContainer.custom, 'confirmedShipments')) {
        this.confirmedShipments = lineItemContainer.custom.confirmedShipments;

        this.confirmedShipmentsSortedList = sortConfirmedShipments(this.confirmedShipments, this.items.items, this.orderStatus, options);
    }
}

module.exports = OrderModel;
