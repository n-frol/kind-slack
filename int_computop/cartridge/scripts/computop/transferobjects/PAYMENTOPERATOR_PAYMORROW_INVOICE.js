/* globals session */
'use strict';

/**
 * Paymorrow INVOICE transfer object class
 */
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var PaymorrowInvoice = AbstractPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getCustomParams'
        ];
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - mac parameter hash map
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.order.getUUID());
        map.put('PayID', this.order.getPaymentInstruments('PAYMENTOPERATOR_PAYMORROW_INVOICE')[0].custom.paymentOperatorPayID);
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue());
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            map.put(
                'MAC',
                require('int_computop/cartridge/scripts/computop/lib/HashBasedMAC').getHMAC(
                    [map.PayID, map.TransID, map.MerchantID, map.Amount, map.Currency],
                    this.getSitePreference('paymentOperatorHMACKey')
                )
            );
        }

        return map;
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameter hash map
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.order.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.order));
        map.put('RefNr', this.order.getOrderNo());
        map.put('Channel', '');
        return map;
    },

    /**
     * Retrieve Paymorrow specific params
     *
     * @returns {dw.util.HashMap} - custom parameter hash map
     */
    getCustomParams: function () {
        var map = new HashMap();
        var PayID = this.order.getPaymentInstruments('PAYMENTOPERATOR_PAYMORROW_INVOICE')[0].custom.paymentOperatorPayID;
        map.put('PayID', PayID);
        map.put('EventToken', '13');
        map.put('RPMethod', 'INVOICE');
        map.put('DeviceID', session.privacy.paygateDeviceID);
        return map;
    }
});
module.exports = new PaymorrowInvoice();
