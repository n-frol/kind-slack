'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var PaymentMgr = require('dw/order/PaymentMgr');
var BasketMgr = require('dw/order/BasketMgr');
var ShippingMgr = require('dw/order/ShippingMgr');
var Money = require('dw/value/Money');
var HookMgr = require('dw/system/HookMgr');
var Status = require('dw/system/Status');
var Order = require('dw/order/Order');
var Logger = require('dw/system/Logger');

function createOrderFromShipment(order) {
    var orderNo = order.orderNo;
    var shipments = order.shipments;
    var methods = ShippingMgr.getAllShippingMethods().iterator();
    var customerMethod;
    var currency = order.currencyCode;
    var billingAddress = order.getBillingAddress();
    var name = {
        firstName: order.customer.profile.getFirstName(),
        lastName: order.customer.profile.getLastName()
    };

    while (methods.hasNext()) {
        var method = methods.next();
        if (method.getID() === 'premiumrate_Ground') {
            customerMethod = method;
            break;
        }
    }

    /*eslint-disable */
    for (var i = 0; i < shipments.length; i++) {
        var pli = shipments[i].getProductLineItems();
        var basket = BasketMgr.getCurrentOrNewBasket();
        var amount = new Money(new Number(0.00), currency);

        Transaction.wrap(function () {
            var order = OrderMgr.getOrder(orderNo);
            basket.setCustomerNo(order.customerNo);
            basket.setCustomerEmail(order.customerEmail);
            var shipment = createShipment(
                basket,
                shipments[i].shippingAddress,
                customerMethod,
                billingAddress,
                name
            );

            for (var j = 0; j < pli.length; j++) {
                var basketPli = basket.createProductLineItem(pli[j].productID, shipment);
                basketPli.setQuantityValue(pli[j].quantity.value);
                basketPli.setPriceValue(pli[j].proratedPrice.value);
                basketPli.setTax(pli[j].getAdjustedTax());
            }

            HookMgr.callHook('dw.order.calculate', 'calculate', basket);
            basket.removeAllPaymentInstruments();

            amount = new Money(basket.getAdjustedMerchandizeTotalPrice().getValue(), currency);
            var opi = basket.createPaymentInstrument('SPLIT_SHIPMENT', amount);
            var paymentTransaction = opi.getPaymentTransaction();
            var paymentProcessor = PaymentMgr.getPaymentMethod('SPLIT_SHIPMENT').getPaymentProcessor();
            paymentTransaction.setPaymentProcessor(paymentProcessor);

            try {
                var newOrder = OrderMgr.createOrder(basket);
                var placeOrderStatus = OrderMgr.placeOrder(newOrder);
                if (placeOrderStatus === Status.ERROR) {
                    OrderMgr.failOrder(newOrder);
                    return;
                }

                newOrder.custom.parentOrderId = orderNo;
                if (!empty(order.custom.paymentOperatorPayID)) {
                    newOrder.custom.paymentOperatorPaymentData = order.custom.paymentOperatorPaymentData;
                    newOrder.custom.paymentOperatorPaymentXID = order.custom.paymentOperatorPaymentXID;
                    newOrder.custom.paymentOperatorPPRefNr = order.custom.paymentOperatorPPRefNr;
                    newOrder.custom.paymentOperatorResponseCode = order.custom.paymentOperatorResponseCode;
                    newOrder.custom.parentOrderTotal = order.getAdjustedMerchandizeTotalPrice().getValue();
                    newOrder.custom.customerGroup = order.custom.customerGroup;
                }

                newOrder.custom.shipmentUUID = shipments[i].UUID;
                newOrder.custom.parentOrderPaymentMethod = order.getPaymentInstruments()[0].paymentMethod;
                newOrder.custom.orderPromotion = order.custom.orderPromotion;
                if (order.getPaymentInstruments()[0].paymentMethod === 'PAYMENTOPERATOR_CREDIT_DIRECT') {
                    newOrder.custom.parentOrderCCType = order.getPaymentInstruments()[0].creditCardType;
                }
                newOrder.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                newOrder.setExportStatus(Order.EXPORT_STATUS_READY);
            } catch (e) {
                Logger.error('split shipment error' + e);
            }
        });
    }
    /* eslint-enable */
}

function createShipment(basket, shippingAddressObject, customerMethod, billingAddressObject, name) {
    // each order will have a single default shipment
    var shipment = basket.getDefaultShipment();
    shipment.setShippingMethod(customerMethod);
    var shippingAddress = shipment.createShippingAddress();
    shippingAddress.setCompanyName('');
    shippingAddress.setFirstName(name.firstName);
    shippingAddress.setLastName(name.lastName);
    shippingAddress.setAddress1(shippingAddressObject.address1);
    shippingAddress.setAddress2(shippingAddressObject.address2 ? shippingAddressObject.address2 : '');
    shippingAddress.setCity(shippingAddressObject.city);
    shippingAddress.setPostalCode(shippingAddressObject.postalCode);
    shippingAddress.setStateCode(shippingAddressObject.stateCode);
    shippingAddress.setCountryCode(shippingAddressObject.countryCode);
    shippingAddress.setPhone(shippingAddressObject.phone);

    var billingAddress = basket.createBillingAddress();
    billingAddress.setFirstName(billingAddressObject.firstName);
    billingAddress.setLastName(billingAddressObject.lastName);
    billingAddress.setAddress1(billingAddressObject.address1);
    billingAddress.setAddress2(billingAddressObject.address2 ? billingAddressObject.address2 : '');
    billingAddress.setCity(billingAddressObject.city);
    billingAddress.setPostalCode(billingAddressObject.postalCode);
    billingAddress.setStateCode(billingAddressObject.stateCode);
    billingAddress.setCountryCode(billingAddressObject.countryCode);
    billingAddress.setPhone(billingAddressObject.phone);

    return shipment;
}


module.exports = {
    createOrderFromShipment: createOrderFromShipment
};
