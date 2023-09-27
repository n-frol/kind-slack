'use strict';
/**
 * Abstract transfer object class for payment method MasterPass/MasterPassQuickCheckout redirect step (1)
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var AbstractMasterPassRedirectPayment = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getRedirectUrls',
            'getCustomParams',
            'getShippingAddressParams'
        ];
    },

    /**
     * Get url for MasterPass redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorMasterPassRedirectGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', require('dw/util/UUIDUtils').createUUID());
        map.put('UserData', this.getOrder().getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder(), 200));
        map.put('ArticleList', this.getMasterPassArticleList(this.getOrder()));
        map.put('RefNr', this.getOrder().getOrderNo());
        return map;
    },

    /**
     * Retrieve custom MasterPass params
     *
     * @returns {dw.util.HashMap} - parameters from site preferences
     */
    getCustomParams: function () {
        var map = new HashMap();
        map.put('AcceptableCards', this.getSitePreference('paymentOperatorMasterPassAcceptableCards'));
        if (this.getSitePreference('paymentOperatorMasterPassShippingLocationProfileID') != null) {
            map.put('ShippingProfile', this.getSitePreference('paymentOperatorMasterPassShippingLocationProfileID'));
        }
        map.put('SuppressShippingAddress', this.getSitePreference('paymentOperatorMasterPassSuppressShippingAddressEnabled'));
        map.put('RewardProgram', this.getSitePreference('paymentOperatorMasterPassRewardProgramEnabled'));
        map.put('AuthLevelBasic', this.getSitePreference('paymentOperatorMasterPassAuthLevelBasicEnabled'));
        return map;
    },

    /**
     * Fetch address values from order shipping address
     *
     * @returns {dw.util.HashMap} - shipping address parameters
     */
    getShippingAddressParams: function () {
        var map = new HashMap();
        var shippingAddress = this.getShippingAddress();
        map.put('Name', shippingAddress.getFullName());
        map.put('AddrStreet', shippingAddress.getAddress1());

        if (shippingAddress.getSuite()) {
            map.put('AddrStreet2', shippingAddress.getSuite());
        }
        if (shippingAddress.getAddress2()) {
            map.put('AddrStreet3', shippingAddress.getAddress2());
        }
        map.put('AddrCity', shippingAddress.getCity());

        if (shippingAddress.getStateCode()) {
            map.put('AddrState', shippingAddress.getStateCode());
        }
        map.put('AddrZip', shippingAddress.getPostalCode());
        map.put('AddrCountryCode', shippingAddress.getCountryCode());
        map.put('Phone', shippingAddress.getPhone());
        return map;
    },

    /**
     * returns a string containing the article list following MasterPass specifications
     *
     * @param {dw.order.LineItemCtnr} ctnr - current order
     * @returns {string} - containing lineitem data
     */
    getMasterPassArticleList: function (ctnr) {
        var maxNameLength = 50;
        var maxLength = 768;
        var articleList = '';
        var iter = ctnr.getAllProductLineItems().iterator();
        var pli = null;

        while (iter !== null && iter.hasNext()) {
            pli = iter.next();
            var name = pli.productName;
            if (name.length > maxNameLength) {
                name = name.substr(0, maxNameLength - 1);
            }

            articleList += name + ';'
                + pli.quantity + ';'
                + this.getAmountFractionValue(pli.adjustedGrossPrice) + ';';

            if (iter.hasNext()) {
                articleList += '+';
            }
        }
        if (articleList.length > maxLength) {
            articleList = articleList.substr(0, maxLength - 1);
        }
        return articleList;
    }

});
module.exports = AbstractMasterPassRedirectPayment;
