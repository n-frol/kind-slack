/* global empty */
'use strict';

/**
 * computopCardProcessing.js
 *
 * Triggers card processing task to through the Camputop card processing
 */

// SFCC system class imports.
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');

/**
 * Error handling function.

 * @param {Object} serviceResult - The service hook return object
 * @param { dw.object.CustomObject } customObject - The custom object of the current capture job.
 * @return {boolean} - Returns true/false if error message validated.
 */
function processFailedRecord(serviceResult, customObject) {
    // Computom return codes:
    // 20120005 : The transaction amount exceeds the previously authorized or captured amount.
    // eslint-disable-next-line no-lonely-if
    if (!empty(serviceResult) && Object.prototype.hasOwnProperty.call(serviceResult, 'Status') && serviceResult.Status === "FAILED") {
        var code = serviceResult.Code;
        if (code === "20120005") {
            // Order already fully captured or refunded. We can Remove to job records without error or keep and try to update oms payment sObject.
            // // eslint-disable-next-line no-loop-func
            // Transaction.wrap(function () {
            //     CustomObjectMgr.remove(customObject);
            // });
            return false;
        }
        Transaction.wrap(function () {
            customObject.custom.message = empty(customObject.custom.message) ? "Check computop for error details." : customObject.custom.message + "\n Check computop for error details";
            customObject.custom.isProcessed = true;
            customObject.custom.isFailed = true;
        });
        return true;
    }
    return false;
}

/**
 * Oms service response parse function.

 * @param {Object} response - The oms update payment summary service hook return object
 * @param {string} sObject - Oms sObject name for the query
 * @param { dw.object.CustomObject } customObject - The custom object of the current payment process job.
 */
function parseUpdatePaymentSummeryResponse(response, sObject, customObject) {
    var eString = '';
    if (!empty(response) && Object.prototype.hasOwnProperty.call(response, 'compositeResponse')) {
        // eslint-disable-next-line no-loop-func
        response.compositeResponse.forEach(function (compositeResponse) {
            if (compositeResponse.httpStatusCode >= 400 && compositeResponse.httpStatusCode <= 500 &&
                compositeResponse.referenceId === sObject + 'Status') {
                eString = '\tERROR at composite response:';
                compositeResponse.body.forEach(function (body) {
                    eString += Object.keys(body)
                        .map(function (key) {
                            return '\n\t' + key + ': ' + body[key];
                        })
                        .join();
                });
                Transaction.wrap(function () {
                    customObject.custom.message = empty(customObject.custom.message) ? eString : customObject.custom.message + eString;
                    customObject.custom.isProcessed = true;
                    customObject.custom.isFailed = true;
                });
            }
            // eslint-disable-next-line no-cond-assign
            if (compositeResponse.httpStatusCode >= 200 && compositeResponse.httpStatusCode < 400 &&
                compositeResponse.referenceId === sObject + 'Status') {
                Transaction.wrap(function () {
                    customObject.custom.isProcessed = true;
                });
            }
        });
    } else {
        eString = '\tERROR at composite response: empty or unmatched response';
        Transaction.wrap(function () {
            customObject.custom.message = empty(customObject.custom.message) ? eString : customObject.custom.message + eString;
            customObject.custom.isProcessed = true;
            customObject.custom.isFailed = true;
        });
    }
}
/**
 * Oms service response parse function.

 * @param {string} paymentProcessorFunctionName - The oms update payment summary service hook return object
 * @param {string} sObject - Oms sObject name for the query
 * @param { dw.object.CustomObject } customObject - The custom object of the current payment process job.
 */
