'use strict';
/**
 * Transfer object for payment method POLi
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Poli = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPoliParams',
            'getRedirectUrls'
        ];
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.getOrder().getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        map.put('RefNr', this.getOrder().getOrderNo());
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
            this.getSitePreference('paymentOperatorPoliGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns Poli specific params
     *
     * @returns {dw.util.HashMap} - poli parameters
     */
    getPoliParams: function () {
        var map = new HashMap();

        map.put('SellingPoint', this.getSitePreference('paymentOperatorPoliSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorPoliService'));

        var billingAddress = this.getOrder().getBillingAddress();
        if (billingAddress) {
            map.put('AccOwner', billingAddress.firstName + ' ' + billingAddress.lastName);
            map.put('AddrCountryCode', billingAddress.countryCode);
        }

        return map;
    }

});
module.exports = new Poli();
