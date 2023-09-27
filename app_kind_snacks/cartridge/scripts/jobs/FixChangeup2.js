/* eslint-disable */
'use strict';

/**
 * RemoveTokens.js
 *
 * Removes tokens
 */

// SFCC system class imports.
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
// Module level declarations.
var log = Logger.getLogger('cufcfix', 'cufcfix');

/**
 * Executes the migration scirpt
 */
function execute() {
    var OrderMgr = require('dw/order/OrderMgr');
    var collections = require('*/cartridge/scripts/util/collections');
    var Transaction = require('dw/system/Transaction');

    var orders = OrderMgr.searchOrders(
        'custom.changeupAgreedToDonate={0} AND custom.changeupDonationAmountCustomer!=NULL',
        'creationDate desc',
        true
    );
    while (orders.hasNext()) {
        var order = orders.next();
        var lineitems = order.getProductLineItems();
        collections.forEach(lineitems, function (lineItem) {
            if (lineItem.product.name == "ChangeUp for Charity Donation") {
                log.info("Fixed orderID " + order.orderNo);
                var num = order.custom.changeupDonationAmountCustomer;
                var theprice = new Money(num, "USD");
                Transaction.wrap(function () {
                    order.custom.changeupDonationAmountCustomer = theprice;
                    order.custom.changeupDonationAmountMerchant = Number(0).toFixed(2);
                    });           
                }
        });
    }
}

var countDecimals = function (value) { 
    if ((value % 1) != 0) 
        return value.toString().split(".")[1].length;  
    return 0;
};

/** Exported functions **/
module.exports = {
    execute: execute
};
