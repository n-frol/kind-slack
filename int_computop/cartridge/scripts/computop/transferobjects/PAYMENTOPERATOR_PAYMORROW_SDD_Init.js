'use strict';

/**
 * Paymorow SDD transfer object class
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPaymorrowPayment = require('./AbstractPaymorrowPayment');

var PaymorrowSddInit = AbstractPaymorrowPayment.extend({
    init: function () {
        this.methods = [
            'getCartParams',
            'getMACParamsCart',
            'getCustomParams',
            'getCustomerAddressParams',
            'getSDDParams'
        ];

        this.paymentFormFields = {
            paymorrowsdd: [
                'day_pm',
                'month_pm',
                'year_pm',
                'gender_pm',
                'iban',
                'termsandconditions'
            ]
        };
    },

     /**
      * Retrieve Paymorrow SDD specific params
      *
      * @returns {dw.util.HashMap}  - sdd parameter
      */
    getSDDParams: function () {
        var map = new HashMap();
        var paymentInfo = this.getPaymentInformation();
        map.put('IBAN', paymentInfo.iban);
        map.put('RPMethod', 'SDD');
        var tac = paymentInfo.termsandconditions === 'true' ? 'YES' : 'NO';
        map.put('TermsAndConditions', tac);
        return map;
    }

});
module.exports = new PaymorrowSddInit();
