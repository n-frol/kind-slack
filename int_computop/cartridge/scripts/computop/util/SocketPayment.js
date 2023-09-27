/* global session */

'use strict';
/**
* Script that provides functions for socket payments
*/

(function (exports) {
    /* API includes */
    var Logger = require('dw/system/Logger');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');

    /* Script includes */
    var server = require('server');
    var SessionDataConversion = require('*/cartridge/scripts/computop/util/SessionDataConversion'); // eslint-disable-line

    // transfer object base path
    var transferObjectBasePath = '*/cartridge/scripts/computop/transferobjects/';

    // service class base path
    var svcBasePath = '*/cartridge/scripts/computop/svc/';

    // PayPal Helper module
    var PayPalHelpers = require(
        '*/cartridge/scripts/computop/helpers/PayPalHelpers');

    // Module level logging.
    var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
    var logPrefix = 'PAYMENTOPERATOR_PAYGATE - SocketPayment.js:\n\t';

    /**
     * Object with available socket payment methods
     *
     * @var Object
     */
    var socketPaymentMethods = {
    	CREDIT_CARD:						'CreditDirectService',
        PAYMENTOPERATOR_CREDIT_DIRECT:      'CreditDirectService',
        PAYMENTOPERATOR_PAYPALEXPRESS:      'PaypalExpressService',
        PAYMENTOPERATOR_KLARNA:             'KlarnaService',
        PAYMENTOPERATOR_DIRECT_DEBIT_SEPA:  'DirectDebitService',
        PAYMENTOPERATOR_EASYCREDIT:         'EasyCreditService',
        PAYMENTOPERATOR_PAYMORROW_SDD:      'PaymorrowService',
        PAYMENTOPERATOR_PAYMORROW_INVOICE:  'PaymorrowService'
    };

    /**
     * If it is a computop payment method - create transferobject,
     * service class and execute api call
     *
     * @param {string} methodName - name of payment method
     * @param {dw.order.Order} order - current order
     * @param {dw.order.PaymentInstrument} paymentInstrument - order paymentinstrument
     * @returns {boolean|dw.util.HashMap} - false in case of error / HashMap for credit 3d
     */
    function callService(paymentMethodName, order, paymentInstrument) {
        var methodName = paymentMethodName;
        var success = false;
        var socketMethodFound = false;
        var cdpmMethods = Object.keys(socketPaymentMethods);
        var ppId;
        var svcClass;
        var transferObject;
        var result;

        if (cdpmMethods.indexOf(methodName) > -1) {
            socketMethodFound = true;
            transferObject = getTransferObject(methodName); // eslint-disable-line no-use-before-define
            svcClass = getServiceClass(socketPaymentMethods[methodName]); // eslint-disable-line no-use-before-define
        } else if (methodName === 'PAYMENTOPERATOR_PAYPAL' || methodName === 'PayPal') {
            ppId = methodName === 'PayPal' ? new String(paymentInstrument.getCustom()['paymentOperatorPPBillingAgreementId']) : PayPalHelpers.getPayPalCustomerPI();

            // If the customer is authenticated, and has a current billing
            // agreement for PayPal Stored, then call the service.
            if (ppId) {
                socketMethodFound = true;
                methodName = 'PAYMENTOPERATOR_PAYPAL_REFERENCETRANSACTION';
                transferObject = getTransferObject(methodName); // eslint-disable-line no-use-before-define
                svcClass = getServiceClass('PayPalReferenceTransactionService'); // eslint-disable-line no-use-before-define
            }
        } else if (methodName === 'DW_APPLE_PAY') {
            socketMethodFound = true;
            methodName = 'CREDIT_CARD';
            transferObject = getTransferObject(methodName); // eslint-disable-line no-use-before-define
            svcClass = getServiceClass(socketPaymentMethods[methodName]); // eslint-disable-line no-use-before-define
        }

        try {
            if (transferObject && svcClass) {
                var customer = order.getCustomer();

                transferObject.setOrder(order)
                    .setCustomer(customer.authenticated ? customer : null)
                    .setPaymentInstrument(paymentInstrument)
                    .setPaymentInformation(server.forms.getForm('billing'));

                var errorMessage = ['Paymentoperator - error while payment authorization [' + methodName + '] : '];
                // adding custom parameters to transfer object for specific payment methods
                if (!addCustomParametersToTransferObject(transferObject, methodName)) { // eslint-disable-line no-use-before-define
                    errorMessage.push('Error while updating TransferObject!');
                    cdpmLogger.error(logPrefix + errorMessage.join(''));
                    return success;
                }

                svcClass.call(transferObject.getTransferObject());
                result = svcClass.getResponse();

                if (!result) {
                    errorMessage.push('No response!');
                    cdpmLogger.error(logPrefix + errorMessage.join(''));
                    return success;
                }

                // saving CreditDirect CC data in PaymentInstrument / Order
                if (methodName === 'PAYMENTOPERATOR_CREDIT_DIRECT'
                    && !saveCCData(customer, paymentInstrument, result) // eslint-disable-line no-use-before-define
                ) {
                    errorMessage.push('Error while saving CCData in customer payment instrument!');
                    cdpmLogger.error(logPrefix + errorMessage.join(''));
                    return success;
                }
                require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, result);

                // return service call response and save data in session
                // if it contains ACSURL (3d-secure-cc)
                if (result.get('ACSURL')) {
                    // the attribute name in this case is 'TransId'
                    if (SessionDataConversion.storeOrderCreditDirect3DDataInSession(result.get('TransId'), order)) {
                        return result;
                    }
                    return success;
                }

                // handle result
                if (['OK', 'success', 'AUTHORIZED', 'AUTHORIZE_REQUEST'].indexOf(result.Status) === -1) {
                    cdpmLogger.error(logPrefix + 'Authorization failed for [' + methodName + '] - transaction status : ' + result.Status);
                    return success;
                }

                // adding information to PaymentInstrument
                var paymentTransaction = paymentInstrument.getPaymentTransaction();
                if(paymentInstrument.getPaymentMethod() != "DW_APPLE_PAY"){
                    var paymentProcessor = PaymentMgr.getPaymentMethod(
                    paymentInstrument.getPaymentMethod()).getPaymentProcessor();
                } else {
                    var paymentProcessor = PaymentMgr.getPaymentMethod('CREDIT_CARD').getPaymentProcessor();
                }

                Transaction.wrap(function () {
                    paymentTransaction.setPaymentProcessor(paymentProcessor);
                    paymentTransaction.setTransactionID(order.getOrderNo());
                });
                success = true;

                cdpmLogger.info(logPrefix +
                    'Payment Method [ {0} ] authorized successfully',
                    methodName
                );
            } else if (socketMethodFound) {
                cdpmLogger.error(logPrefix + 'Paymentoperator - error while payment authorization ['
                    + methodName + '] : no transferObject or service');
            }
        } catch (err) {
            cdpmLogger.error(logPrefix + 'Paymentoperator - error while payment authorization ['
                + methodName + '] : ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return success;
    }

    /**
     * Try to get transfer object instance for that method
     *
     * @param {string} methodName - current payment method name
     * @returns {null|Object} - instance of transfer object class or null if nothing found
     */
    function getTransferObject(methodName) {
        var transferObject = null;
        if (methodName == "CREDIT_CARD") {
        	methodName = "PAYMENTOPERATOR_CREDIT_DIRECT";
        }
        var path = transferObjectBasePath + methodName;

        try {
            transferObject = require(path);
        } catch (err) {
            cdpmLogger.error(logPrefix + 'No transfer object found for : '
                + methodName + ', in: ' + path);
        }
        return transferObject;
    }

    /**
     * Try to get service class for that method
     *
     * @param {string} svcName - service name for current payment method
     * @returns {Object} - instance of service class
     */
    function getServiceClass(svcName) {
        var svcClass = null;
        var path = svcBasePath + svcName;

        try {
            svcClass = require(path);
        } catch (err) {
            cdpmLogger.error(logPrefix + 'No service class found for : ' +
                svcName + ', in: ' + path);
        }
        return svcClass;
    }

    /**
     * Try to save the credit card information from the result in the payment instrument.
     * Needed for CreditDirect.
     *
     * @requires dw.system.Transaction
     * @param {dw.customer.Customer} customer - current customer
     * @param {dw.order.OrderPaymentInstrument} orderPaymentInstrument - used payment instrument
     * @param {dw.util.HashMap} result - from paygate response
     * @returns {boolean} - A success flag
     */
    function saveCCData(customer, orderPaymentInstrument, result) {
        try {
            var PCNr = result.get('PCNr');
            var CCExpiry = result.get('CCExpiry');
            var CCBrand = result.get('CCBrand');

            if (customer.registered) {
                // get matching customer payment instrument
                var wallet = customer.profile.wallet;
                if (wallet.paymentInstruments.length > 0) {
                    var customerPaymentInstrument;
                    var iterator = wallet.paymentInstruments.iterator();

                    while (iterator.hasNext()) {
                        var pi = iterator.next();
                        if (pi.UUID === session.privacy.PaymentOperatorCCUUID) {
                            customerPaymentInstrument = pi;
                        }
                    }

                    // Assign attributes to matching CustomerPaymentInstrument.
                    if (customerPaymentInstrument
                        && !Object.prototype.hasOwnProperty.call(customerPaymentInstrument.custom, 'paymentOperatorCCNr')
                    ) {
                        Transaction.wrap(function () {
                            customerPaymentInstrument.custom.paymentOperatorCCNr = PCNr;
                            customerPaymentInstrument.custom.paymentOperatorCCExpiry = CCExpiry;
                            customerPaymentInstrument.custom.paymentOperatorCCBrand = CCBrand;
                        });
                    }
                }
            }

            // Assign attributes to the OrderPaymentInstrument.
            Transaction.wrap(function () {
                orderPaymentInstrument.custom.paymentOperatorCCNr = PCNr;
                orderPaymentInstrument.custom.paymentOperatorCCExpiry = CCExpiry;
                orderPaymentInstrument.custom.paymentOperatorCCBrand = CCBrand;
            });
        } catch (err) {
            cdpmLogger.error(logPrefix + err.message + '\n' + err.stack);
            return false;
        }
        return true;
    }

    /**
     * Set session data to transfer object for certain payment methods
     *
     * @param {Object} transferObject - current parameter hash map
     * @param {string} methodName - payment method name
     * @returns {boolean} result
     */
    function addCustomParametersToTransferObject(transferObject, methodName) {
        var paramMap;

        switch (methodName) {
            case 'PAYMENTOPERATOR_PAYPALEXPRESS':
                paramMap = SessionDataConversion.getPaypalExpressDataFromSession();
                if (!paramMap) {
                    cdpmLogger.error(logPrefix + 'No PaypalExpressData in session');
                    return false;
                }
                transferObject.setPaypalExpressParams(paramMap);
                break;
            case 'PAYMENTOPERATOR_EASYCREDIT':
                paramMap = SessionDataConversion.getEasyCreditDataFromSession();
                if (!paramMap) {
                    cdpmLogger.error(logPrefix + 'No EasyCreditData in session');
                    return false;
                }
                transferObject.setEasyCreditData(paramMap);
                break;
            default:
                break;
        }
        return true;
    }

    exports.callService = callService; // eslint-disable-line
}(module.exports));
