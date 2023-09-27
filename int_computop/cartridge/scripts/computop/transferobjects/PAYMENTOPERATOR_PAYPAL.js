'use strict';
/**
 * Transfer object for payment method paypal
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');
var PayPalHelpers = require(
    '*/cartridge/scripts/computop/helpers/PayPalHelpers');

var Paypal = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPaypalParams',
            'getRedirectUrls'
        ];
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorPayPalGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order related parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder(), 384, true));
        // FIXME orderNo only available in dw.order.Order
        map.put('RefNr', this.getOrderNo());
        return map;
},

    /**
    * Method that returns paypal specific params
    *
    * @return {dw.util.HashMap} - paypal specific parameters
    */
    getPaypalParams: function () {
        var map = new HashMap();
        var paypalCaptureType = this.getSitePreference('paymentOperatorPaypalCaptureType').value;
        map.put('Language', PayPalHelpers.getPayPalLanguageParam());
        map.put('Capture', paypalCaptureType);

        // Order | Auth paymentOperatorPaypalTxtype
        if (paypalCaptureType === 'manual') {
            map.put('Txtype', this.getSitePreference('paymentOperatorPaypalTxtype'));
        }

        var shippingAddress = this.order.defaultShipment.shippingAddress;
        // only for paypal express the shipping address is empty
        if (shippingAddress) {
            map.put('FirstName', shippingAddress.firstName);
            map.put('LastName', shippingAddress.lastName);
            map.put('AddrStreet', shippingAddress.address1);
            map.put('AddrStreet2', '');
            map.put('AddrCity', shippingAddress.city);
            map.put('AddrState', shippingAddress.stateCode);
            map.put('AddrZip', shippingAddress.postalCode);
            map.put('AddrCountryCode', shippingAddress.countryCode);
            map.put('Phone', shippingAddress.phone);
        }

        return map;
    }

});
module.exports = new Paypal();
