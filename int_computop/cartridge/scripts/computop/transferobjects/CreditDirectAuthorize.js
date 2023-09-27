'use strict';
/**
* Transfer object for payment method credit direct
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var CreditDirectAuthorize = AbstractPayment.extend({
    init: function () {
        this.methods = [
            'getMACParams',
            'getBankParams'
        ];

        this.requiredBankFields = [
            'ccnr',
            'ccexpiry',
            'ccbrand'
        ];
    },

    /**
     * Retrieve custom payment informations form / object
     *
     * @returns {Object} - credit card data
     */
    getPaymentInformation: function () {
        var info = null;
        if (this.paymentInformation) {
            info = this.paymentInformation;
        }
        return info;
    },

    /**
     * Set credit card form data
     *
     * @param {Object} form - credit card data
     * @returns {Object} - this transfer object
     */
    setPaymentInformation: function (form) {
        this.paymentInformation = form;
        return this;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - get MAC parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var UUIDUtils = require('dw/util/UUIDUtils');

        map.put('TransID', UUIDUtils.createUUID());
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));

        if (this.getSitePreference('paymentOperatorCustomerProfileCreditCardAuthorizeRequired')) {
            // fractional amount without digits
            map.put('Amount', this.getSitePreference('paymentOperatorCustomerProfileCreditCardAuthorizeAmount'));
            map.put('ReqID', UUIDUtils.createUUID());

            if (this.getSitePreference('paymentOperatorTestFlag')) {
                var testString = this.getSitePreference('paymentOperatorTestString');
                if (empty(testString)) {
                    testString = 'Test:0000'
                }
                map.put('OrderDesc', testString);
            } else {
                map.put('OrderDesc', 'AUTHORIZE_VERIFICATION');
            }
        } else {
            map.put('Amount', '1');
            map.put('TxType', 'order');
        }
        // VBV must bne set for all auth modes!
        map.put('VBV', 'No');
        map.put('Capture', 'manual');
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            map.put(
                'MAC',
                require('int_computop/cartridge/scripts/computop/lib/HashBasedMAC').getHMAC(
                    [map.TransID, map.MerchantID, map.Amount, map.Currency],
                    this.getSitePreference('paymentOperatorHMACKey')
                )
            );
        }

        return map;
    },

    /**
     * Retrieve default currency code from site
     *
     * @returns {string} - site currency
     */
    getCurrency: function () {
        var Site = require('dw/system/Site');
        return Site.getCurrent().getDefaultCurrency();
    }
});
module.exports = new CreditDirectAuthorize();
