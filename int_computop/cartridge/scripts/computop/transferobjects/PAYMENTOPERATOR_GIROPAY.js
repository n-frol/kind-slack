'use strict';
/**
* Transfer object for payment method giropay
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Giropay = AbstractRedirectPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getGiropayParams',
            'getRedirectUrls'
        ];

        this.paymentFormFields = {
            giropay: ['accountholdername', 'accountnumber']
        };
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - get order specific parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        map.put('RefNr', this.getOrderNo());
        map.put('Channel', '');

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
            this.getSitePreference('paymentOperatorGiropayGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
    * Method that returns giropay specific params
    *
    * @returns {dw.util.HashMap} - get giropay transaction parameters
    */
    getGiropayParams: function () {
        var map = new HashMap();

        map.put('SellingPoint', this.getSitePreference('paymentOperatorGiropaySellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorGiropayService'));
        map.put('ShowAccNr', '');
        map.put('AccEdit', '');

        return map;
    },

    /**
     * Fetch bank information from custom information object
     *
     * @returns {dw.util.HashMap} - get customer account parameters
     */
    getBankParams: function () {
        var map = new HashMap();
        if (!this.getPaymentInformation()) {
            return map;
        }

        var info = this.getPaymentInformation();
        map.put('AccOwner', info.accountholdername);

        if (this.getSitePreference('paymentOperatorGiropayVendor') === 'EVO') {
            try {
                var accountNo = info.accountnumber;
                var s = accountNo.substr(0, 2);
                // if the first characters are digits then assume it's not an IBAN
                if (!isNaN(parseFloat(s)) && isFinite(s)) {
                    map.put('AccNr', accountNo);
                } else {
                    // SEPA
                    map.put('IBAN', accountNo);
                }
            } catch (e) {
                // this will cause an authorization failure with the paygate
            }
        }

        return map;
    }
});
module.exports = new Giropay();
