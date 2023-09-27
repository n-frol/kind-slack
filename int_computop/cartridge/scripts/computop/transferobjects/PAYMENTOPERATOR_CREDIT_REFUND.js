/* global customer */

'use strict';
/**
 * Transfer object for payment method credit direct refund
 */

/* API includes */
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var HashMap = require('dw/util/HashMap');
var Money   = require('dw/value/Money');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var CreditCardRefund = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getMACParams',
            'getRefundParams'
        ];
        this.customObject = null;
    },
    /**
     * Set custom object
     *
     * @param {dw.object.CustomObject} customObject - set custom object for the capturing
     * @returns {dw.object.CustomObject}
     */
    setCustomObject: function (customObject) {
        this.customObject = customObject;
        return this;
    },

    /**
     * Get custom object
     *
     * @returns {dw.object.CustomObject}
     */
    getCustomObject: function () {
        return this.customObject;
    },
    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorCreditDirectRefundPath')
        ].join(''); // trailing slash set for base url in site preferences
    },
    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - default transaction parameters
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var order = this.getOrder();
        var refundAmount = this.customObject.custom.refundAmount;
        var amount = new Money(refundAmount, this.getCurrency());

        map.put('PayID', order.custom.paymentOperatorPayID);
        map.put('TransID', this.getOrder().getUUID());
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue(amount));
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            map.put(
                'MAC',
                require('int_computop/cartridge/scripts/computop/lib/HashBasedMAC').getHMAC(
                    [map.PayID, map.TransID, map.MerchantID, map.Amount, map.Currency],
                    this.getSitePreference('paymentOperatorHMACKey')
                )
            );
        }

        return map;
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - capture parameters
     */
    getRefundParams: function () {
        var map = new HashMap();
        map.put('ReqID', require('dw/util/UUIDUtils').createUUID());
        map.put('RefNr', this.getOrder().getOrderNo());
        return map;
    },
    /**
     * Returns data object for the remote call
     *
     * @returns {dw.util.HashMap} - builds hash map with all required parameters
     */
    getTransferObject: function () {
        var self = this;
        var map = new HashMap();

        for (var attribute in this) {
            var type = typeof this[attribute];
            if (type === 'function') {
                this[attribute] = (function (fn, obj) { return function () { return fn.apply(obj, arguments); }; })(this[attribute], this);
            }
        }

        try {
            this.methods.forEach(function (method) {
                if (typeof self[method] === 'function') {
                    map.putAll(self[method].call(self));
                }
            });

            if (this.verboseLogging) {
//                cdpmLogger.debug('Request data (unmasked): ' + this.getTransferObjectString(map, false));
                cdpmLogger.info('Request data: ' + this.getTransferObjectString(map, true));
            }
        } catch (err) {
            cdpmLogger.error('Error while creating transfer object: ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return map;
    }

});
module.exports = new CreditCardRefund();
