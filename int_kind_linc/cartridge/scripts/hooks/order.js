/* global empty */

'use strict';

var Linc = require('*/cartridge/scripts/service/lincService');

/**
 *
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems: The product line items of the container
 * @return {Object} - Returns line item object
 */
function getLineItems(lineItems) {
    var items = [];
    var productLineItems = lineItems.iterator();
    while (productLineItems.hasNext()) {
        var productMgr = require('dw/catalog/ProductMgr');
        var URLUtils = require('dw/web/URLUtils');
        var lineItem = productLineItems.next();
        var isByobChild = empty(lineItem.custom.isByobMaster) && !empty(lineItem.custom.boxID);
        var isChangeUpItem = lineItem.productID === 'changeup-donation';
        var isProductNull = productMgr.getProduct(lineItem.productID) == null;

        if (!isByobChild && !isChangeUpItem && !isProductNull) {
            var product = productMgr.getProduct(lineItem.productID);
            var productImage = product.getImage('large');
            var productLink = URLUtils.https('Product-Show', 'pid', lineItem.productID).toString();
            var item = {
                variant_id: lineItem.productID,
                image: !empty(productImage) ? productImage.getAbsURL().toString() : " ",
                link: productLink,
                product_id: lineItem.productID,
                product_name: lineItem.productName,
                quantity: lineItem.quantity.getValue(),
                price: lineItem.price.getValue(),
                discount: lineItem.price.getValue() > 0 ? lineItem.price.subtract(lineItem.proratedPrice).getValue() : 0
            };
            items.push(item);
        }
    }
    return items;
}

/**
 *
 * @param {dw.order.Order} order: Order Object
 */
function processOrder(order) {
    var orderCustomer = order.getCustomer();
    var firstName;
    var lastName;
    var profile = !empty(orderCustomer) ?
    orderCustomer.profile : null;
    if (!empty(profile) && !empty(profile.firstName)) {
        firstName = profile.firstName;
    }

    if (!empty(profile) && !empty(profile.lastName)) {
        lastName = profile.lastName;
    }
    if (empty(firstName) &&
    !empty(order.billingAddress) &&
    !empty(order.billingAddress.firstName)
    ) {
        firstName = order.billingAddress.firstName;
    }

    if (empty(lastName) &&
        !empty(order.billingAddress) &&
        !empty(order.billingAddress.lastName)
    ) {
        lastName = order.billingAddress.lastName;
    }

    var body = {
        order_id: order.orderNo,
        user: {
            user_id: order.getCustomerNo(),
            first_name: firstName,
            last_name: lastName,
            email: order.customerEmail
        },
        billing_address: {
            first_name_b: order.billingAddress.firstName,
            last_name_b: order.billingAddress.lastName,
            phone: order.billingAddress.phone,
            address1: order.billingAddress.address1,
            address2: order.billingAddress.address2,
            city: order.billingAddress.city,
            province: order.billingAddress.stateCode,
            country: order.billingAddress.countryCode.getValue(),
            postal_code: order.billingAddress.postalCode
        },
        shipping_address: {
            first_name: order.shipments[0].shippingAddress.firstName,
            last_name: order.shipments[0].shippingAddress.lastName,
            phone: order.shipments[0].shippingAddress.phone,
            address1: order.shipments[0].shippingAddress.address1,
            address2: order.shipments[0].shippingAddress.address2,
            city: order.shipments[0].shippingAddress.city,
            province: order.shipments[0].shippingAddress.stateCode,
            country: order.shipments[0].shippingAddress.countryCode.getValue(),
            postal_code: order.shipments[0].shippingAddress.postalCode
        },
        locale: order.customerLocaleID,
        purchase_date: order.creationDate,
        subtotal_price: order.adjustedMerchandizeTotalPrice.getValue(),
        total_shipping: order.adjustedShippingTotalPrice.getValue(),
        total_tax: order.adjustedMerchandizeTotalTax.getValue(),
        total_discounts: order.totalGrossPrice.subtract(order.totalNetPrice).getValue(),
        total_price: order.totalGrossPrice.getValue(),
        currency: order.currencyCode,
        extra: [
            {
                name: "status",
                value: order.status.displayValue
            },
            {
                name: "payment_status",
                value: order.paymentStatus.getDisplayValue()
            },
            {
                name: "shipping_method",
                value: order.shipments[0].shippingMethod.displayName
            }
        ]
    };
    body.line_items = getLineItems(order.productLineItems);
    Linc.order(body);
}

