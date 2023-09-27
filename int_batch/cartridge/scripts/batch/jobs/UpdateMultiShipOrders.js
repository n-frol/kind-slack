
'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');

function updateOrderStatus() {
    var shippingStatus = dw.order.Shipment.SHIPPING_STATUS_SHIPPED;
    var query = 'exportStatus =' + dw.order.Order.EXPORT_STATUS_EXPORTED + ' AND custom.multiShipIsProcessed = true';
    var orders = OrderMgr.searchOrders(query, 'orderNo asc', null);

    while (orders.hasNext()) {
        var order = orders.next();
        var shipments = order.getShipments();
        var numberOfShipments = shipments.length;
        var count = 0;

        for (var i = 0; i < shipments.length; i++) {
            if (shipments[i].shippingStatus === shippingStatus) {
                ++count;
            }
        }

        if (numberOfShipments === count) {
            // ORDER_STATUS_COMPLETED
            /*eslint-disable */
            Transaction.wrap(function () {
                order.setStatus(dw.order.Order.ORDER_STATUS_COMPLETED);
            });
            /* eslint-enable */
        }
    }
}

module.exports = {
    execute: updateOrderStatus
};