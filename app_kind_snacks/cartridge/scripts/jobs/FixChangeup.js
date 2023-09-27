/* eslint-disable */
'use strict';

/**
 * RemoveTokens.js
 *
 * Removes tokens
 */

// SFCC system class imports.
var Logger = require('dw/system/Logger');

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
        'custom.changeupAgreedToDonate={0} AND custom.changeupDonationAmountCustomer!=NULL AND custom.changeupReportingConfirmationUUIDs=NULL',
        'creationDate desc',
        true
    );
    while (orders.hasNext()) {
        var order = orders.next();
        var lineitems = order.getProductLineItems();
        collections.forEach(lineitems, function (lineItem) {
            if (lineItem.product.name == "ChangeUp for Charity Donation") {
                var price = lineItem.proratedPrice;
                log.info("Fixed orderID " + order.orderNo + " with " + price.toFormattedString());
                Transaction.wrap(function () {
                order.custom.changeupDonationAmountCustomer = price.toFormattedString();
                order.custom.changeupDonationAmountMerchant = 0;
                });
            }
        });
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
