/* globals session, empty */

'use strict';

var paymentInstruments = module.superModule;
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

var server = require('server');

server.extend(paymentInstruments);

/**
 * Creates an object from form values
 * @param {Object} paymentForm - form object
 * @returns {Object} a plain object of payment instrument
 */
function getDetailsObject(paymentForm) {
    return {
        name: paymentForm.cardOwner.value,
        cardNumber: paymentForm.cardNumber.value,
        cardType: paymentForm.cardType.value,
        expirationMonth: paymentForm.expirationMonth.value,
        expirationYear: paymentForm.expirationYear.value,
        paymentForm: paymentForm
    };
}

// eslint-disable-next-line valid-jsdoc
/**
 * Returns selected payment instrument
 * @param UUID string
 * @param wallet dw.customer.Wallet
 * @return {dw.customer.CustomerPaymentInstrument}
 */
function getPaymentInstrumentByUuid(UUID, wallet) {
    var collections = require('*/cartridge/scripts/util/collections');
    var paymentInstrument = collections.find(wallet.getPaymentInstruments(), function (instrument) {
        return instrument.UUID === UUID;
    });
    return paymentInstrument;
}

/**
 * Checks if a credit card is valid or not
 * @param {Object} card - plain object with card details
 * @param {Object} form - form object
 * @returns {boolean} a boolean representing card validation
 */
function verifyCard(card, form) {
    var Logger = require('dw/system/Logger');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
    var Resource = require('dw/web/Resource');
    var collections = require('*/cartridge/scripts/util/collections');

    var log = Logger.getLogger('paymentOperator', 'paymentOperator');
    var logMsg = '';
    var paymentCard = PaymentMgr.getPaymentCard(card.cardType);
    var error = false;
    var cardNumber = card.cardNumber;
    var creditCardStatus;
    var formCardNumber = form.cardNumber;
    var logPrefix = 'PAYMENTOPERATOR_PAYGATE - PaymentInstruments.js:\n\t' +
        'Method Called: verifyCard()\n\t';

    if (paymentCard) {
        creditCardStatus = paymentCard.verify(
            card.expirationMonth,
            card.expirationYear,
            cardNumber
        );
    } else {
        formCardNumber.valid = false;
        formCardNumber.error =
            Resource.msg('error.message.creditnumber.invalid', 'forms', null);

        logMsg = logPrefix + 'Unable to verify card at verifyCard():\n\t' +
            formCardNumber.error;

        // Log the failure.
        log.info(logMsg);
        error = true;
    }

    if (creditCardStatus && creditCardStatus.error) {
        collections.forEach(creditCardStatus.items, function (item) {
            switch (item.code) {
                case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                    formCardNumber.valid = false;
                    formCardNumber.error = Resource.msg(
                        'error.message.creditnumber.invalid', 'forms', null);
                    error = true;
                    logMsg = logPrefix + 'Unable to verify card at verifyCard():\n\t' +
                        formCardNumber.error;

                    // Log the failure.
                    log.info(logMsg);
                    break;
                case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                    var expirationMonth = form.expirationMonth;
                    var expirationYear = form.expirationYear;
                    expirationMonth.valid = false;
                    expirationMonth.error =
                        Resource.msg('error.message.creditexpiration.expired', 'forms', null);
                    expirationYear.valid = false;
                    error = true;

                    logMsg = logPrefix + 'Unable to verify card at verifyCard():\n\t' +
                        expirationMonth.error;

                    // Log the failure.
                    log.info(logMsg);
                    break;
                default:
                    // Log the failure.
                    logMsg = logPrefix + 'Unable to verify card at verifyCard()';
                    log.info(logMsg);
                    error = true;
            }
        });
    }
    return error;
}

