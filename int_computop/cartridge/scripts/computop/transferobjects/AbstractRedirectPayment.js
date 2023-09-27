'use strict';
/**
* Abstract transfer object class for redirect payment methods
*/
/* API includes */
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var HashMap = require('dw/util/HashMap');
var URLUtils = require('dw/web/URLUtils');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');
var PayPalHelpers = require(
    '*/cartridge/scripts/computop/helpers/PayPalHelpers');

var AbstractRedirectPayment = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle

        // if true paygate form will be rendered in shop within an iframe
        this.isIframePayment = false;
    },

    /**
     * has to be implemented by inheriting classes
     *
     * @returns {string}
     */
    getPaymentOperatorUrl: function () {
        return null;
    },

    /**
     * Retrieve redirect urls
     *
     * @returns {dw.util.HashMap} - url action for paygate re-entry
     */
    getRedirectUrls: function () {
        var ppPi = PayPalHelpers.getPayPalCustomerPI();
        var isSubscription = PayPalHelpers.checkForSubscription(this.getOrder());
        var map = new HashMap();

        if (isSubscription && !ppPi) {
            map.put('RTF', 'I');
        }

        map.put('URLSuccess', URLUtils.https('PaymentOperator-Success').toString());
        map.put('URLFailure', URLUtils.https('PaymentOperator-Failure').toString());
        map.put('URLNotify', URLUtils.https('PaymentOperator-Notify').toString());
        map.put('Response', 'encrypt');
        return map;
    },

    /**
     * Create request param string for redirect url
     *
     * @returns {string}
     */
    getRequestString: function () {
        var result = '';
        var map = this.getTransferObject();
        var params = this.getTransferObjectString(map);

        var Blowfish = require('~/cartridge/scripts/computop/lib/Blowfish');

        result += '?MerchantID=' + this.getSitePreference('paymentOperatorMerchantID')
            + '&Len=' + params.length
            + '&Data=' + Blowfish.encryptBlowfish(params, this.getSitePreference('paymentOperatorMerchantCode'))
            + '&EtiID=' + encodeURIComponent(this.getSitePreference('paymentOperatorEtiID'));

        return result;
    },

    /**
     * Create url to api with baseUrl and the method's api access point from
     * site preferences and request params
     *
     * @return {Object} - containing redirect url and flag for iframe payment
     */
    getRedirectUrl: function () {
        var redirectUrl = {};
        var paymentOperatorUrl = this.getPaymentOperatorUrl();

        if (paymentOperatorUrl) {
            redirectUrl = {
                url: paymentOperatorUrl + this.getRequestString(),
                iframe: !!this.isIframePayment
            };
            cdpmLogger.info('Request url with encrypted params: ' + redirectUrl.url);
        }
        return redirectUrl;
    }
});

module.exports = AbstractRedirectPayment;
