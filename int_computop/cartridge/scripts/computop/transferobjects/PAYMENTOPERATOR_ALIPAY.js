'use strict';
/**
 * Transfer object for payment method Alipay
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Alipay = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
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
        map.put('UserData', this.order.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder(), 768));
        map.put('RefNr', this.order.getOrderNo());
        map.put('OrderDesc2', '');
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
            this.getSitePreference('paymentOperatorAliPayGateway')
        ].join(''); // trailing slash set for base url in site preferences
    }

});
module.exports = new Alipay();
