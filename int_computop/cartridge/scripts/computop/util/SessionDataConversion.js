/* globals session */

'use strict';

/* API includes */
var Logger = require('dw/system/Logger');
var HashMap = require('dw/util/HashMap');
var Money = require('dw/value/Money');
var Currency = require('dw/util/Currency');

// Module level declarations
var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
var logPrefix = 'PAYMENTOPERATOR_PAYGATE - SessionDataConversion.js\n\t';

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts a map into session data.
 *
 * @param {string} transactionId - session identifier
 * @param {dw.order.Order} order
 * @returns {boolean} - returns false in case of an error otherwise true
 */
function storeOrderCreditDirect3DDataInSession(transactionId, order) {
    if (transactionId == null || order == null) {
        cdpmLogger.error('Error storing OrderCreditDirect3DData in session [missing TransactionID or Order]');
        return false;
    }

    var storageTransactionId = 'transId_' + transactionId;
    var storageString = session.privacy.DCSData;
    var storageObject = {};

    if (storageString !== null) {
        storageObject = JSON.parse(storageString);
    }

    var orderObject = {};
    orderObject.order_id = order.getOrderNo();
    orderObject.order_token = order.getOrderToken();
    orderObject.amount = getAmountFractionValue(order); // eslint-disable-line no-use-before-define
    orderObject.currency = order.getCurrencyCode();

    storageObject[storageTransactionId] = orderObject;
    try {
        var newStorageString = JSON.stringify(storageObject);
        var logMsg = logPrefix +
            'Error storing OrderCreditDirect3DData in session '
            + '[TransactionID=' + transactionId + ']\n\t'
        session.privacy.DCSData = newStorageString;
    } catch (e) {
        cdpmLogger.error(
        );

        return false;
    }

    return true;
}

/**
* Retrieve order total amount
*
* @param {dw.order.LineItemCtnr} order - current order
* @return {dw.util.Money}
*/
function getFixedContainerTotalAmount(order) {
    var totalGrossPrice = order.getTotalGrossPrice();
    var adjustedPrice = order.getAdjustedMerchandizeTotalPrice(true);
    if (totalGrossPrice != null && totalGrossPrice.isAvailable()) {
        return totalGrossPrice;
    } else if (adjustedPrice != null && adjustedPrice.isAvailable()) {
        return adjustedPrice.add(order.getGiftCertificateTotalPrice());
    }
    // a number value is needed, so 0 is returned
    return new Money(0, order.getCurrencyCode());
}

/**
 * Fetch the amount of a money object converted to the fraction unit of its currency / returns 0 if Money object is null
 *
 * @param {dw.order.LineItemCtnr} order - either current basket or order
 * @return {number} - calculated order amount as integer
 */
