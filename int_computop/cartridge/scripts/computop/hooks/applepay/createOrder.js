'use strict';

/* Script includes */
var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');
var PaymentMgr = require('dw/order/PaymentMgr');
var HookMgr = require('dw/system/HookMgr');
var customCheckoutHelpers = require('*/cartridge/scripts/checkout/customCheckoutHelpers');

exports.createOrder = function (basket, event) {
    var isCustomerAuthenticated = customer.isAuthenticated();
    
    if (isCustomerAuthenticated){
        /*
        Apple Pay payment sheet email and current regiestered user email could be different
        if this is the case, replace it with registered user email.
        */
        var customerNumber = basket.getCustomerNo();
        var CustomerProfile = CustomerMgr.getProfile(customerNumber);
        var customerEmailFromCustomerProfile = CustomerProfile.getEmail();
        var customerEmailFromBasket = basket.getCustomerEmail();
        if(customerEmailFromCustomerProfile != customerEmailFromBasket){
            Transaction.wrap(function () {
                basket.setCustomerEmail(customerEmailFromCustomerProfile);
            });
        } 
    }
    var shippingContactPhoneNumber = event["payment"]["shippingContact"]["phoneNumber"];
    var billingAddress = basket.getBillingAddress();
    if(!empty(shippingContactPhoneNumber)) {
        billingAddress.setPhone(shippingContactPhoneNumber);
    }

    var shipments = basket.shipments.iterator();
    while (shipments.hasNext()) {
        var shipment = shipments.next();
        if (empty(shipment.shippingAddress.custom.email)) {
            Transaction.wrap(function () {
                shipment.shippingAddress.custom.email = basket.getCustomerEmail();
            });
        }
        
    }

    // Adds custom attributes to basket before order creation
    var CustomOrderHelpers = require(
        '*/cartridge/scripts/checkout/customOrderHelpers');
    CustomOrderHelpers.addJDEAttributesToBasket();
};