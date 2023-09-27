'use strict';
/**
 * Transfer object for payment method Przelewy24
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Przelewy24 = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPrzelewy24Params',
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
        map.put('UserData', this.getOrder().getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        map.put('RefNr', this.getOrder().getOrderNo());
        map.put('Channel', '');
        map.put('Email', this.getOrder().customerEmail);
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
            this.getSitePreference('paymentOperatorPrzelewy24GatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns Przelewy24 specific params
     *
     * @returns {dw.util.HashMap} - przelewy specific parameters
     */
    getPrzelewy24Params: function () {
        var map = new HashMap();

        map.put('Currency', 'PLN');
        map.put('SellingPoint', this.getSitePreference('paymentOperatorPrzelewy24SellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorPrzelewy24Service'));

        var billingAddress = this.getOrder().getBillingAddress();
        if (billingAddress) {
            map.put('AccOwner', billingAddress.firstName + ' ' + billingAddress.lastName);
        }

        return map;
    }

});
module.exports = new Przelewy24();
