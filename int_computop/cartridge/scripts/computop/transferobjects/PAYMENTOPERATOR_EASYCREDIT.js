'use strict';
/**
* Transfer object for payment method easyCredit con step (3) - the final confirmation
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var EasyCreditCon = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getMACParams',
            'getCustomParams'
        ];

        this.easyCreditData = new HashMap();
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - default request parameter: MAC etc
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var cart = this.getOrder();
        var cartAmount;
        if (cart.getTotalGrossPrice().isAvailable()) {
            cartAmount = cart.getTotalGrossPrice();
        } else {
            cartAmount = cart.getAdjustedMerchandizeTotalPrice(true).add(cart.getGiftCertificateTotalPrice());
        }

        map.put('PayID', this.easyCreditData.get('PayID'));
        map.put('TransID', this.easyCreditData.get('TransID'));
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue(cartAmount));
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
     * Retrieve custom easyCredit params
     *
     * @return {dw.util.HashMap} - custom request parameter
     */
    getCustomParams: function () {
        var map = new HashMap();
        map.put('EventToken', 'CON');
        map.put('UserData', this.easyCreditData.get('UserData'));
        map.put('RefNr', this.easyCreditData.get('UserData'));
        map.put('response', 'encrypt');

        // Test mode
        var isTestMode = this.getSitePreference('paymentOperatorTestFlag');
        var testString = this.getSitePreference('paymentOperatorTestString');
        if (isTestMode != null && isTestMode === true) {
            if (testString != null) {
                map.put('OrderDesc', testString);
            } else {
                map.put('OrderDesc', 'Test:0000');
            }
        }

        return map;
    },

    /**
     * Set easycredit specific data
     *
     * @param {dw.util.HashMap} data - contains transId, payId
     * @returns {Object}
     */
    setEasyCreditData: function (data) {
        this.easyCreditData = data;
        return this;
    }

});
module.exports = new EasyCreditCon();
