/* global empty */

'use strict';

// SFCC system class imports.
var YotpoLoyalty = require('*/cartridge/scripts/service/yotpoLoyaltyService');

function createOrder(order, items, totalAmount, totalDiscountAmount, coupons) {
    var isClbOrder = order.productLineItems.toArray().some(function (lineItem) {
        return Object.hasOwnProperty.call(lineItem.custom, 'endUseCode') ? lineItem.custom.endUseCode === 'CLB' : false;
    });

    let yotpoCreateOrder = {
        customer_email: order.customerEmail,
        customer_id: order.customerNo,
        total_amount_cents: totalAmount * 100,
        currency_code: order.currencyCode,
        order_id: order.orderNo,
        created_at: order.creationDate,
        discount_amount_cents: totalDiscountAmount * 100,
        coupon_code: coupons,
        items: items,
        tags: isClbOrder ? "ordergroove subscription order" : ""
    };
    let response = YotpoLoyalty.createOrder(yotpoCreateOrder);
    return response;
}

/**
 *
 * @param {dw.order.Order} order: Order Object
 * @param {dw.value.Money} settlement: JDE settlement amount
 */
function processOrder(order, settlement) {
    if (empty(order.custom.confirmedShipments)) {
        throw new Error('Order data does not contain required confirmedShipments property!');
    }

    var confirmedShipments = JSON.parse(order.custom.confirmedShipments);
    var orderLineItems = order.allProductLineItems;
    if (!empty(confirmedShipments) && !empty(orderLineItems)) {
        var items = [];
        let merchandizeTotalPrice = order.merchandizeTotalPrice;
        let adjustedMerchandizeTotalPrice = order.adjustedMerchandizeTotalPrice;
        let totalDiscountAmount = merchandizeTotalPrice.subtract(adjustedMerchandizeTotalPrice);
        let shippingTotalPrice = order.adjustedShippingTotalPrice;
        let totalTax = order.totalTax;
        let calculatedTotalPointAmount = settlement.subtract(shippingTotalPrice).subtract(totalTax);
        let coupons = [];

        for (var i = 0; i < confirmedShipments.length; i++) {
            let productLineItems = orderLineItems.iterator();
            let productID = confirmedShipments[i].ItemSku;
            while (productLineItems.hasNext()) {
                let productLineItem = productLineItems.next();
                if (productLineItem.productID === productID && !productLineItem.isBundledProductLineItem()
                     && productLineItem.adjustedPrice > 0) {
                    let baseAdjustedPrice = productLineItem.adjustedPrice.divide(productLineItem.quantity.value);
                    let item = {
                        name: productLineItem.getProductName(),
                        price_cents: baseAdjustedPrice.getValue() * 100,
                        type: productLineItem.custom.endUseCode,
                        quantity: productLineItem.getQuantityValue()
                    };
                    items.push(item);
                }
            }
        }
        let couponLineItems = order.couponLineItems.iterator();
        while (couponLineItems.hasNext()) {
            let couponLineItem = couponLineItems.next();
            coupons.push(couponLineItem.couponCode);
        }
        let yotpoCoupons = coupons.length !== 0 ? coupons.join(',') : "";
        createOrder(order, items, calculatedTotalPointAmount.getValue(), totalDiscountAmount.getValue(), yotpoCoupons);
    }
}


/**
 * Send a new refund to the Swell API to adjust previously processed order.
 * Requests are processed asynchronously.
 *
 * @param {string} orderId: Order id for refund
 * @param {dw.value.Money} refundAmount: Refund amount which is going to refund
 * @return {Object} response : Response from yotpo web service
 */
function processRefund(orderId, refundAmount) {
    let response = YotpoLoyalty.refundOrder({
        order_id: orderId,
        total_amount_cents: refundAmount.getValue() * 100
    });
    return response;
}


module.exports = {
    processOrder: processOrder,
    processRefund: processRefund
};
