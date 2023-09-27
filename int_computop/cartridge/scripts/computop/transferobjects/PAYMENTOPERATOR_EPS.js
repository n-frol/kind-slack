'use strict';
/**
* Transfer object for payment method ideal
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var Eps = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getRedirectUrls',
            'getCustomParams'
        ];

        if (this.getSitePreference('paymentOperatorUsePPRO')) {
            this.requiredBankFields = ['owner', 'realiban', 'bic'];
        }
        this.paymentFormFields = { eps: ['accountholdername', 'iban', 'bic'] };
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorEpsGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        var order = this.getOrder();

        map.put('ReqID', '');
        map.put('UserData', order.getOrderNo());
        map.put('RefNr', order.getOrderNo());
        map.put('Channel', '');

        if (this.getSitePreference('paymentOperatorUsePPRO')) {
            map.put('OrderDesc', this.getOrderDescription(order, 768));
        } else {
            var statementMsg = order.getOrderNo();
            map.put('OrderDesc', statementMsg.length > 35 ? statementMsg.substr(0, 35) : statementMsg);
            map.put('OrderDesc2', this.getEpsOrderDesc2(order));
        }

        return map;
    },

    /**
     * Retrieve custom eps params
     *
     * @returns {dw.util.HashMap} - custom parameter hash map
     */
    getCustomParams: function () {
        var map = new HashMap();
        map.put('SellingPoint', this.getSitePreference('paymentOperatorEpsSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorEpsService'));
        return map;
    },

    /**
     * Returns string representing a formatted article list for OrderDesc2 paramater.
     *
     * @param {dw.order.Order} ctnr - current order
     * @returns {string} - line items stringified
     */
    getEpsOrderDesc2: function (ctnr) {
        var maxLength = 384;
        var articleList = '';
        var iter = ctnr.getAllProductLineItems().iterator();
        var pli = null;

        while (iter != null && iter.hasNext()) {
            pli = iter.next();
            articleList += pli.quantity + ' '
                + pli.productName + ' '
                + this.getAmountFractionValue(pli.adjustedGrossPrice);

            if (iter.hasNext()) {
                articleList += ',';
            }
        }
        if (articleList.length > maxLength) {
            articleList = articleList.substr(0, maxLength);
        }
        return articleList;
    }

});
module.exports = new Eps();