server.replace(
    'SavePayment',
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var formErrors = require('*/cartridge/scripts/formErrors');
        var HookMgr = require('dw/system/HookMgr');
        var Logger = require('dw/system/Logger');
        var PaymentMgr = require('dw/order/PaymentMgr');
        var dwOrderPaymentInstrument = require('dw/order/PaymentInstrument');

        var log = Logger.getLogger('paymentOperator', 'paymentOperator');
        var paymentForm = server.forms.getForm('creditCard');
        var logPrefix = 'PAYMENTOPERATOR_PAYGATE - PaymentInstruments.js:\n\t' +
            'Endpoint Called: PaymentInstruments-SavePayment\n\t';
        var result = getDetailsObject(paymentForm);

        if (paymentForm.valid && !verifyCard(result, paymentForm)) {
            res.setViewData(result);

            this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
                var URLUtils = require('dw/web/URLUtils');
                var CustomerMgr = require('dw/customer/CustomerMgr');
                var Resource = require('dw/web/Resource');
                var Transaction = require('dw/system/Transaction');

                var formInfo = res.getViewData();
                var customer = CustomerMgr.getCustomerByCustomerNumber(
                    req.currentCustomer.profile.customerNo
                );
                var paymentInstrument;
                var cardIsDuplicate = false;
                var cardNo = formInfo.cardNumber.substring(formInfo.cardNumber.length - 4);
                var expMonth = formInfo.expirationMonth;
                var expYear = formInfo.expirationYear;
                var wallet = customer.getProfile().getWallet();
                var walletPIArray = !wallet.paymentInstruments.empty ?
                    wallet.paymentInstruments.toArray() : [];
                var UUID = req.querystring.UUID;

                // Check if this card already exists.
                if (walletPIArray.length) {
                    walletPIArray.forEach(function (wpi) {
                        if (!empty(wpi.creditCardNumber) &&
                            !empty(wpi.creditCardExpirationMonth) &&
                            !empty(wpi.creditCardExpirationYear) &&
                            wpi.creditCardNumber.substring(wpi.creditCardNumber.length - 4) === cardNo &&
                            wpi.creditCardExpirationMonth === expMonth &&
                            wpi.creditCardExpirationYear === expYear
                        ) {
                            cardIsDuplicate = true;
                        }
                    });
                }
                // Card logic disabled here, since we are removing and adding new card
                // with update process.
                if (!empty(UUID)) {
                    cardIsDuplicate = false;
                }


                if (cardIsDuplicate) {
                    var msg = 'Unable to save payment method: ' +
                    'Duplicate Payment Method detected.';
                    log.info(logPrefix + msg);

                    res.json({
                        success: false,
                        error: [Resource.msg('error.payment.add.duplicate', 'checkout', null)]
                    });
                } else {
                    try {
                        Transaction.begin();
                        if (!empty(UUID)) {
                            var willDeleteInstrument = getPaymentInstrumentByUuid(UUID, wallet);
                            wallet.removePaymentInstrument(willDeleteInstrument);
                        }

                        paymentInstrument = wallet.createPaymentInstrument(dwOrderPaymentInstrument.METHOD_CREDIT_CARD);
                        paymentInstrument.setCreditCardHolder(formInfo.name);
                        paymentInstrument.setCreditCardNumber(cardNo);
                        paymentInstrument.setCreditCardType(formInfo.cardType);
                        paymentInstrument.setCreditCardExpirationMonth(expMonth);
                        paymentInstrument.setCreditCardExpirationYear(expYear);
                        paymentInstrument.custom.phone = formInfo.paymentForm && formInfo.paymentForm.phone ? formInfo.paymentForm.phone.htmlValue : null;

                        var processor = PaymentMgr.getPaymentMethod(dwOrderPaymentInstrument.METHOD_CREDIT_CARD).getPaymentProcessor();
                        var token = HookMgr.callHook(
                            'app.payment.processor.' + processor.ID.toLowerCase(),
                            'createMockToken'
                        );

                        paymentInstrument.setCreditCardToken(token);

                        var creditDirectMethod = PaymentMgr.getPaymentMethod('PAYMENTOPERATOR_CREDIT_DIRECT');
                        // now retrieve PCNr from paygate
                        if (creditDirectMethod.isActive()) {
                            var PaymentOperatorPCNr = require('int_computop/cartridge/scripts/computop/util/GetPaymentOperatorPCNr');
                            var paygateData = PaymentOperatorPCNr.getPCNr(formInfo);
                            if (paygateData.get('Status').toLowerCase() !== 'ok' && paygateData.get('Status').toLowerCase() !== 'authorized' &&
                            paygateData.get('Status').toLowerCase() !== 'success') {
                                throw new Error(
                                    Resource.msg('paymentoperator.error.details.default', 'paymentoperatorerrordetails', null)
                                );
                            }
                            paymentInstrument.custom.paymentOperatorCCNr = paygateData.get('PCNr');
                            paymentInstrument.custom.paymentOperatorCCExpiry = paygateData.get('CCExpiry');
                            paymentInstrument.custom.paymentOperatorCCBrand = paygateData.get('CCBrand');
                        }

                        Transaction.commit();

                        res.json({
                            success: true,
                            redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
                        });
                    } catch (err) {
                        log.error("Payment operator error here: " + JSON.stringify(err));
                        Transaction.rollback();

                        res.setStatusCode(503);
                        res.json({
                            redirectUrl: URLUtils.url('PaymentInstruments-List').toString()
                        });
                        req.session.privacyCache.set('PaymentOperatorError', err.message);
                    }
                }
            });
        } else {
            var msg = 'Unable to save payment method: ' +
                'Invalid form or payment method found';
            log.info(logPrefix + msg);

            res.json({
                success: false,
                fields: formErrors.getFormErrors(paymentForm)
            });
        }
        next();
    }
);

server.append(
    'List',
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var paymentOperatorData = {};
        if (req.session.privacyCache.get('PaymentOperatorError')) {
            paymentOperatorData.error = req.session.privacyCache.get('PaymentOperatorError');
            req.session.privacyCache.set('PaymentOperatorError', false);
        }
        res.setViewData({ paymentOperator: paymentOperatorData });
        next();
    }
);

module.exports = server.exports();
