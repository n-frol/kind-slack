'use strict';
/**
 * Transfer object for payment method PaypalExpress
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var PaypalExpress = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        // only MAC params required
        this.methods = [
            'getMACParams',
            'getShippingAddressParams'
        ];
        this.paypalExpressParams = new HashMap();
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.getPaypalExpressParam('TransID'));
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue());
        map.put('Currency', this.getCurrency());
        map.put('RefNr', this.getOrderNo());

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

        map.put('PayID', this.getPaypalExpressParam('PayID'));
        return map;
    },

    /**
     * Fetch address values from order shipping address
     *
     * @return {dw.util.HashMap} - hashmap with shipping address
     */
    getShippingAddressParams: function () {
        var map = new HashMap();
        var shippingAddress = this.getShippingAddress();
        if (!empty(shippingAddress)) {
            map.put('FirstName', shippingAddress.getFirstName());
            map.put('LastName', shippingAddress.getLastName());
            map.put('AddrStreet', shippingAddress.getAddress1());
            map.put('AddrStreet2', shippingAddress.getAddress2());
            map.put('AddrCity', shippingAddress.getCity());
            map.put('AddrState', shippingAddress.getStateCode());
            map.put('AddrZip', shippingAddress.getPostalCode());
            map.put('AddrCountryCode', shippingAddress.getCountryCode());
            map.put('Phone', shippingAddress.getPhone());
        }
        return map;
    },

    /**
     * Set specific params for internal processing: PayID, TransID
     *
     * @param {dw.util.HashMap} params - paypal express parameters
     * @return Object
     */
    setPaypalExpressParams: function (params) {
        this.paypalExpressParams = params;
        return this;
    },

    /**
     * Fetch object's paypal express params for internal processing: PayID, TransID
     *
     * @param {string} key
     * @returns {string}
     */
    getPaypalExpressParam: function (key) {
        var result = '';
        if (this.paypalExpressParams.get(key)) {
            result = this.paypalExpressParams.get(key);
        }
        return result;
    }

});
module.exports = new PaypalExpress();
