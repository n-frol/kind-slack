'use strict';
/**
 * Transfer object for payment method Paygate China
 */

/* API includes */
var HashMap = require('dw/util/HashMap');
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');
var Settings = require('/int_computop/cartridge/scripts/computop/util/Settings');

var PaygateChina = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getPaygateChinaParams',
            'getRedirectUrls'
        ];

        this.paymentFormFields = { paygatechina: ['accbank'] };
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.order.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.order, 768));
        map.put('RefNr', this.order.getOrderNo());
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
            this.getSitePreference('paymentOperatorPaygateChinaPayGateway')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Method that returns Paygate China specific params
     *
     * @returns {dw.util.HashMap} - paygate china specific parameters
     */
    getPaygateChinaParams: function () {
        var map = new HashMap();
        var billingAddress = this.getBillingAddress();
        var info = this.getPaymentInformation();
        var accBank = info['accbank'];
        map.put('AccBank', accBank);

        var payType = null;

        if (this.isInPayTypeList(accBank, Settings.getPaygateChinaObtList())) {
            payType = 'OBT';
            map.put('PayType', payType);
        } else if (this.isInPayTypeList(accBank, Settings.getPaygateChinaPspList())) {
            payType = 'PSP';
            map.put('PayType', payType);
        } else {
            cdpmLogger.error('(PaygateChina) Could not find PayType for AccBank type ' + accBank );
        }

        if (payType === 'OBT') {
            if ((billingAddress.companyName === null || billingAddress.companyName === '')
                && this.getSitePreference('paymentOperatorPaygateChinaPayTypeObt') === 'B2C'
            ) {
                map.put('Channel', 'B2C');
            } else {
                map.put('Channel', 'B2B');
            }
        } else if (payType == 'PSP') {
            // special value for mobile devices using Alipay
            if (session.custom.device === 'mobile' && accBank === 'ALP') {
                map.put('Channel', 'MOB');
            } else {
                map.put('Channel', this.getSitePreference('paymentOperatorPaygateChinaPayTypePsp'));
            }
        }

        return map;
    },

    /**
     * Get url for payment operator redirect
     *
     * @param {string} payType
     * @param {dw.util.ArrayList} payTypeList
     * @returns {boolean} - check if payType is in payTypeList
     */
    isInPayTypeList: function (payType, payTypeList) {
        for (var i = 0; i < payTypeList.length; i++) {
            if (payType === payTypeList[i].value) {
                return true;
            }
        }
        return false;
    }

});
module.exports = new PaygateChina();
