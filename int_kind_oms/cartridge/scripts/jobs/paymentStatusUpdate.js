/* global empty */
'use strict';

/**
 * paymentStatusUpdate.js
 *
 * Triggers card processing task to through the OMS payment status changes
 */

// SFCC system class imports.
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');


// Module level declarations.
var omsLog = Logger.getLogger('oms', 'communication');
var logPrefix = 'Payment-Status-Update - paymentStatusUpdate.js:\n';

function execute() {
    var eString = '';
    var patchObject = {};
    var qTable = '';
    try {
        var paymentUpdateQue = CustomObjectMgr.getAllCustomObjects('cardProcessing');
        var svcOms = require('~/cartridge/scripts/svc/compositeQueryService');
        while (paymentUpdateQue.hasNext()) {
            var paymentUpdateObject = paymentUpdateQue.next();
            if (!empty(paymentUpdateObject) && !empty(paymentUpdateObject.custom.ID) &&
                (paymentUpdateObject.custom.cardProcess === "OMS-Capture" || paymentUpdateObject.custom.cardProcess === "OMS-Refund")) {
                if (!empty(paymentUpdateObject) && !empty(paymentUpdateObject.custom.ID) && paymentUpdateObject.custom.cardProcess === "OMS-Capture") {
                    patchObject = {
                        method: 'PATCH',
                        url: '/services/data/v53.0/sobjects/Payment/@{payment.records[0].Id}',
                        referenceId: 'paymentStatus',
                        body: { Status: 'Processed' }
                    };
                    qTable = "Payment";
                }
                if (!empty(paymentUpdateObject) && !empty(paymentUpdateObject.custom.ID) && paymentUpdateObject.custom.cardProcess === "OMS-Refund") {
                    patchObject = {
                        method: 'PATCH',
                        url: '/services/data/v53.0/sobjects/refund/@{payment.records[0].Id}',
                        referenceId: 'refundStatus',
                        body: { Status: 'Processed' }
                    };
                    qTable = "Refund";
                }

                var orderNo = paymentUpdateObject.custom.orderNo; // "KDUS00005003"; // paymentUpdateObject.custom.orderNo;
                var compositeBody = {
                    allOrNone: "true",
                    collateSubrequests: "true",
                    compositeRequest: [
                        {
                            method: 'GET',
                            url: '/services/data/v53.0/query?q=SELECT Id FROM ' + qTable + ' WHERE OrderPaymentSummary.OrderSummary.OrderNumber=\'' + orderNo + '\'',
                            referenceId: 'payment'
                        },
                        patchObject
                    ]
                };

                var srvCall = svcOms.call(compositeBody);
                var result = svcOms.getResponse();
                if (srvCall.status === 'ERROR') {
                    eString = logPrefix + '\tERROR at compositeQueryService:';
                    eString += srvCall.errorMessage;
                    omsLog.error(eString);
                    throw new Error(eString);
                }
                if (!empty(result) && Object.prototype.hasOwnProperty.call(result, 'compositeResponse')) {
                    // eslint-disable-next-line no-loop-func
                    result.compositeResponse.forEach(function (compositeResponse) {
                        if (compositeResponse.httpStatusCode >= 400 && compositeResponse.httpStatusCode <= 500 &&
                            (compositeResponse.referenceId === 'paymentStatus' || compositeResponse.referenceId === 'refundStatus')) {
                            eString = logPrefix + '\tERROR at composite response:';
                            compositeResponse.body.forEach(function (body) {
                                eString += Object.keys(body)
                                    .map(function (key) {
                                        return '\n\t' + key + ': ' + body[key];
                                    })
                                    .join();
                            });
                            throw new Error(eString);
                        }
                        // eslint-disable-next-line no-cond-assign
                        if (compositeResponse.httpStatusCode >= 200 && compositeResponse.httpStatusCode < 400 &&
                            (compositeResponse.referenceId === 'paymentStatus' || compositeResponse.referenceId === 'refundStatus')) {
                            Transaction.begin();
                            CustomObjectMgr.remove(paymentUpdateObject);
                            Transaction.commit();
                        }
                    });
                } else {
                    eString = logPrefix + '\tERROR at composite response: empty or unmatched response';
                    omsLog.error(eString);
                    throw new Error(eString);
                }
            }
        }
    } catch (e) {
        eString = logPrefix + '\tERROR at execute:';
        eString += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();

        omsLog.error(eString);
        throw new Error(eString);
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
