'use strict';

// SFRA Includes
var collections = require('*/cartridge/scripts/util/collections');
var ShippingModel = require('*/cartridge/models/shipping');

// Public (class) static model functions

/**
 * Plain JS object that represents a DW Script API dw.order.ShippingMethod object
 * @param {dw.order.Basket} currentBasket - the target Basket object
 * @param {Object} customer - the associated Customer Model object
 * @param {string} containerView - view of the shipping models (order or basket)
 * @returns {dw.util.ArrayList} an array of ShippingModels
 */
function getShippingModels(currentBasket, customer, containerView) {
    var Transaction = require('dw/system/Transaction');
    var shipments = currentBasket ? currentBasket.getShipments() : null;

    if (!shipments) return [];
    /*eslint-disable */
    for(var i = 0; i < shipments.length; i++){
        if(shipments[i].shippingAddress && shipments[i].shippingAddress.countryCode !== 'US'){
            Transaction.wrap(function(){
                shipments[i].shippingAddress.setCountryCode('US')
            })
        }
    }
    /*eslint-enable */

    return collections.map(shipments, function (shipment) {
        var shippingModel = new ShippingModel(shipment, null, customer, containerView);
        shippingModel.giftTo = shipment && shipment.custom ? shipment.custom.giftRecipient : null;
        shippingModel.giftFrom = shipment && shipment.custom ? shipment.custom.giftSender : null;
        shippingModel.email = (shipment && shipment.shippingAddress && shipment.shippingAddress.custom) ? shipment.shippingAddress.custom.email : null;

        var shippingAddress = shippingModel.shippingAddress;
        if (shippingAddress) {
            shippingAddress.giftTo = shippingModel.giftTo;
            shippingAddress.giftTo = shippingModel.giftFrom;
            shippingAddress.email = shippingModel.email;
            shippingAddress.companyName = shippingModel.shippingAddress.companyName;
        }

        shippingModel.shippingAddress = shippingAddress;

        return shippingModel;
    });
}


/*
 * Calculates the order weight.
 * @param {dw.order.Basket} currentBasket - the target Basket object
 */
function calculateOrderWeight(currentBasket) {
    var totalWeight = 0;
    var pliCollection = currentBasket.getAllLineItems();
    pliCollection.toArray().forEach(function (lineItem) {
        if (Object.prototype.hasOwnProperty.call(lineItem, 'product')) {
            if (Object.prototype.hasOwnProperty.call(lineItem.product, 'custom')) {
                if (Object.prototype.hasOwnProperty.call(lineItem.product.custom, 'weight')) {
                    var weight = lineItem.product.custom.weight;
                    totalWeight += (weight * lineItem.getQuantity());
                }
            }
        }
    });
    return totalWeight;
}

module.exports = {
    getShippingModels: getShippingModels,
    orderWeight: calculateOrderWeight
};
