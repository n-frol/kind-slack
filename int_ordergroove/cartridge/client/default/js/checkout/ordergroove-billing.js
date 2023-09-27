'use strict';

module.exports = {
    savePayment: function () {
        // !!pcb 20190205 -- This is causing the payment not to be saved due to form serialization.
        // $('body').on('checkout:updateCheckoutView', function (e, data) {
        //     var payment = data.order.billing.payment;
        //     if (!payment) return;

        //     var form = $('form[name=dwfrm_billing]');
        //     if (!form) return;

        //     if (payment.forceSave) {
        //         $(form).find('#creditDirectSaveCreditCard').prop('checked', true);
        //     }
        //     $(form).find('#creditDirectSaveCreditCard').prop('disabled', payment.forceSave);
        // });
    }
};
