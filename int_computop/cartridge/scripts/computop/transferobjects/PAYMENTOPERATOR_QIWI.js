'use strict';
/**
 * Transfer object for payment method Qiwi
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Qiwi = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getQiwiParams',
            'getBankParams',
            'getRedirectUrls'
        ];

        this.paymentFormFields = {
            qiwi: ['accountholdername', 'mobilenumber']
        };
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
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
            this.getSitePreference('paymentOperatorQiwiGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Fetch bank information from custom information object
     *
     * @returns {dw.util.HashMap} - banking parameters
     */
    getBankParams: function () {
        var map = new HashMap();
        if (!this.getPaymentInformation()) {
            return map;
        }

        var info = this.getPaymentInformation();
        map.put('AccOwner', info['accountholdername']); // eslint-disable-line dot-notation
        map.put('MobileNo', info['mobilenumber']); // eslint-disable-line dot-notation

        return map;
    },

    /**
     * Method that returns Qiwi specific params
     *
     * @returns {dw.util.HashMap} - qiwi specific parameters
     */
    getQiwiParams: function () {
        var map = new HashMap();

        map.put('SellingPoint', this.getSitePreference('paymentOperatorQiwiSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorQiwiService'));

        return map;
    }

});
module.exports = new Qiwi();
