'use strict';
/**
 * Transfer object for payment method PaypalExpress (address step)
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');
var PayPalHelpers = require('*/cartridge/scripts/computop/helpers/PayPalHelpers');

var PaypalExpressAddress = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getMACParams',
            'getRedirectUrls',
            'getOrderParams',
            'getPayPalExpressCustomParams'
        ];
        this.paypalExpressParams = new HashMap();
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - MAC parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        var cart = this.order;
        var cartAmount = cart.getAdjustedMerchandizeTotalPrice(true).add(cart.getGiftCertificateTotalPrice());
        var payId = this.getPaypalExpressParam('PayID');

        map.put('TransID', this.getPaypalExpressParam('TransID'));
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

        if (payId && payId.length > 0) {
            map.put('PayID', payId);
        }

        return map;
    },

    /**
     * Custom redirect URLs for PaypalExpress
     *
     *  @returns {dw.util.HashMap} - urls for re-entry in shop from paypal
     */
    getRedirectUrls: function () {
        var URLUtils = require('dw/web/URLUtils');
        var map = new HashMap();
        map.put('URLSuccess', URLUtils.https('PaymentOperator-SuccessPaypalExpress'));
        map.put('URLNotify', URLUtils.https('PaymentOperator-Notify'));
        map.put('URLFailure', URLUtils.https('PaymentOperator-FailureExpress'));
        if (PayPalHelpers.checkForSubscription(this.getOrder()) &&
            !PayPalHelpers.getPayPalCustomerPI()
        ) {
            map.put('RTF', 'I');
        }
        map.put('Response', 'encrypt');
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
            this.getSitePreference('paymentOperatorPayPalGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Order params
     *
     * @returns {dw.util.HashMap} - order parameter hash map
     */
    getOrderParams: function () {
        var map = new HashMap();
        var basket = this.getOrder();
        map.put('ReqID', this.getPaypalExpressParam('TransID'));
        map.put('UserData', this.orderNo);
        map.put('OrderDesc', this.getOrderDescription(basket, 127, true));

        // orderdesc2-99
        var productLineItems = basket.getAllProductLineItems().iterator();
        var itemCounter = 2;
        while (productLineItems.hasNext()) {
            var pli = productLineItems.next();

            map.put('OrderDesc' + itemCounter,
                pli.getProductName() + ','
                + this.getAmountFractionValue(pli.getPrice()) + ','
                + pli.getProductID() + ','
                + pli.getQuantity());

            itemCounter++;
            // OrderDesc2-99 allowed
            if (itemCounter > 99) {
                break;
            }
        }

        map.put('RefNr', this.orderNo);
        return map;
    },

    /**
     * Custom params which will be additionally submitted to PayPal
     *
     * @returns {dw.util.HashMap} - paypal express parameter hash map
     */
    getPayPalExpressCustomParams: function () {
        var map = new HashMap();
        map.put('Capture', this.getSitePreference('paymentOperatorPaypalCaptureType'));
        map.put('Txtype', this.getSitePreference('paymentOperatorPaypalTxtype'));
        map.put('PayPalMethod', 'shortcut');
        var localeString = PayPalHelpers.getPayPalLanguageParam();
        map.put('Language', localeString);
        return map;
    },

    /**
     * Set specific params for internal processing: PayID, TransID
     *
     * @param {dw.util.HashMap} params - hash map with specific paypal express parameters
     * @returns {Object} - this transfer object
     */
    setPaypalExpressParams: function (params) {
        this.paypalExpressParams = params;
        return this;
    },

    /**
     * Fetch object's paypal express params for internal processing: PayID, TransID
     *
     * @param {string} key - hash map key
     * @returns {string} - paypal express parameter value
     */
    getPaypalExpressParam: function (key) {
        var result = '';
        if (this.paypalExpressParams.get(key)) {
            result = this.paypalExpressParams.get(key);
        }
        return result;
    },

    /**
     * Set pregenerated order number
     *
     * @param {string} orderNo - pregenerated orderNo
     * @returns {Object} - this transfer object
     */
    setOrderNo: function (orderNo) {
        this.orderNo = orderNo;
        return this;
    }
});
module.exports = new PaypalExpressAddress();
