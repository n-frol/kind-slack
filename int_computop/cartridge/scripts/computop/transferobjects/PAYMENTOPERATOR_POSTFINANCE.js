'use strict';
/**
 * Transfer object for payment method postfinance
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var PostFinance = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPostFinanceParams',
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
            this.getSitePreference('paymentOperatorPostFinanceGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns PostFinance specific params
     *
     * @returns {dw.util.HashMap} - postfinance parameters
     */
    getPostFinanceParams: function () {
        var map = new HashMap();

        map.put('SellingPoint', this.getSitePreference('paymentOperatorPostFinanceSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorPostFinanceService'));

        var billingAddress = this.getOrder().getBillingAddress();
        if (billingAddress) {
            map.put('AccOwner', billingAddress.firstName + ' ' + billingAddress.lastName);
        }

        return map;
    }

});
module.exports = new PostFinance();
