'use strict';
/**
* Transfer object for payment method MasterPassQuickCheckout redirect step (1)
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractMasterPassRedirectPayment = require('./AbstractMasterPassRedirectPayment');

var MasterPassQuickCheckout = AbstractMasterPassRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getRedirectUrls',
            'getCustomParams'
        ];
    },

    /**
     * Custom redirect URLs for MasterPassQuickCheckout
     *
     *  @returns {dw.util.HashMap} - urls for re-entry in shop
     */
    getRedirectUrls: function () {
        var URLUtils = require('dw/web/URLUtils');
        var map = new HashMap();
        map.put('URLSuccess', URLUtils.https('PaymentOperator-SuccessMasterPassQuickCheckout'));
        map.put('URLFailure', URLUtils.https('PaymentOperator-FailureExpress'));
        map.put('URLNotify', URLUtils.https('PaymentOperator-Notify'));
        map.put('Response', 'encrypt');
        return map;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - mac parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var cart = this.getLineItemCtnr();
        var cartAmount = cart.getAdjustedMerchandizeTotalPrice(true).add(cart.getGiftCertificateTotalPrice());

        map.put('TransID', this.transId);
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue(cartAmount));
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
     * Retrieve required order params (taken from cart)
     *
     * @returns {dw.util.HashMap} - order parameter hashmap
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', this.transId);
        map.put('UserData', this.orderNo);
        map.put('OrderDesc', this.getOrderDescription(this.getLineItemCtnr(), 200));
        map.put('ArticleList', this.getMasterPassArticleList(this.getLineItemCtnr()));
        map.put('RefNr', this.orderNo);
        return map;
    },

    /**
     * Set TransID
     *
     * @param {string} transId - transaction id
     */
    setTransId: function (transId) {
        this.transId = transId;
    },

    /**
     * Set pregenerated order number
     *
     * @param {string} orderNo - pre-generated order No
     */
    setOrderNo: function (orderNo) {
        this.orderNo = orderNo;
    }

});
module.exports = new MasterPassQuickCheckout();
