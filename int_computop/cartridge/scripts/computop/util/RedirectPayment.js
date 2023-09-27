/* globals session, customer */
/* eslint-disable no-param-reassign */
'use strict';

/**
 * Script that creates urls for redirect payments
 */
(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    var HashMap = require('dw/util/HashMap');
    var logPrefix = 'PAYMENTOPERATOR_PAYGATE - AbstractComputopService.ds\n\t';

    var Site = require('dw/system/Site').getCurrent();

    // transfer object base path
    var basePath = 'int_computop/cartridge/scripts/computop/transferobjects/';

    /**
     * List with available redirect payment methods
     *
     * @var Array
     */
    var redirectPaymentMethods = [
        'PAYMENTOPERATOR_IDEAL',
        'PAYMENTOPERATOR_ONLINE_TRANSFER',
        'PAYMENTOPERATOR_PAYPAL',
        'PAYMENTOPERATOR_GIROPAY',
        'PAYMENTOPERATOR_BANCONTACT',
        'PAYMENTOPERATOR_KOREA_CC',
        'PAYMENTOPERATOR_CREDIT',
        'PAYMENTOPERATOR_POSTFINANCE',
        'PAYMENTOPERATOR_TRUSTPAY',
        'PAYMENTOPERATOR_POLI',
        'PAYMENTOPERATOR_PRZELEWY24',
        'PAYMENTOPERATOR_QIWI',
        'PAYMENTOPERATOR_PAYGATE_CHINA',
        'PAYMENTOPERATOR_MASTERPASS',
        'PAYMENTOPERATOR_ALIPAY',
        'PAYMENTOPERATOR_PAYU',
        'PAYMENTOPERATOR_EPS'
    ];

    /**
     * Try to get transfer object instance for that method
     *
     * @param {string} methodName - name of current payment method
     * @returns {Object} - instance of transfer object class
     */
    function getTransferObject(methodName) {
        var transferObject = null;
        var path = basePath + methodName;

        try {
            transferObject = require(path);
        } catch (err) {
            cdpmLogger.error(logPrefix + 'No transfer object found for : '
                + methodName + ', in: ' + path + ' error message: ' + err);
        }
        return transferObject;
    }

    /**
     * Create encrypted transaction id of cart uuid
     *
     * @param {dw.order.Basket} cart - current basket
     * @returns {string} - hashed uid later used transID
     */
    function getGeneratedTransId(cart) {
        return require('dw/util/UUIDUtils').createUUID();
    }

    /**
     * Method to filter PaymentOperator methods - returns true if instruments contain a cpdm payment method
     *
     * @param {dw.util.Collection<dw.order.PaymentInstrument>} instruments - payment instrument collection
     * @returns {boolean|string}
     */
    function getPaymentOperatorPaymentInstrument(instruments) {
        var iter = instruments.iterator();

        while (iter.hasNext()) {
            var instrument = iter.next();
            var method = instrument.getPaymentMethod();

            if (method.indexOf('PAYMENTOPERATOR', 0) > -1
                && redirectPaymentMethods.indexOf(method) > -1
            ) {
                // If this is a stored PayPal payment instrument, then it will
                // not be used as a redirect payment.
                if (method === 'PAYMENTOPERATOR_PAYPAL' &&
                    !empty(instrument.creditCardType) &&
                    instrument.creditCardType === 'PayPal'
                ) {
                    return false;
                }
                return method;
            }
        }
        return false;
    }

    /**
     * Get redirect url from payment method's transfer object
     *
     * @param {dw.order.Order} order - current order
     * @param {dw.web.Form} paymentForm - billing form with payment data
     * @returns {string|boolean} - url for redirect to paygate
     */
    function getPaymentOperatorRedirectUrl(order, paymentForm) {
        var instruments = order.getPaymentInstruments();
        var method = getPaymentOperatorPaymentInstrument(instruments);

        if (method) {
            var transferObject = getTransferObject(method);
            if (transferObject) {
                transferObject.setOrder(order)
                    .setPaymentInformation(paymentForm);

                return transferObject.getRedirectUrl();
            }
        }
        return false;
    }

    /**
     * Paypal express requires dedicated logic for creating transfer object
     *
     * @param {dw.order.Basket} cart - current basket
     * @param {string} orderNo - generated orderNo for paypal express
     * @param {Object} session - request session object
     * @returns {string|boolean} - either url to paypal or false if no transferobject exists
     */
    function getPaypalExpressRedirectUrl(cart, orderNo, session) {
        var transferObject = getTransferObject('PaypalExpressAddress');

        if (transferObject) {
            transferObject.setOrder(cart);
            transferObject.setOrderNo(orderNo);

            var params = new HashMap();
            var transID = getGeneratedTransId(cart);
            params.put('TransID', transID);
            params.put('PayID', '');
            transferObject.setPaypalExpressParams(params);

            session.privacyCache.set('paypalExpressTransId', transID);
            return transferObject.getRedirectUrl();
        }

        return false;
    }

    /**
     * Create redirect url for MasterPassQuickCheckout
     *
     * @param {dw.order.Basket} cart - current basket
     * @param {string} orderNo - generated orderNo for masterpass
     * * @param {Object} session - request session object
     * @returns {string|boolean} - redirect url to master pass or false if no transfer object exists
     */
    function getMasterPassQuickCheckoutRedirectUrl(cart, orderNo, session) {
        var transferObject = getTransferObject('PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT');

        if (transferObject) {
            var transId = getGeneratedTransId(cart);

            transferObject.setLineItemCtnr(cart);
            transferObject.setOrderNo(orderNo);
            transferObject.setTransId(transId);

            session.privacyCache.set('masterpassQuickCheckoutTransId', transId);
            return transferObject.getRedirectUrl();
        }

        return false;
    }

    /**
     * Create redirect url for easy credit
     *
     * @param {dw.order.Basket} cart - current basket
     * @param {string} orderNo - generated orderNo for easycredit
     * @param {Object} session - request session object
     * @returns {string|boolean} - redirect url to easycredit or false if no transfer object exists
     */
    function getEasyCreditRedirectUrl(cart, orderNo, session) {
        var transferObject = getTransferObject('EasyCreditInitialization');

        if (transferObject) {
            var transId = getGeneratedTransId(cart);

            transferObject.setOrder(cart);
            transferObject.setOrderNo(orderNo);
            transferObject.setTransId(transId);

            session.privacyCache.set('easyCreditTransId', transId);
            return transferObject.getRedirectUrl();
        }

        return false;
    }

    /**
     * Save payment details to order payment instruments during payment authorization
     *
     * @param {number} orderNo - current order id
     * @param {dw.order.PaymentInstrument} paymentInstrument - current order's payment instrument
     * @param {dw.order.PaymentProcessor} paymentProcessor - current payment processor
     * @returns {boolean}
     */
    function savePaymentDetails(orderNo, paymentInstrument, paymentProcessor) {
        // proceed only for redirect payment method
        if (redirectPaymentMethods.indexOf(paymentInstrument.getPaymentMethod()) === -1) {
            return false;
        } else if (paymentInstrument.paymentMethod === 'PAYMENTOPERATOR_PAYPAL' &&
            paymentInstrument.creditCardType === 'PayPal'
        ) {
            return false;
        }

        require('dw/system/Transaction').wrap(function () {
            paymentInstrument.paymentTransaction.transactionID = orderNo; // eslint-disable-line
            paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor; // eslint-disable-line
        });

        return true;
    }

    /**
     * Decrypts parameter map of redirect from paygate
     *
     * @param {string} queryString - response from paygate
     * @param {boolean} encrypted - if true then response is encrypted / special handling for easycredit
     * @returns {Object} - decrypted string
     */
    function parseURLString(queryString, encrypted) {
        var qs = queryString;

        // contains len and data
        if (qs.indexOf('&') !== -1) {
            var start = qs.indexOf('Data=') + 5;
            var end = qs.length;

            qs = qs.substring(start, end);
            cdpmLogger.info('Short: ' + qs);
        }

        var ParameterMap = new HashMap();
        var Blowfish = require('~/cartridge/scripts/computop/lib/Blowfish');

        if (encrypted) {
            try {
                qs = Blowfish.decryptBlowfish(
                    qs,
                    Site.getCustomPreferenceValue('paymentOperatorMerchantCode')
                );
            } catch (err) {
                cdpmLogger.error(logPrefix + 'Paymentoperator encryption failed! '
                    + err.fileName + ': ' + err.message + '\n' + err.stack);
                cdpmLogger.info('Paymentoperator encrypted string: ' + qs);
                return { error: true };
            }
            cdpmLogger.info('Paymentoperator DECRYPTED response: ' + qs);
        }

        // Turn <plus> back to <space>
        // See: http://www.w3.org/TR/REC-html40/interact/forms.html#h-17.13.4.1
        if (qs) {
            qs = qs.replace(/\+/g, ' ');
            var args = qs.split('&'); // parse out name/value pairs separated via &

            // split out each name=value pair
            for (var i = 0; i < args.length; i++) {
                var value;
                var pair = args[i].split('=');
                var name = unescape(pair[0]);

                if (pair.length === 2) {
                    value = unescape(pair[1]);
                } else {
                    value = name;
                }

                ParameterMap.put(name, value);
            }
        }

        return { ParameterMap: ParameterMap };
    }

    exports.getRedirectUrl = getPaymentOperatorRedirectUrl; // eslint-disable-line no-param-reassign
    exports.getPaypalExpressRedirectUrl = getPaypalExpressRedirectUrl; // eslint-disable-line no-param-reassign
    exports.getMasterPassQuickCheckoutRedirectUrl = getMasterPassQuickCheckoutRedirectUrl; // eslint-disable-line no-param-reassign
    exports.getEasyCreditRedirectUrl = getEasyCreditRedirectUrl; // eslint-disable-line no-param-reassign
    exports.parseURLString = parseURLString; // eslint-disable-line no-param-reassign
    exports.savePaymentDetails = savePaymentDetails; // eslint-disable-line no-param-reassign
}(module.exports));
