/* global empty */'use strict';
var Site = require('dw/system/Site');
var Status = require('dw/system/Status');
var OrderMgr = require('dw/order/OrderMgr');
var Locale = require('dw/util/Locale');
var HashMap = require('dw/util/HashMap');

var OrderModel = require('*/cartridge/models/order');
var Transaction = require('dw/system/Transaction');


/**
 * Creates an order model for the current customer
 * @param {Object} req - the request object
 * @returns {Object} an object of the customer's order
 */
function getOrderDetails(req) {
    if (empty(req.querystring.ID)) {
        return null;
    }
    var order = OrderMgr.getOrder(req.querystring.ID);

    var config = {
        numberOfLineItems: '*'
    };

    var currentLocale = Locale.getLocale(req.locale.id);

    var orderModel = new OrderModel(
        order,
        { config: config, countryCode: currentLocale.country, containerView: 'order' }
    );

    return orderModel;
}
// eslint-disable-next-line valid-jsdoc
/**
 * Propagates an assertion if the specified objects are not equal.
 * @param {Object} arg1
 * @param {Object} arg2
 */
function areEqual(arg1, arg2) {
    if (arg1 !== arg2) {
        throw new Error("AssertionError");
    }
}

// eslint-disable-next-line valid-jsdoc
/**
 * The basic internal systemic fraud check hook.
 * This check should hold orders in Salesforce that meet a defined set of criteria until they can be manually reviewed and released.
 * This applies ONLY to storefront
 * @param {Object} req - the request object
 * @return {dw.system.Status}
 */
function fraudPrevention(req) {
    var site = Site.getCurrent();
    var fraudPreventionAmount = site.getCustomPreferenceValue('fraud_prevention_amount');
    var fraudPreventionAddressMatch = site.getCustomPreferenceValue('fraud_prevention_address_match'); // dw.value.EnumValue
    var orderModel = getOrderDetails(req);
    if (empty(fraudPreventionAmount) || Number(fraudPreventionAmount) === 0) {
        return new Status(Status.OK);
    }
    var sellectedAddressMatch = fraudPreventionAddressMatch.value.toString();

    var isPreventionAmountTrue = Number(orderModel.totals.grandTotalDecimal) >= Number(fraudPreventionAmount);
    if (!isPreventionAmountTrue) {
        return new Status(Status.OK);
    }

    try {
        var billing = orderModel.billing.billingAddress.address; // address1,address2, city, postalCode, stateCode
        var shipping = orderModel.shipping[0].shippingAddress; //  address1,address2, city, postalCode, stateCode

        var shippingMap = new HashMap();
        var billingMap = new HashMap();
        shippingMap.put("address1", shipping.address1.toLowerCase().trim());
        shippingMap.put("address2", empty(shipping.address2) ? null : shipping.address2.toLowerCase().trim());
        shippingMap.put("city", shipping.city.toLowerCase().trim());
        shippingMap.put("postalCode", shipping.postalCode.trim());
        shippingMap.put("stateCode", shipping.stateCode.toLowerCase().trim());

        billingMap.put("address1", billing.address1.toLowerCase().trim());
        billingMap.put("address2", empty(billing.address2) ? null : billing.address2.toLowerCase().trim());
        billingMap.put("city", billing.city.toLowerCase().trim());
        billingMap.put("postalCode", billing.postalCode.trim());
        billingMap.put("stateCode", billing.stateCode.toLowerCase().trim());

        switch (sellectedAddressMatch) {
            case '100':
                areEqual(shippingMap.get("address1"), billingMap.get("address1"));
                areEqual(shippingMap.get("address2"), billingMap.get("address2"));
                areEqual(shippingMap.get("city"), billingMap.get("city"));
                areEqual(shippingMap.get("postalCode"), billingMap.get("postalCode"));
                areEqual(shippingMap.get("stateCode"), billingMap.get("stateCode"));
                break;
            case '200':
                areEqual(shippingMap.get("city"), billingMap.get("city"));
                areEqual(shippingMap.get("postalCode"), billingMap.get("postalCode"));
                areEqual(shippingMap.get("stateCode"), billingMap.get("stateCode"));
                break;
            case '300':
                areEqual(shippingMap.get("postalCode"), billingMap.get("postalCode"));
                areEqual(shippingMap.get("stateCode"), billingMap.get("stateCode"));
                break;
            case '400':
                areEqual(shippingMap.get("postalCode"), billingMap.get("postalCode"));
                break;
            default:
                return new Status(Status.OK);
        }
    } catch (e) {
        if (empty(req.querystring.ID)) {
            return new Status(Status.OK);
        }
        var order = OrderMgr.getOrder(req.querystring.ID);
        Transaction.begin();
        order.custom.order_fraud_prevention_amount = fraudPreventionAmount;
        order.custom.order_fraud_prevention_address_match = sellectedAddressMatch;
        order.custom.order_is_fraud_prevention_address_match = true;
        order.exportStatus = order.EXPORT_STATUS_NOTEXPORTED;
        Transaction.commit();
        return new Status(Status.OK);
    }

    return new Status(Status.OK);
}

module.exports = {
    fraudPrevention: fraudPrevention
};
