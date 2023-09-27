/* global empty */
'use strict';

var base = module.superModule;

var URLUtils = require('dw/web/URLUtils');

var ProductLineItemsModel = require('*/cartridge/models/productLineItems');
var ShippingHelpers = require('*/cartridge/scripts/checkout/shippingHelpers');

var DEFAULT_MODEL_CONFIG = {
    numberOfLineItems: '*'
};

/**
 * Returns the array that contains names of products in the order
 * @param {dw.order.LineItemContainer} lineItemContainer - line items
 * @return {Array} returns an array of order items' names
*/
function getProductLineItemNames(lineItemContainer) {
    var iterator = lineItemContainer.productLineItems.iterator();
    var res = [];

    while (iterator.hasNext()) {
        var productLineItem = iterator.next();
        if (!empty(productLineItem.product)) {
            res.push(productLineItem.product.name);
        }
    }

    return res;
}

/**
 * Modified to use large image and validation
 *
 * Returns the first productLineItem from a collection of productLineItems.
 * @param {Object} productLineItemsModel - line items model
 * @return {Object} returns an object with image properties
*/
function getFirstProductLineItem(productLineItemsModel) {
    if (productLineItemsModel && productLineItemsModel.items[0]) {
        var firstItemImage = productLineItemsModel.items[0].images.large[0];
        return {
            imageURL: firstItemImage ? firstItemImage.url : URLUtils.staticURL('images/noimagelarge.png'),
            alt: firstItemImage ? firstItemImage.alt : '',
            title: firstItemImage ? firstItemImage.title : ''
        };
    }
    return null;
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
    var productLineItemsModel = new ProductLineItemsModel(lineItemContainer.productLineItems, options.containerView);
    var safeOptions = options || {};
    var modelConfig = safeOptions.config || DEFAULT_MODEL_CONFIG;

    if (modelConfig.numberOfLineItems === 'single') {
        // To prevent possible errors where a product doesn't have an image, prevent base from handling "single", so we can do it right
        options.config.numberOfLineItems = 'single-override';
        modelConfig.numberOfLineItems = 'single-override';
    }

    // Run parent "constructor"
    base.apply(this, [lineItemContainer, options]);

    // Set up conditionals and, if appropriate, run the same functionality from base order for when numberOfLineItems is single
    if (modelConfig.numberOfLineItems === 'single-override') {
        var customer = safeOptions.customer || lineItemContainer.customer;
        var shippingModels = ShippingHelpers.getShippingModels(lineItemContainer, customer, options.containerView);

        if (shippingModels[0].shippingAddress) {
            this.firstLineItem = getFirstProductLineItem(productLineItemsModel);
            this.shippedToFirstName = shippingModels[0].shippingAddress.firstName || '';
            this.shippedToLastName = shippingModels[0].shippingAddress.lastName || '';
        }
    }

    this.itemNames = getProductLineItemNames(lineItemContainer);

    if (empty(this.items)) {
        this.items = productLineItemsModel;
    }
    this.productQuantityTotal = this.items.totalQuantity; // Use productLineItems model total quantity to account for BYOB
    if (!empty(this.orderStatus) && this.orderStatus.value === 4 && !empty(lineItemContainer.shippingStatus) && lineItemContainer.shippingStatus.value === 2) {
        this.orderStatus = {
            displayValue: lineItemContainer.shippingStatus.displayValue,
            value: 4.2 // Use custom amalgamation of the two statuses as status value, so we have something we know is unique
        };
    }
}

module.exports = OrderModel;