function paymentProcessor(paymentProcessorFunctionName, sObject, customObject) {
    var result = {};
    var isPaymentProcessorFailed = false;
    if (HookMgr.hasHook('app.payment.processor.paymentoperator_paymentgate')) {
        result = HookMgr.callHook('app.payment.processor.paymentoperator_paymentgate', paymentProcessorFunctionName, customObject.custom.orderNo, customObject);
    }
    if (!empty(result) && Object.prototype.hasOwnProperty.call(result, 'Status') && result.Status !== "OK") {
        isPaymentProcessorFailed = processFailedRecord(result, customObject);
    }
    // Any circuit breaker call or other type of error protection.
    if (result == null || !Object.prototype.hasOwnProperty.call(result, 'Status')) {
        isPaymentProcessorFailed = true;
    }
    var paymentSummeryResult = {};
    if (HookMgr.hasHook('app.kind.oms.update.payment.summary') && !isPaymentProcessorFailed) {
        var amount = sObject === 'payment' ? customObject.custom.captureAmount : customObject.custom.refundAmount;
        paymentSummeryResult = HookMgr.callHook('app.kind.oms.update.payment.summary', 'updatePaymentSummary', customObject.custom.orderNo, sObject, amount);
        parseUpdatePaymentSummeryResponse(paymentSummeryResult, sObject, customObject);
    }
}

function cleanOldData() {
    var dt = new Date();
    dt.setMonth(new Date().getMonth() - 1);
    // dt.setDate( new Date().getDate() - 1);
    var results = CustomObjectMgr.queryCustomObjects('OmsPaymentProcesses', "custom.isProcessed = {0} AND creationDate <= {1}",
        'creationDate ASC', true, dt);
    while (results.hasNext()) {
        var result = results.next();
        // eslint-disable-next-line no-loop-func
        Transaction.wrap(function () {
            CustomObjectMgr.remove(result);
        });
    }
    results.close();
}

function checkFailedOrderTrashHold() {
    var dt = new Date();
    var results = CustomObjectMgr.queryCustomObjects('OmsPaymentProcesses', "custom.isProcessed = {0} AND creationDate <= {1} AND custom.isFailed = {2}",
        'creationDate ASC', true, dt, true);
    if (results.getCount() >= 10) {
        results.close();
        throw new Error('Failing order trash hold exited');
    }
}

/**
 * Creates dummy records for testing purposes
 */
// eslint-disable-next-line no-unused-vars
function createDummyOmsPaymentProcessesRecord() {
    for (var i = 0; i < 1000; i++) {
        // eslint-disable-next-line no-loop-func
        Transaction.wrap(function () {
            var omsPaymentProcess = CustomObjectMgr.createCustomObject('OmsPaymentProcesses', require('dw/util/UUIDUtils').createUUID());
            omsPaymentProcess.custom.orderNo = "KDUS00004503";
            omsPaymentProcess.custom.omsOrderStatus = 'completed';
            omsPaymentProcess.custom.isCapture = true;
            // omsPaymentProcess.custom.isRefund = false;
            omsPaymentProcess.custom.captureAmount = 10;
            // omsPaymentProcess.custom.refundAmount = 10;
        });
    }
}

/**
 * Process card to Computop
 */
function processCard() {
    var results = CustomObjectMgr.queryCustomObjects('OmsPaymentProcesses', "(custom.isProcessed = {0} OR custom.isProcessed = {1}) AND (custom.isFailed = {2} OR custom.isFailed = {3})",
        'creationDate ASC', null, false, null, false).asList(0, 150);
    if (!empty(results)) {
        // eslint-disable-next-line guard-for-in,no-restricted-syntax
        for (var i in results) { // while (results.hasNext()) {
            var result = results[i]; // results.next();
            if (!empty(result) && !empty(result.custom.ID) && result.custom.isCapture === true) {
                paymentProcessor('Capture', 'payment', result);
            }

            if (!empty(result) && !empty(result.custom.ID) && result.custom.isRefund === true) {
                paymentProcessor('Refund', 'refund', result);
            }
        }
    }

    // results.close();
    cleanOldData();
    checkFailedOrderTrashHold();
    // createDummyOmsPaymentProcessesRecord();
}


/** Exported functions **/
module.exports = {
    processCard: processCard
};
