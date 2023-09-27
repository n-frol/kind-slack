'use strict';
/**
 * Transfer object for payment method PayU CEE
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var PayU = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getPayUParams',
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
            this.getSitePreference('paymentOperatorPayUGateway')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', this.getOrder().getUUID());
        map.put('UserData', this.getOrder().getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder(), 768));
        map.put('RefNr', this.getOrder().getOrderNo());

        // Discount
        var merchTotalExclOrderDiscounts = this.getOrder().getAdjustedMerchandizeTotalPrice(false);
        var merchTotalInclOrderDiscounts = this.getOrder().getAdjustedMerchandizeTotalPrice(true);
        var orderDiscount = merchTotalExclOrderDiscounts.subtract(merchTotalInclOrderDiscounts);
        map.put('Discount', this.getAmountFractionValue(orderDiscount));

        return map;
    },

    /**
     * Method that returns payu specific params
     *
     * @returns {dw.util.HashMap} - payu specific parameters
     */
    getPayUParams: function () {
        var map = new HashMap();
        map.put('Channel', this.getSitePreference('paymentOperatorPayUChannel'));

        // articlelist
        var articleList = this.getArticleList();
        Object.keys(articleList).forEach(function(key) {
            map.put(key, articleList[key]);
        });

        // personal data
        var billingAddress = this.getOrder().getBillingAddress();
        if (billingAddress) {
            map.put('bdFirstName', billingAddress.firstName);
            map.put('bdLastName', billingAddress.lastName);
            map.put('bdeMail', this.getOrder().getCustomerEmail());
        }

        return map;
    },

    /**
     * Retrieve specific ArticleList(n) param for PayU
     *
     * @returns {Object} - basket lineitems information
     */
    getArticleList: function () {
        var ctnr = this.getOrder();

        var articleList = {};
        var tmpArticleData = '';
        var articleListParam;
        var counter = 1;
        var separator = ',';
        var TaxMgr = require('dw/order/TaxMgr');
        var taxPolicy = TaxMgr.getTaxationPolicy() === TaxMgr.TAX_POLICY_NET ? 'NET' : 'GROSS';
        var productLineItems = ctnr.getAllProductLineItems().iterator();

        while (productLineItems.hasNext()) {
            var pli = productLineItems.next();
            if (!pli.product) continue;

            articleListParam = 'ArticleList' + counter;
            if (!Object.prototype.hasOwnProperty.call(articleList, articleListParam)) {
                articleList[articleListParam] = '';
            }
            tmpArticleData = pli.product.getName() + separator
                + pli.product.ID + separator
                + this.getAmountFractionValue(pli.getAdjustedGrossPrice()) + separator
                + pli.getQuantity() + separator
                + pli.getTaxRate().toString() * 100 + separator // return 5 (%) for 0.05
                + taxPolicy;

            if (articleList[articleListParam].length > 0
                && (articleList[articleListParam].length + tmpArticleData.length) > 2048
            ) {
                counter += 1;
                articleListParam = 'ArticleList' + counter;
                articleList[articleListParam] = tmpArticleData.substr(0, 2048);
            } else if (articleList[articleListParam].length > 0) {
                articleList[articleListParam] += '+' + tmpArticleData.substr(0, 2048);
            } else {
                articleList[articleListParam] += tmpArticleData.substr(0, 2048);
            }
        }
        // add shipping + shipping discount to Article List
        var shipment;
        var Shipment = ctnr.shipments.iterator().next();
        var shipmentName = require('dw/web/Resource').msg('ordersummary.ordershipping', 'paymentoperatorpayu', null) + ' ' + Shipment.shippingMethod.displayName;

        if (Shipment && Shipment.shippingMethod) {
            var shippingExclDiscounts = ctnr.shippingTotalPrice;
            var shippingInclDiscounts = ctnr.getAdjustedShippingTotalPrice();
            var shippingDiscount = shippingExclDiscounts.subtract(shippingInclDiscounts);
            var shippingAmount = ctnr.shippingTotalPrice;
            if (shippingDiscount && shippingDiscount.value > 0.0) {
                shippingAmount = shippingAmount.subtract(shippingDiscount);
            }

            shipment = shipmentName + separator
                + 'Shipping' + separator
                + this.getAmountFractionValue(shippingAmount) + separator
                + '1' + separator
                + '0' + separator
                + taxPolicy;

            if (articleList[articleListParam].length > 0
                && (articleList[articleListParam].length + shipment.length) > 2048
            ) {
                counter += 1;
                articleListParam = 'ArticleList' + counter;
                articleList[articleListParam] = shipment.substr(0, 2048);
            } else if (articleList[articleListParam].length > 0) {
                articleList[articleListParam] += '+' + shipment.substr(0, 2048);
            } else {
                articleList[articleListParam] += shipment.substr(0, 2048);
            }
        }
        return articleList;
    }

});
module.exports = new PayU();
