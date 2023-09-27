/* globals session */
'use strict';

/**
 * Paymorow SDD transfer object class
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var PaymorrowSdd = AbstractPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getCustomParams'
        ];
    },

    /**
     * Retrieve required order params
     *
     * @return {dw.util.HashMap} - order params
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
     * Fetch transaction params and create HMAC
     *
     * @return {dw.util.HashMap} - default encrypt params
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.order.getUUID());
        map.put('PayID', this.order.getPaymentInstruments('PAYMENTOPERATOR_PAYMORROW_SDD')[0].custom.paymentOperatorPayID);
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
     * Retrieve Paymorrow specific params
     *
     * @return {dw.util.HashMap} - paymorrow params
     */
    getCustomParams: function () {
        var map = new HashMap();
        map.put('EventToken', '13');
        map.put('RPMethod', 'SDD');
        map.put('DeviceID', session.privacy.paygateDeviceID);
        return map;
    }
});
module.exports = new PaymorrowSdd();
