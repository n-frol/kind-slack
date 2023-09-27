'use strict';
/**
* Transfer object for payment method sofortueberweisung
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Sofort = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getSofortParams',
            'getRedirectUrls'
        ];
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorOnlineTransferGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns sofortüberweisung specific params
     *
     * @returns {dw.util.HashMap} - sofort parameter hash map
     */
    getSofortParams: function () {
        var map = new HashMap();
        // available are // DE, NL, AT, CH, HU, SL
        map.put('AddrCountryCode', 'DE');
        // map.put('Sofortaction', this.sofortAction); not part of the current scope
        return map;
    }

});
module.exports = new Sofort();
