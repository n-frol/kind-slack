'use strict';
/**
* Transfer object for payment method credit direct
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var CreditDirect3D = AbstractPayment.extend({
    init: function () {
        this.methods = [
            'getMACParams',
            'getBankParams'
        ];
        this.paymentInformation = {};
    },

    /**
     * Set 3D secure data
     *
     * @param {Object} form - 3d secure parameters
     * @returns {Object} - this transfer object
     */
    setPaymentInformation: function (form) {
        this.paymentInformation = form;
        return this;
    },

    /**
     * Fetch transaction params and create HMAC / not required for 3D Secure
     *
     * @returns {dw.util.HashMap} - MAC parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.order.getUUID());
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.paymentInformation.get('amount'));
        map.put('Currency', this.paymentInformation.get('currency'));
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
     * Fetch bank information from custom information object
     *
     * @returns {dw.util.HashMap} - 3d secure parameter hash map
     */
    getBankParams: function () {
        var map = new HashMap();

        var info = this.paymentInformation;
        map.put('PayID', info.get('payId'));
        map.put('TransID', info.get('transId'));
        map.put('PAResponse', info.get('paRes'));
        map.put('MerchantID', info.get('mid'));

        return map;
    }

});
module.exports = new CreditDirect3D();
