'use strict';

/**
* Transfer object for payment method ApplePay
*/
/* API includes */
var cdpmLogger  = require('dw/system/Logger').getLogger('paymentOperator');
var HashMap     = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require( "./AbstractPayment" );

var ApplePay = AbstractPayment.extend({
    /**
     * Token returned from authorization hook
     *
     * @var String
     */
    authToken: '',

    /**
     * Init transfer object
     */
    init: function() {
        this._super();
        this.methods = [
            'getMACParams',
            'getOrderParams',
            'getCustomParams'
        ];
    },

    /**
     * Fetch custom order data: such as tokenExt etc
     *
     * @return dw.util.HashMap
     */
    getCustomParams: function() {
        var map = new HashMap();
        map.put('MerchantIDExt', this.getSitePreference('applePayMerchantID'));
        map.put('Channel', 'WEBSITE'); // default
        map.put('TokenExt', this.getApplePayAuthorizationToken());
        return map;
    },

    /**
    * Retrieve order total amount
    *
    * @return dw.value.Money
    */
    getFixedContainerTotalAmount: function() {
        // fetch amount from order directly
        return this.getOrder().getTotalGrossPrice();
    },

    /**
     * Get applePay auth token (json) as string / base64 encoded
     *
     * @return String
     */
    getApplePayAuthorizationToken: function() {
        return require('dw/util/StringUtils').encodeBase64(this.authToken);
    },

    /**
     * Set request data tokenExt - parse JSON to verify it contains required information
     *
     * @param String data
     * @return Object
     * @throws Error
     */
    setApplePayData: function(data) {

        if ( -1 == Object.keys(data).indexOf('payment') ) {
            throw new Error('ApplePay response data does not contain required paymentData property!')
        }
        if ( -1 == Object.keys(data.payment).indexOf('token') ) {
            throw new Error('ApplePay payment data does not contain required token property!')
        }

        this.authToken = JSON.stringify(data.payment.token);
        return this;
    }

});

module.exports = new ApplePay();
