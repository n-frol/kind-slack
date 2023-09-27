'use strict';
/**
* Transfer object for payment method MasterPass transaction step (2)
*/
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var MasterPassTransaction = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getCustomParams',
            'getShippingAddressParams'
        ];
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('Channel', '');
        map.put('ReqID', this.order.getUUID());
        map.put('OrderDesc', this.getOrderDescription(this.order, 768));
        map.put('ArticleList', this.getMasterPassArticleList(this.order));
        map.put('RefNr', this.order.getOrderNo());
        map.put('UserData', this.order.getOrderNo());
        return map;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - MAC parameters
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.masterPassParams.get('TransID')); // take over TransID from input params
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue());
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
     * Retrieve custom MasterPass params
     *
     * @returns {dw.util.HashMap} - custom parameter hash map
     */
    getCustomParams: function () {
        var map = new HashMap();
        map.put('MasterPassID', this.masterPassParams.get('masterpassid'));
        map.put('TransactionID', this.masterPassParams.get('TransactionID'));
        map.put('Capture', 'Manual');  // hardcoded by requirements;
        map.put(
            'CreditCardHolder',
            this.masterPassParams.get('confirstname') +
            ' ' + this.masterPassParams.get('conlastname')
        );
        map.put('SellingPoint', '');
        map.put('Service', '');
        map.put('RTF', '');
        map.put('IPAddr', this.ipAddress);
        map.put('IPZone', '');
        map.put('Zone', '');
        map.put('MARP', '');
        map.put('AboAction', '');
        map.put('StartDate', '');
        map.put('EndDate', '');
        map.put('Interval', '');
        map.put('AboAmount', '');
        return map;
    },

    /**
     * Fetch address values from order shipping address
     *
     * @returns {dw.util.HashMap}
     */
    getShippingAddressParams: function() {
        var map = new HashMap();
        var shippingAddress = this.getShippingAddress();
        if (shippingAddress) {
            map.put('Name', shippingAddress.getFullName());
            map.put('AddrStreet', shippingAddress.getAddress1());
            if (shippingAddress.getSuite() != null) {
                map.put('AddrStreet2', shippingAddress.getSuite());
            }
            if (shippingAddress.getAddress2() != null) {
                map.put('AddrStreet3', shippingAddress.getAddress2());
            }
            map.put('AddrCity', shippingAddress.getCity());
            map.put('AddrState', shippingAddress.getStateCode());
            map.put('AddrZip', shippingAddress.getPostalCode());
            map.put('AddrCountryCode', shippingAddress.getCountryCode());
            map.put('Phone', shippingAddress.getPhone());
            map.put('AddrStreeNr', '');
            map.put('AddrStreetNr2', '');
            map.put('AddrZip2', '');
            map.put('AddrCity2', '');
        }
        map.put('AddrChoice', '');
        map.put('AddrDistrict', '');
        map.put('AddrPOBox', '');
        map.put('Email', this.order.getCustomerEmail());
        return map;
    },

    /**
     * returns a string containing the article list following MasterPass specifications
     *
     * @param {dw.order.LineItemCtnr} ctnr - current basket
     * @returns {string} - article list
     */
    getMasterPassArticleList: function (ctnr) {
        var maxNameLength = 50;
        var maxLength = 768;
        var articleList = '';
        var iter = ctnr.allProductLineItems.iterator();
        var pli = null;

        while (iter != null && iter.hasNext()) {
            pli = iter.next();
            var name = pli.product.name;
            if (name.length > maxNameLength) {
                name = name.substr(0, maxNameLength - 1);
            }
            articleList += pli.productName + ';' +
            pli.quantity + ';' + this.getAmountFractionValue(pli.adjustedGrossPrice) + ';';
            if (iter.hasNext()) {
                articleList += '+';
            }
        }
        if (articleList.length > maxLength) {
            articleList = articleList.substr(0, maxLength - 1);
        }
        return articleList;
    },

    /**
     * Set response map from MasterPass redirect call
     *
     * @param {dw.util.HashMap} mpParams - specific master pass parameters
     */
    setMasterPassParams: function (mpParams) {
        this.masterPassParams = mpParams;
    }

});
module.exports = new MasterPassTransaction();