function getAmountFractionValue(order) {
    var amount = getFixedContainerTotalAmount(order);
    if (amount != null && amount.isAvailable()) {
        var currencyCode = amount.getCurrencyCode();
        var currency = Currency.getCurrency(currencyCode);
        var fractionDigits = currency.getDefaultFractionDigits();
        var fractionAmount = (amount.value * Math.pow(10, fractionDigits)).toFixed();
        return fractionAmount;
    }
    return 0;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts the session data back to a map.
 *
 * @param {string} transactionId - credit3d session identifier
 * @returns {dw.util.HashMap|boolean} - either hashMap with session data or false if nothing found
 */
function getOrderCreditDirect3DDataFromSession(transactionId) {
    if (transactionId == null) {
        cdpmLogger.error('Error retrieving OrderCreditDirect3DData from session : missing TransactionID');
        return null;
    }

    var storageTransactionId = 'transId_' + transactionId;
    var storageString = session.privacy.DCSData;
    var storageObject = {};

    if (storageString !== null) {
        storageObject = JSON.parse(storageString);
    } else {
        cdpmLogger.error('Error retrieving OrderCreditDirect3DData from session : missing session data');
        return null;
    }

    var orderData = new HashMap();
    if (storageObject[storageTransactionId]) {
        var orderObject = storageObject[storageTransactionId];
        orderData.put('order_id', orderObject.order_id);
        orderData.put('order_token', orderObject.order_token);
        orderData.put('amount', orderObject.amount);
        orderData.put('currency', orderObject.currency);

        delete storageObject[transactionId];
        session.privacy.DCSData = JSON.stringify(storageObject);
    } else {
        cdpmLogger.error('Error retrieving OrderCreditDirect3DData from session : missing session data');
        return null;
    }

    return orderData;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts a map into session data.
 *
 * @param {dw.util.HashMap} dataMap - paypal express transaction data
 * @returns {boolean}
 */
function storePaypalExpressDataInSession(dataMap) {
    if (!dataMap) {
        cdpmLogger.error('Error storing PaypalExpressData in session [no data]');
        return false;
    }
    // PayID / TransID
    var payId = dataMap.get('PayID');
    var transId = dataMap.get('TransID');
    var userData = dataMap.get('UserData');
    if (!payId || !transId) {
        cdpmLogger.error(
            'Error storing PaypalExpressData in session [PayID=' + payId + '|TransID=' + transId
            + '|UserData=' + userData + ']'
        );
        return false;
    }
    session.privacy.PaypalExpressData = (payId + '\t' + transId + '\t' + userData);
    return true;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts the session data back to a map.
 *
 * @returns {dw.util.HashMap} - paypal express transaction data
 */
function getPaypalExpressDataFromSession() {
    var storageString = '';
    var storageKeys = ['PayID', 'TransID', 'UserData'];
    var storageArray = [];
    var storageMap = new HashMap();

    storageString = session.privacy.PaypalExpressData;
    if (!storageString) {
        return false;
    }

    storageArray = storageString.split('\t');
    if (storageKeys.length != storageArray.length) {
        cdpmLogger.error('Error retrieving PaypalExpressData from session : invalid session data');
        return false;
    }

    // PayID / TransID
    for (var i = 0; i < storageKeys.length; i++) {
        storageMap[storageKeys[i]] = storageArray[i];
    }

    return storageMap;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts a map into session data.
 *
 * @param {dw.util.HashMap} dataMap - masterpass transaction data
 * @returns {boolean}
 */
function storeMasterPassQuickCheckoutDataInSession(dataMap) {
    if (!dataMap) {
        cdpmLogger.error('Error storing MasterPassQuickCheckoutData in session [no data]');
        return false;
    }

    // masterpassid / TransactionID / UserData / TransID / confirstname / conlastname
    var masterPassId = dataMap.get('masterpassid');
    var transactionId = dataMap.get('TransactionID');
    var userData = dataMap.get('UserData');
    var transId = dataMap.get('TransID');
    var conFirstName = dataMap.get('confirstname');
    var conLastName = dataMap.get('conlastname');
    if (!masterPassId || !transactionId || !userData || !transId || !conFirstName || !conLastName) {
        cdpmLogger.error('Error storing MasterPassQuickCheckoutData in session '
            + '[masterpassid=' + masterPassId
            + '|TransactionID=' + transactionId
            + '|UserData=' + userData
            + '|TransID=' + transId
            + '|confirstname=' + conFirstName
            + '|conlastname=' + conLastName
            + ']');
        return false;
    }
    session.privacy.MasterPassQuickCheckoutData = (masterPassId + '\t' + transactionId + '\t' + userData + '\t' + transId + '\t' + conFirstName + '\t' + conLastName);

    return true;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts the session data back to a map.
 *
 * @returns {dw.util.HashMap}
 */
function getMasterPassQuickCheckoutDataFromSession() {
    var storageString = '';
    var storageKeys = ['masterpassid', 'TransactionID', 'UserData', 'TransID', 'confirstname', 'conlastname'];
    var storageArray = [];
    var storageMap = new HashMap();

    storageString = session.privacy.MasterPassQuickCheckoutData;
    if (!storageString) {
        return false;
    }

    storageArray = storageString.split('\t');
    if (storageKeys.length != storageArray.length) {
        cdpmLogger.error('Error retrieving MasterPassQuickCheckoutData from session : invalid session data');
        return false;
    }

    // masterpassid / TransactionID / UserData / TransID / confirstname / conlastname
    for (var i = 0; i < storageKeys.length; i++) {
        storageMap[storageKeys[i]] = storageArray[i];
    }

    return storageMap;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts a map into session data.
 *
 * @param {dw.util.HashMap} dataMap - easycredit transaction data
 * @param {dw.order.Basket} basket - current basket
 * @returns {boolean} - returns true if easycredit data is saved in session
 */
function storeEasyCreditDataInSession(dataMap, basket) {
    if (!dataMap) {
        cdpmLogger.error('Error storing EasyCreditCheckoutData in session [no data]');
        return false;
    }
    if (!basket) {
        cdpmLogger.error('Error storing EasyCreditCheckoutData in session [no cart]');
        return false;
    }

    var billingAddressHash = require('~/cartridge/scripts/computop/util/AddressConversion').getHashFromAddress(basket.getBillingAddress());
    var cartAmount = getAmountFractionValue(basket);

    // PayID / TransID / UserData / BillingAddressHash
    var payId = dataMap.get('PayID');
    var transId = dataMap.get('TransID');
    var userData = dataMap.get('UserData');
    if (!payId || !transId || !userData || !billingAddressHash || !cartAmount) {
        cdpmLogger.error(
            'Error storing EasyCreditCheckoutData in session [PayID=' + payId
            + '|TransID=' + transId + '|UserData=' + userData
            + '|BillingAddressHash=' + billingAddressHash + '|CartAmount=' + cartAmount + ']'
        );
        return false;
    }
    session.privacy.EasyCreditData = (payId + '\t' + transId + '\t' + userData + '\t' + billingAddressHash + '\t' + cartAmount);

    return true;
}

/**
 * Due DW quota restrictions maps need to be stored into session objects as String.
 * This script converts the session data back to a map.
 *
 * @returns {dw.util.HashMap} - parse session data to hash map
 */
function getEasyCreditDataFromSession() {
    var storageString = '';
    var storageKeys = ['PayID', 'TransID', 'UserData', 'BillingAddressHash', 'CartAmount'];
    var storageArray = [];
    var storageMap = new HashMap();

    storageString = session.privacy.EasyCreditData;
    if (!storageString) {
        return false;
    }

    storageArray = storageString.split('\t');
    if (storageKeys.length !== storageArray.length) {
        cdpmLogger.error('Error retrieving EasyCreditData from session : invalid session data');
        return false;
    }

    // PayID / TransID / UserData
    for (var i = 0; i < storageKeys.length; i++) {
        storageMap[storageKeys[i]] = storageArray[i];
    }

    return storageMap;
}

/**
 * Retrieve payment operator data from session.
 *
 * @param {string} methodName - payment method name
 * @param {boolean} clearSession - when true clear session data
 * @returns {Object} - retrieve delete data for later display
 */
function getPaymentDataFromSession(methodName, clearSession) {
    var viewData = {};

    var map = {
        PAYMENTOPERATOR_PAYPALEXPRESS: ['PaypalExpressData'],
        PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT: ['MasterPassQuickCheckoutData'],
        PAYMENTOPERATOR_EASYCREDIT: [
            'EasyCreditData',
            'EasyCreditTerm',
            'EasyCreditRepaymentText',
            'EasyCreditUrlPrecontractInformation'
        ],
        PAYMENTOPERATOR_PAYMORROW_INVOICE: ['carthash'],
        PAYMENTOPERATOR_PAYMORROW_SDD: ['carthash']
    };

    if (Object.prototype.hasOwnProperty.call(map, methodName)) {
        var methodSessionKeys = map[methodName];
        for (var i = 0; i < methodSessionKeys.length; i++) {
            var sessionKey = methodSessionKeys[i];
            viewData[sessionKey] = session.privacy[sessionKey];

            if (clearSession === true) {
                delete session.privacy[sessionKey];
            }
        }
    }

    return viewData;
}

/* exports */
module.exports = {
    storeOrderCreditDirect3DDataInSession: storeOrderCreditDirect3DDataInSession,
    getOrderCreditDirect3DDataFromSession: getOrderCreditDirect3DDataFromSession,
    storePaypalExpressDataInSession: storePaypalExpressDataInSession,
    getPaypalExpressDataFromSession: getPaypalExpressDataFromSession,
    storeMasterPassQuickCheckoutDataInSession: storeMasterPassQuickCheckoutDataInSession,
    getMasterPassQuickCheckoutDataFromSession: getMasterPassQuickCheckoutDataFromSession,
    storeEasyCreditDataInSession: storeEasyCreditDataInSession,
    getEasyCreditDataFromSession: getEasyCreditDataFromSession,
    getPaymentDataFromSession: getPaymentDataFromSession,
    getAmountFractionValue: getAmountFractionValue
};
