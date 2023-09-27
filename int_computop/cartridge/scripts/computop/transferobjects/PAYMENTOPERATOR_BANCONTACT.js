'use strict';
/**
 * Transfer object for payment method bancontact
 */
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Bancontact = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getRedirectUrls'
        ];

        this.paymentFormFields = {
            bancontact: ['accountholdername']
        };
        this.requiredBankFields = ['owner'];
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - get order specific parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        map.put('RefNr', this.getOrderNo());
        map.put('Currency', this.getCurrency());

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
            this.getSitePreference('paymentOperatorBancontactGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    }
});
module.exports = new Bancontact();
