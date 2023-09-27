'use strict';

/* Script includes */

exports.placeOrder = function (order) {
    var customer = order.getCustomer();
    var customerGroups = customer.getCustomerGroups();
    // Adds custom attributes to basket before order creation
    var CustomOrderHelpers = require(
        '*/cartridge/scripts/checkout/customOrderHelpers');
    var cgId = CustomOrderHelpers.codify(customerGroups);
    if (!empty(cgId)) {
        order.getCustom().customerGroup = cgId;
    }
};