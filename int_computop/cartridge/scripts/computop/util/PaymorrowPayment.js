/* globals customer */
'use strict';
/* API includes*/
var Transaction = require('dw/system/Transaction');

/* Script includes */
var server = require('server');
var transferObjectBasePath = 'int_computop/cartridge/scripts/computop/transferobjects/';

/**
* Script that provides functions for socket payments
*/
(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');

    /**
     * execute api call
     *
     * @param {dw.order.LineItemCtnr} lineitemcnt - current basket / order
     * @param {dw.order.PaymentInstrument} paymentinstrument - current payment instrument
     * @param {string} action - either INIT, REINIT or undefined (Confirm)
     * @returns {boolean} - returns true if service call was successful
     */
    function callService(lineitemcnt, paymentinstrument, action) {
        var success = false;
        var result;
        var svcClass = require('~/cartridge/scripts/computop/svc/PaymorrowService');

        try {
            if (svcClass) {
                var billingForm = server.forms.getForm('billing');
                var transferObject;
                var path;

                var method = paymentinstrument.getPaymentMethod();

                if (action === 'INIT' || action === 'REINIT') {
                    var eventtoken = action === 'REINIT' ? '11' : '10';

                    path = transferObjectBasePath + method + '_Init';
                    transferObject = require(path);

                    transferObject.setLineItemCtnr(lineitemcnt)
                        .setCustomer(customer.authenticated ? customer : null)
                        .setPaymentInstrument(paymentinstrument)
                        .setPaymentInformation(billingForm)
                        .setEventToken(eventtoken);
                } else {
                    path = transferObjectBasePath + method + '_Confirm';
                    transferObject = require(path);

                    transferObject.setOrder(lineitemcnt)
                        .setCustomer(customer.authenticated ? customer : null)
                        .setPaymentInformation(server.forms.getForm('billing'));
                }

                svcClass.call(transferObject.getTransferObject());
                result = svcClass.getResponse();

                // handle result
                if (['PENDING', 'OK', 'success', 'AUTHORIZED'].indexOf(result.Status) === -1) {
                    cdpmLogger.error(
                        'Initialisation failed for Paymorrow - transaction status : '
                        + result.Status
                    );
                    return success;
                }

                Transaction.wrap(function () {
                    paymentinstrument.custom.paymentOperatorPayID = result.PayID; // eslint-disable-line no-param-reassign
                });


                success = true;
            }
        } catch (err) {
            cdpmLogger.error('Paymentoperator - error while Paymorrow authorization : '
                + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return success;
    }
    exports.callService = callService; // eslint-disable-line no-param-reassign
}(module.exports));