function getCarrier(confirmedShipments) {
    var carrierCode = "";
    for (var i = 0; i < confirmedShipments.length; i++) {
        carrierCode = confirmedShipments[i].CarrierCode.toLocaleLowerCase();
        break;
    }
    return empty(carrierCode) ? "usps" : carrierCode;
}

function getTrackingNumbers(confirmedShipments) {
    var trackingNumber = [];
    for (var i = 0; i < confirmedShipments.length; i++) {
        trackingNumber.push(confirmedShipments[i].TrackingNumber);
        break;
    }
    return trackingNumber;
}

function getShippingDate(confirmedShipments) {
    var dateShipped = "";
    for (var i = 0; i < confirmedShipments.length; i++) {
        var date = confirmedShipments[i].DateShipped;
        // new Oms integration
        dateShipped = new Date(date).toISOString(); // 2020-09-13T17:50:49.000Z
        break;
    }
    return dateShipped;
}

/**
 *
 * @param {dw.util.Collection<dw.order.ProductLineItem>} lineItems: The product line items of the container
 * @param {Array} confirmedShipments Confirmed shipping items.
 * @return {Object} - Returns as the linc product list for shipped and canceled items
 */
function getLineItemsAdjustments(lineItems, confirmedShipments) {
    var cancelledItems = [];
    var shippedItems = [];
    var productLineItems = lineItems.iterator();
    while (productLineItems.hasNext()) {
        var lineItem = productLineItems.next();
        var isByobChild = empty(lineItem.custom.isByobMaster) && !empty(lineItem.custom.boxID);
        var isChangeUpItem = lineItem.productID === 'changeup-donation';
        if (!isByobChild && !isChangeUpItem) {
            var isItemShipped = confirmedShipments.filter(function (shipment) { // eslint-disable-line no-loop-func
                return shipment.ItemSku.toString() === lineItem.productID;
            });

            if (isItemShipped.length === 0) {
                cancelledItems.push({
                    product_id: lineItem.productID,
                    variant_id: lineItem.productID,
                    cancelled_quantity: lineItem.getQuantityValue()
                });
            } else {
                // If order item sku is found in the shipped but shipped quantity
                // different than ordered quantity adjust it on Linc
                var qtyShipped = new dw.value.Quantity(isItemShipped[0].QtyShipped, lineItem.quantity.unit); // eslint-disable-line no-undef
                if (qtyShipped.value < lineItem.quantity.value) {
                    cancelledItems.push({
                        product_id: lineItem.productID,
                        variant_id: lineItem.productID,
                        cancelled_quantity: lineItem.quantity.subtract(qtyShipped).getValue()
                    });
                    shippedItems.push({
                        product_id: lineItem.productID,
                        variant_id: lineItem.productID,
                        quantity: qtyShipped.getValue()
                    });
                } else {
                    shippedItems.push({
                        product_id: lineItem.productID,
                        variant_id: lineItem.productID,
                        quantity: qtyShipped.getValue()
                    });
                }
            }
        }
    }
    return { shippedItems: shippedItems, cancelledItems: cancelledItems };
}


/**
* @param {dw.order.Order} order: Order Object
*/
function processFulfillment(order) {
    var confirmedShipments = JSON.parse(order.custom.confirmedShipments);
    var adjustmentItems = getLineItemsAdjustments(order.productLineItems, confirmedShipments);
    var payLoad = {
        order_id: order.orderNo,
        carrier: getCarrier(confirmedShipments),
        tracking_number: getTrackingNumbers(confirmedShipments),
        fulfill_date: getShippingDate(confirmedShipments)
    };
    // If any adjustment require on product quantity or shipped item.
    if (adjustmentItems.shippedItems.length > 0) {
        payLoad.cancellation_type = "product";
        payLoad.products = adjustmentItems.shippedItems;
    }
    var body = [];
    body.push(payLoad);
    Linc.fulfillment(body);

    if (adjustmentItems.cancelledItems.length) {
        var payLoadCancelledItems = {
            order_id: order.orderNo,
            products: adjustmentItems.cancelledItems,
            cancellation_type: "product"
        };
        var cancelItemBody = [];
        cancelItemBody.push(payLoadCancelledItems);
        Linc.fulfillment(cancelItemBody);
    }
}

/**
 * @param {dw.order.Order} order: Order Object
 */
function processOrderCancel(order) {
    Linc.cancel(order.orderNo);
}


module.exports = {
    createOrder: processOrder,
    fulfillment: processFulfillment,
    cancelOrder: processOrderCancel
};
