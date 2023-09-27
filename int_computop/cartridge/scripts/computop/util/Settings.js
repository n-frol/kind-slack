'use strict';
/* API includes */
var ArrayList = require('dw/util/ArrayList');
var Site = require('dw/system/Site').getCurrent();

/**
 * Retrieves site preference for given key.
 * @param {string} key - config key in site preferences
 * @returns {string} - custom site preference value
 */
function getSitePreference(key) {
    var result = Site.getCustomPreferenceValue(key);
    if (!result) {
        result = '';
    }
    return result;
}

/**
 * Retrieves PaygateChina Obt List.
 *
 * @return {ArrayList} - list with configured banks from site preferences
 */
function getPaygateChinaObtList() {
    var resultList = new ArrayList();
    var paygateChinaObtList = getSitePreference('paymentOperatorPaygateChinaObtList');
    if (paygateChinaObtList instanceof Array) {
        resultList = paygateChinaObtList;
    }
    return resultList;
}

/**
 * Retrieves PaygateChina Psp List.
 *
 * @return {ArrayList} - list with psp for paygate china method
 */
function getPaygateChinaPspList() {
    var resultList = new ArrayList();
    var paygateChinaPspList = getSitePreference('paymentOperatorPaygateChinaPspList');
    if (paygateChinaPspList instanceof Array) {
        resultList = paygateChinaPspList;
    }
    return resultList;
}

/**
 * Retrieves PaygateChina Active Bank List.
 *
 * @return {ArrayList} - list with active banks for paygate china
 */
function getPaygateChinaActiveBankList() {
    var resultList = new ArrayList();
    var paygateChinaObtList = getPaygateChinaObtList();
    var paygateChinaPspList = getPaygateChinaPspList();

    if (paygateChinaObtList instanceof Array) {
        resultList = resultList.concat(paygateChinaObtList);
    }
    if (paygateChinaPspList instanceof Array) {
        resultList = resultList.concat(paygateChinaPspList);
    }

    return resultList;
}

/**
 * Retrieve paymentoperator config values as json for frontend js
 *
 * @returns {string} - config values json encoded
 */
function getPaymentOperatorConfig() {
    var URLUtils = require('dw/web/URLUtils');

    var config = {
        payMorrowDeviceID: URLUtils.https('PaymentOperator-PaymorrowDeviceID').toString(),
        paymorrowIframeUrl: getSitePreference('paymentOperatorPaymorrowDeviceIDIframeUrl').displayValue
    };

    return JSON.stringify(config);
}

/* exports */
exports.getPaygateChinaObtList = getPaygateChinaObtList;
exports.getPaygateChinaPspList = getPaygateChinaPspList;
exports.getPaygateChinaActiveBankList = getPaygateChinaActiveBankList;
exports.getPaymentOperatorConfig = getPaymentOperatorConfig;
