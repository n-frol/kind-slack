'use strict';

module.exports = function (object, lineItem) {
    if (lineItem.shipment) {
        Object.defineProperty(object, 'shipmentUUID', {
            enumerable: true,
            writable: true,
            value: lineItem.shipment.UUID
        });
    }
};
