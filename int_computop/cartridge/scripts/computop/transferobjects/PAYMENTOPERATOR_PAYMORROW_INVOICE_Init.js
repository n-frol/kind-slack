'use strict';

/**
 * Paymorow SDD transfer object class
 */
/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPaymorrowPayment = require('./AbstractPaymorrowPayment');

var PaymorrowInvoiceInit = AbstractPaymorrowPayment.extend({
    init: function () {
        this.methods = [
            'getCartParams',
            'getMACParamsCart',
            'getCustomParams',
            'getCustomerAddressParams',
            'getInvoiceParams'
        ];

        this.paymentFormFields = {
            paymorrowbml: [
                'day_pm',
                'month_pm',
                'year_pm',
                'gender_pm',
                'termsandconditions'
            ]
        };
    },

    /**
     * Retrieve Paymorrow Invoice specific params
     *
     * @returns {dw.util.HashMap} - invoice parameters
     */
    getInvoiceParams: function () {
        var map = new HashMap();
        var paymentInfo = this.getPaymentInformation();
        map.put('RPMethod', 'INVOICE');
        var tac = paymentInfo.termsandconditions === 'true' ? 'YES' : 'NO';
        map.put('TermsAndConditions', tac);
        return map;
    }

});
module.exports = new PaymorrowInvoiceInit();
