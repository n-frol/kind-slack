'use strict';

/**
 * Transfer object for payment method ideal
 */

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Ideal = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getRedirectUrls'
        ];

        this.requiredBankFields = ['issuerid'];

        // FIXME check if requiredBankFields / paymentFormFields can be simplified
        if (this.getSitePreference('paymentOperatorUsePPRO')) {
            this.requiredBankFields = [];
        }

        this.paymentFormFields = { ideal: ['issuerid'] };
        this.isIframePayment = true;
    },

    /**
     * Get url for payment operator iframe
     *
     * @returns {string} - iframe url
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorIDealGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    }

});
module.exports = new Ideal();
