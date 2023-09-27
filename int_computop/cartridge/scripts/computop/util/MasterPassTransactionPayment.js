'use strict';
/**
* Script that provides MasterPass transaction socket call functionality
*/
(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');

    /**
     * Create transferobject, service class and execute api call
     *
     * @param {dw.util.HashMap} masterPassData - dedicated master pass data
     * @param {dw.order.Order} order - current order
     * @returns {boolean|dw.util.HashMap} - either false in case of error or response data as hash map
     */
    function callService(masterPassData, order) {
        var success = false;
        var result;
        var transferObject = require('~/cartridge/scripts/computop/transferobjects/MasterPassTransaction');
        var svcClass = require('~/cartridge/scripts/computop/svc/MasterPassTransactionService');

        try {
            if (transferObject && svcClass) {
                transferObject.setMasterPassParams(masterPassData);
                transferObject.setOrder(order);

                svcClass.call(transferObject.getTransferObject());
                result = svcClass.getResponse();

                require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, result);

                // handle result
                if (['OK', 'success', 'AUTHORIZED'].indexOf(result.Status) === -1) {
                    cdpmLogger.error('Authorization failed for [masterpass transaction] - transaction status : ' + result.Status);
                    return success;
                }

                var orderPaymentInstruments = order.getPaymentInstruments('PAYMENTOPERATOR_MASTERPASS');
                if (!orderPaymentInstruments.isEmpty()) {
                    var paymentInstrument = orderPaymentInstruments[0];
                    // adding information to PaymentInstrument
                    Transaction.wrap(function () {
                        var paymentTransaction = paymentInstrument.getPaymentTransaction();
                        var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
                        paymentTransaction.setPaymentProcessor(paymentProcessor);
                        paymentTransaction.setTransactionID(order.getOrderNo());
                    });
                }
                success = true;
            }
        } catch (err) {
            cdpmLogger.error('Paymentoperator - error while MasterPass transaction : ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return success;
    }

    exports.callService = callService; // eslint-disable-line no-param-reassign
}(module.exports));
