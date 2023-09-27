'use strict';
/**
* Script that provides functions for socket payments
*/
(function(exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    var HashMap = require('dw/util/HashMap');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');

    /**
     * Create parameter map for CreditDirect3D call
     *
     * @param {string} merchantId - from site preferences
     * @param {string} paymentId - reference paymentId
     * @param {string} transactionId - reference transactionId
     * @param {string} paResponse - param taken from former paygate response
     * @param {dw.util.HashMap} orderData - order parameters
     * @returns {dw.util.HashMap}
     */
    function create3DParameterMap(merchantId, paymentId, transactionId, paResponse, orderData) {
        var map = new HashMap();
        map.put('mid', merchantId);
        map.put('payId', paymentId);
        map.put('transId', transactionId);
        map.put('paRes', paResponse);
        map.put('amount', orderData.amount);
        map.put('currency', orderData.currency);
        return map;
    }

    /**
     * Create transferobject, service class and execute api call
     *
     * @param {dw.util.HashMap} payment3DParameterMap - request parameter
     * @param {dw.order.Order} order - current order
     * @returns {boolean|dw.util.HashMap} - hashmap with paygate respone or false in case of an error
     */
    function callService(payment3DParameterMap, order) {
        var success = false;
        var result;
        var transferObject = require('~/cartridge/scripts/computop/transferobjects/CreditDirect3D');
        var svcClass = require('~/cartridge/scripts/computop/svc/CreditDirect3DService');

        try {
            if (transferObject && svcClass) {
                transferObject.setPaymentInformation(payment3DParameterMap);
                transferObject.setOrder(order);

                svcClass.call(transferObject.getTransferObject());
                result = svcClass.getResponse();

                cdpmLogger.debug('Save paygate response for creditDirect3d');
                require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, result);

                // handle result
                if (['OK', 'success', 'AUTHORIZED'].indexOf(result.Status) === -1) {
                    cdpmLogger.error('Authorization failed for [credit card 3d] - transaction status : ' + result.Status);
                    return success;
                }

                var orderPaymentInstruments = order.getPaymentInstruments('PAYMENTOPERATOR_CREDIT_DIRECT');
                if (!orderPaymentInstruments.isEmpty()) {
                    var paymentInstrument = orderPaymentInstruments[0];
                    // adding information to PaymentInstrument
                    Transaction.wrap(function () {
                        var paymentTransaction = paymentInstrument.getPaymentTransaction();
                        var paymentProcessor = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod()).getPaymentProcessor();
                        paymentTransaction.setPaymentProcessor(paymentProcessor);
                        paymentTransaction.setTransactionID(order.getOrderNo());
                        // save credit card data (pcno, expiry, brand) to order payment instrument
                        // TODO save PCNr with customer payment instrument
                        paymentInstrument.custom.paymentOperatorCCNr = result.get('PCNr');
                        paymentInstrument.custom.paymentOperatorCCExpiry = result.get('CCExpiry');
                        paymentInstrument.custom.paymentOperatorCCBrand = result.get('CCBrand');
                    });
                }
                success = true;
            }
        } catch (err) {
            cdpmLogger.error('Paymentoperator - error while CreditDirect 3D authorization : ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return success;
    }

    exports.create3DParameterMap = create3DParameterMap; // eslint-disable-line no-param-reassign
    exports.callService = callService; // eslint-disable-line no-param-reassign
}(module.exports));
