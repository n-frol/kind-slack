'use strict';
/**
* Transfer object for payment method koreacc
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var KoreaCC = AbstractRedirectPayment.extend({
    init: function() {
        this._super();
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getRedirectUrls',
            'getCustomParams'
        ];

    },

    /**
     * Additional request params: language, buyerName, buyerEmail
     *
     * @returns {dw.util.HashMap}
     */
    getCustomParams: function() {
        var map = new HashMap();
        var billingAddress = this.order.getBillingAddress();
        if ( billingAddress ) {
            map.put('BuyerName', billingAddress.firstName + ' ' + billingAddress.lastName);
        }
        map.put('BuyerEmail', this.order.customerEmail);

        var Locale = require('dw/util/Locale');
        var language = Locale.getLocale(request.locale).getLanguage();
        if (['KR', 'US'].indexOf(language) === -1) {
            language = 'KR';
        }
        map.put('Language', language);
        return map;
    },

    getCurrency: function() {
        return 'KRW';
    },

    /**
     * Get url for payment operator
     *
     * @returns String
     */
    getPaymentOperatorUrl: function() {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorKoreaCCGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    }

});
module.exports = new KoreaCC();