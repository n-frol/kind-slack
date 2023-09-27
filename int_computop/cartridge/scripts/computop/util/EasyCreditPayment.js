'use strict';
/**
 * Script that provides functions for easycredit
 */
(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    var HashMap = require('dw/util/HashMap');
    var Resource = require('dw/web/Resource');
    var StringUtils = require('dw/util/StringUtils');

    /**
     * Create parameter map for easyCredit Get call
     *
     * @param {string} orderNo - current order's orderNo
     * @param {string} paymentId - reference id for payment
     * @param {string} transactionId - probably orderNo or UUID
     * @returns {dw.util.HashMap} - hashMap
     */
    function createGetParameterMap(orderNo, paymentId, transactionId) {
        var map = new HashMap();
        map.put('UserData', orderNo);
        map.put('PayID', paymentId);
        map.put('TransID', transactionId);
        return map;
    }

    /**
     * Create transferobject, service class and execute api call
     *
     * @param {dw.util.HashMap} requestParameterMap - request parameter
     * @param {dw.order.Basket} currentBasket - current basket
     * @returns {boolean}
     */
    function callGetService(requestParameterMap, currentBasket) {
        var result = { error: false, msg: 'success' };
        var response;
        var transferObject = require('~/cartridge/scripts/computop/transferobjects/EasyCreditGet');
        var svcClass = require('~/cartridge/scripts/computop/svc/EasyCreditService');

        try {
            if (transferObject && svcClass) {
                transferObject.setEasyCreditData(requestParameterMap);
                transferObject.setOrder(currentBasket);

                svcClass.call(transferObject.getTransferObject());
                response = svcClass.getResponse();

                // handle response
                if (['OK', 'success', 'AUTHORIZE_REQUEST'].indexOf(response.Status) === -1) {
                    cdpmLogger.error('Get call failed for [easyCredit] - transaction status : ' + response.Status);
                    result.error = true;
                    result.msg = Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null);
                    return result;
                }

                var decision = decodeParam(response, 'decision'); // eslint-disable-line no-use-before-define
                if (!decision || decision.entscheidung.entscheidungsergebnis !== 'GRUEN') {
                    result.error = true;
                    cdpmLogger.error('Get call failed for [easyCredit] - could not parse parameter "decision" or decision result is not GRUEN.');
                    result.msg = Resource.msg('paymentoperator.error.easycredit.rejected', 'paymentoperatoreasycredit', null);
                    return result;
                }

                var process = decodeParam(response, 'process'); // eslint-disable-line no-use-before-define
                if (!process) {
                    result.error = true;
                    cdpmLogger.error('Get call failed for [easyCredit] - could not parse parameter "process".');
                    result.msg = Resource.msg('paymentoperator.error.easycredit.rejected', 'paymentoperatoreasycredit', null);
                    return result;
                }

                var financing = decodeParam(response, 'financing'); // eslint-disable-line no-use-before-define
                if (!financing) {
                    result.error = true;
                    cdpmLogger.error('Get call failed for [easyCredit] - could not parse parameter "financing".');
                    result.msg = Resource.msg('paymentoperator.error.easycredit.rejected', 'paymentoperatoreasycredit', null);
                    return result;
                }

                // create payment instrument
                require('dw/system/Transaction').wrap(function () {
                    var popStatus = require('*/cartridge/scripts/computop/util/Checkout').removePaymentOperatorInstrumentsFromBasket();
                    if (!popStatus) {
                        result.error = true;
                        result.msg = Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null);
                    } else {
                        var paymentInstrument = currentBasket.createPaymentInstrument('PAYMENTOPERATOR_EASYCREDIT', currentBasket.totalGrossPrice);
                        paymentInstrument.custom.paymentOperatorECInterestAmount = financing.ratenplan.zinsen.anfallendeZinsen; // eslint-disable-line no-param-reassign
                        paymentInstrument.custom.paymentOperatorECTransactionID = process.allgemeineVorgangsdaten.tbVorgangskennung; // eslint-disable-line no-param-reassign
                        paymentInstrument.custom.paymentOperatorECTechnicalTransactionID = process.allgemeineVorgangsdaten.fachlicheVorgangskennung; // eslint-disable-line no-param-reassign

                        result.term = financing.finanzierung.laufzeit;
                        result.repaymentText = process.tilgungsplanText;
                        result.urlPrecontractInformation = process.allgemeineVorgangsdaten.urlVorvertraglicheInformationen;
                    }
                });
            }
        } catch (err) {
            cdpmLogger.error('Paymentoperator - error while EasyCredit Get Call : ' + err.fileName + ': ' + err.message + '\n' + err.stack);
            result.error = true;
            result.msg = Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null);
        }
        return result;
    }

    /**
     * Decode given base64 encoded param
     *
     * @param {dw.util.HashMap} response - paygate response
     * @param {string} paramName - response key: its value will be decoded
     * @returns {boolean|string} - false if key can not be found otherwise string
     */
    function decodeParam(response, paramName) {
        var rawValue = response.get(paramName);
        var param = false;
        if (!rawValue) {
            return false;
        }

        try {
            var jsonString = StringUtils.decodeBase64(rawValue);
            if (!jsonString || jsonString.length < 1) {
                return false;
            }
            param = JSON.parse(jsonString);
        } catch (err) {
            return false;
        }
        return param;
    }

    exports.createGetParameterMap = createGetParameterMap; // eslint-disable-line no-param-reassign
    exports.callGetService = callGetService; // eslint-disable-line no-param-reassign
}(module.exports));
