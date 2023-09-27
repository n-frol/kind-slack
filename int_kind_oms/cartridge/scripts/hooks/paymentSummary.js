/* global empty */
'use strict';


/**
 *
 * @param {string} orderNo Order number
 * @param {string} sObject Oms sObject for the payment summery
 *
 * @returns {Object} json sObject response
 */
function getPaymentRecords(orderNo, sObject) {
    var svcOms = require('~/cartridge/scripts/svc/compositeQueryService');
    var compositeBody = {
        allOrNone: "true",
        collateSubrequests: "true",
        compositeRequest: [
            {
                method: 'GET',
                url: '/services/data/v53.0/query?q=SELECT Id, Amount FROM ' + sObject + ' WHERE OrderPaymentSummary.OrderSummary.OrderNumber=\'' + orderNo + '\' and Status = \'Draft\' LIMIT 1',
                referenceId: 'payment'
            }
        ]
    };
    // eslint-disable-next-line no-unused-vars
    var srvCall = svcOms.call(compositeBody);
    var result = svcOms.getResponse();
    return result;
}

/**
 * Oms service response parse function.

 * @param {Object} response - The oms update payment summary service hook return object
 *
 * @returns {Array} - returns payment records
 */
function parseResponse(response) {
    var returnObjects = [];
    if (!empty(response) && Object.prototype.hasOwnProperty.call(response, 'compositeResponse')) {
        // eslint-disable-next-line no-loop-func
        response.compositeResponse.forEach(function (compositeResponse) {
            // eslint-disable-next-line no-cond-assign
            if (compositeResponse.httpStatusCode === 200 &&
                compositeResponse.referenceId === 'payment' && compositeResponse.body.totalSize > 0) {
                compositeResponse.body.records.forEach(function (record) {
                    returnObjects.push({
                        Id: record.Id,
                        Amount: record.Amount
                    });
                });
            }
        });
    }
    return returnObjects;
}


/**
 * paymentSummaryUpdate.js
 *
 * Triggers card processing task to through the OMS payment status changes
 */

function updatePaymentSummary(orderNo, sObject, amount) {
    var records = getPaymentRecords(orderNo, sObject);
    var paymentRecords = parseResponse(records);

    var patchObjects = [];
    var patchObject = {};
    paymentRecords.forEach(function (record) {
        if (record.Amount === amount && patchObjects.length === 0) {
            patchObject = {
                method: 'PATCH',
                url: '/services/data/v53.0/sobjects/' + sObject + '/' + record.Id,
                referenceId: sObject + 'Status',
                body: { Status: 'Processed', Date: Date.now() }
            };
            patchObjects.push(patchObject);
        }
    });
    var svcOms = require('~/cartridge/scripts/svc/compositeQueryService');
    var compositeBody = {
        allOrNone: "true",
        collateSubrequests: "true",
        compositeRequest: patchObjects
    };
    // eslint-disable-next-line no-unused-vars
    var srvCall = svcOms.call(compositeBody);
    var result = svcOms.getResponse();
    return result;
}

module.exports = {
    updatePaymentSummary: updatePaymentSummary
};
