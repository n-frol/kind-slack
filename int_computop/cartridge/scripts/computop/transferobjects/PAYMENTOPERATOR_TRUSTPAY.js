'use strict';
/**
 * Transfer object for payment method TrustPay
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var TrustPay = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getTrustPayParams',
            'getRedirectUrls'
        ];
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameter
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.order.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.order));
        map.put('RefNr', this.order.getOrderNo());
        map.put('Channel', '');
        return map;
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorTrustPayGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns TrustPay specific params
     *
     * @returns {dw.util.HashMap} - trustpay parameters
     */
    getTrustPayParams: function () {
        var map = new HashMap();

        map.put('SellingPoint', this.getSitePreference('paymentOperatorTrustPaySellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorTrustPayService'));

        var billingAddress = this.order.getBillingAddress();
        if (billingAddress) {
            map.put('AccOwner', billingAddress.firstName + ' ' + billingAddress.lastName);
            map.put('AddrCountryCode', billingAddress.countryCode);
        }

        return map;
    }

});
module.exports = new TrustPay();
