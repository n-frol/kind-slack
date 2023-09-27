/* globals session */
/* eslint-disable no-multi-spaces */

'use strict';

/* API includes */
var BasketMgr           = require('dw/order/BasketMgr');
var Logger              = require('dw/system/Logger');
var Transaction         = require('dw/system/Transaction');
var PaymentInstrument   = require('dw/order/PaymentInstrument');
var Resource            = require('dw/web/Resource');

// Set up module logging.
var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
var logPrefix = 'PAYMENTOPERATOR_PAYGATE - util/Checkout.js:\n\t';

/**
 * holds form ids for payment methods to reset if not selected
 */
var resetPaymentForms = {
    PAYMENTOPERATOR_CREDIT_DIRECT:      'creditdirect',
    PAYMENTOPERATOR_CREDIT:             'paymentoperatorcreditcard',
    PAYMENTOPERATOR_DIRECT_DEBIT_SEPA:  'directdebitsepa',
    PAYMENTOPERATOR_KLARNA:             'klarna',
    PAYMENTOPERATOR_GIROPAY:            'giropay',
    PAYMENTOPERATOR_IDEAL:              'ideal',
    PAYMENTOPERATOR_QIWI:               'qiwi',
    PAYMENTOPERATOR_PAYGATE_CHINA:      'paygatechina',
    PAYMENTOPERATOR_EPS:                'eps'
};

var expressPaymentMethods = [
    'PAYMENTOPERATOR_PAYPALEXPRESS',
    'PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT'
];

var predefinedOrderNumberPaymentMethods = [
    'PAYMENTOPERATOR_PAYPALEXPRESS',
    'PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT',
    'PAYMENTOPERATOR_EASYCREDIT'
];

// default payment methods
resetPaymentForms[PaymentInstrument.METHOD_BML] = 'bml';
resetPaymentForms[PaymentInstrument.METHOD_CREDIT_CARD] = 'creditCard';

/**
 * Removes the other payment methods.
 *
 * @return {boolean} - Returns true if payment is successfully reset.
 */
function removePaymentOperatorInstrumentsFromBasket() {
    var currentBasket = BasketMgr.getCurrentBasket();
    var paymentInstruments = currentBasket.getPaymentInstruments();
    var status = true;

    if (!paymentInstruments.empty) {
        status = false;
        var piArray = paymentInstruments.toArray();
        status = Transaction.wrap(function () {
            piArray.forEach(function (pi) {
                if (pi.paymentMethod !== 'GIFT_CERTIFICATE') {
                    currentBasket.removePaymentInstrument(pi);
                }
            });
            return true;
        });
    }

    return status;
}

/**
 * Verifying credit card data
 *
 * @param {Object} paymentInformation - holds credit card data
 * @returns {boolean} - true if credit card data is valid
 */
function isValidCreditDirect(paymentInformation) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
    var collections = require('*/cartridge/scripts/util/collections');

    var cardType = paymentInformation.cardType.value;
    var paymentCard = PaymentMgr.getPaymentCard(cardType);

    var cardNumber = paymentInformation.cardNumber.value;
    var cardSecurityCode = paymentInformation.securityCode.value;
    var expirationMonth = paymentInformation.expirationMonth.value;
    var expirationYear = paymentInformation.expirationYear.value;

    var serverErrors = [];
    var cardErrors = {};
    var creditCardStatus;
    var result;
    var errorFlag = false;

    if (!paymentInformation.creditCardToken) {
        if (paymentCard) {
            creditCardStatus = paymentCard.verify(
                expirationMonth,
                expirationYear,
                cardNumber,
                cardSecurityCode
            );
        } else {
            cardErrors[paymentInformation.cardNumber.htmlName] =
                Resource.msg('error.invalid.card.number', 'creditCard', null);
            result = { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };

            // Log the failure
            cdpmLogger.info(logPrefix + 'No Payment Card Found: {0}',
                JSON.stringify(result));

            return result;
        }

        if (creditCardStatus.error) {
            collections.forEach(creditCardStatus.items, function (item) {
                switch (item.code) {
                    case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                        cardErrors[paymentInformation.cardNumber.htmlName] =
                            Resource.msg('error.invalid.card.number', 'creditCard', null);
                        errorFlag = true;
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                        cardErrors[paymentInformation.expirationMonth.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        cardErrors[paymentInformation.expirationYear.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        errorFlag = true;
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                        cardErrors[paymentInformation.securityCode.htmlName] =
                            Resource.msg('error.invalid.security.code', 'creditCard', null);
                        errorFlag = true;
                        break;
                    default:
                        serverErrors.push(
                            Resource.msg('error.card.information.error', 'creditCard', null)
                        );
                }
            });

            result = { fieldErrors: [cardErrors], serverErrors: serverErrors, error: errorFlag };

            // Log the failure
            cdpmLogger.info(logPrefix + 'Invalid Card #: {0}',
                JSON.stringify(result));
        }
    }

    return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: errorFlag };
}

/**
 * Returns the ID if the cart contains an PaymentOperator payment method which requires
 * a predefined order number. If no such method is found, this function returns false.
 *
 * @param {dw.order.Basket} basket - current basket
 * @returns {string|boolean} - payment method id or false
 */
function getPredefinedOrderNumberFromBasket(basket) {
    var length = predefinedOrderNumberPaymentMethods.length;
    for (var i = 0; i < length; i++) {
        if (!basket.getPaymentInstruments(predefinedOrderNumberPaymentMethods[i]).isEmpty()) {
            return predefinedOrderNumberPaymentMethods[i];
        }
    }
    return false;
}

/**
 * Creates an order for a PaymentOperator payment method where the order number will be taken
 * from the session where it was created right in the process before. If the order could be created
 * the number will be deleted from the session.
 *
 * @param {dw.order.Basket} basket - current basket
 * @returns {dw.order.Order|boolean} - order with predefined orderNo or false not required by payment method
 */
function createOrderWithPredefinedNumber(basket) {
    var method = getPredefinedOrderNumberFromBasket(basket);
    var sessionDataConversion = require('~/cartridge/scripts/computop/util/SessionDataConversion');

    var sessionData = null;
    switch (method) {
        case 'PAYMENTOPERATOR_PAYPALEXPRESS':
            sessionData = sessionDataConversion.getPaypalExpressDataFromSession();
            break;
        case 'PAYMENTOPERATOR_MASTERPASS_QUICKCHECKOUT':
            sessionData = sessionDataConversion.getMasterPassQuickCheckoutDataFromSession();
            break;
        case 'PAYMENTOPERATOR_EASYCREDIT':
            sessionData = sessionDataConversion.getEasyCreditDataFromSession();
            break;
        default:
            break;
    }

    var order = false;
    if (sessionData && sessionData.UserData) {
        var OrderMgr = require('dw/order/OrderMgr');
        try {
            Transaction.wrap(function () {
                order = OrderMgr.createOrder(basket, sessionData.UserData);
            });

            cdpmLogger.info(logPrefix + 'Successfully created new order from' +
                'predefined order #: {0}', order.orderNo
            );
        } catch (err) {
            cdpmLogger.error(logPrefix +
                'Error creating order with predefined number [' +
                sessionData.UserData + ']: {0}\n\t will create order with new number! '
                + err.fileName + ': ' + err.message + '\n' + err.stack
            );
        }
    }
    return order;
}

/**
 * Checks if the current billing address and cart amount equal the data transmitted to easyCredit
 * for initialisation.
 *
 * @param {dw.order.Basket} basket - current basket
 * @returns {boolean} - is valid.
 */
function isValidEasyCredit(basket) {
    var SessionDataConversion = require('~/cartridge/scripts/computop/util/SessionDataConversion');
    var AddressConversion = require('~/cartridge/scripts/computop/util/AddressConversion');

    var sessionData = SessionDataConversion.getEasyCreditDataFromSession();
    var currentBillingAddressHash = AddressConversion.getHashFromAddress(basket.getBillingAddress());

    if (!sessionData || !currentBillingAddressHash) {
        session.privacy.easycreditError = Resource.msg('paymentoperator.error.category.default', 'paymentoperatorerrorcategory', null);
        return false;
    }
    if (!currentBillingAddressHash.equals(sessionData.get('BillingAddressHash'))) {
        session.privacy.easycreditError = Resource.msg('paymentoperator.error.easycredit.addresschanged', 'paymentoperatoreasycredit', null);
        return false;
    }
    if (sessionData.get('CartAmount') !== SessionDataConversion.getAmountFractionValue(basket)) {
        session.privacy.easycreditError = Resource.msg('paymentoperator.error.easycredit.amountchanged', 'paymentoperatoreasycredit', null);
        return false;
    }
    return true;
}

/**
 * create hash from basket
 *
 * @param {dw.order.LineItemCtnr} ctnr - current basket / order
 * @return {string} - address hash
 */
function createContainerHash(ctnr) {
    var resultstring = '';
    var separator = ' ';

    var productLineItems = ctnr.getAllProductLineItems().iterator();

    while (productLineItems.hasNext()) {
        var pli = productLineItems.next();
        resultstring += pli.getProductID() + separator
            + pli.getProductName() + separator
            + pli.getQuantity() + separator
            + pli.getPrice().toString() + ' ';
    }

    var billingAddress = ctnr.getBillingAddress();
    var shippingAddress = ctnr.getShipments()[0].getShippingAddress();

    resultstring = resultstring
        + billingAddress.firstName
        + billingAddress.lastName
        + billingAddress.address1
        + billingAddress.address2
        + billingAddress.city
        + billingAddress.postalCode
        + billingAddress.stateCode
        + billingAddress.countryCode;

    resultstring = resultstring
        + shippingAddress.firstName
        + shippingAddress.lastName
        + shippingAddress.address1
        + shippingAddress.address2
        + shippingAddress.city
        + shippingAddress.postalCode
        + shippingAddress.stateCode
        + shippingAddress.countryCode;

    var md = new dw.crypto.MessageDigest(dw.crypto.MessageDigest.DIGEST_SHA_256); // eslint-disable-line no-undef
    return dw.crypto.Encoding.toBase64(md.digestBytes(new dw.util.Bytes(resultstring))); // eslint-disable-line no-undef
}

/* exports */
module.exports = {
    removePaymentOperatorInstrumentsFromBasket: removePaymentOperatorInstrumentsFromBasket,
    createOrderWithPredefinedNumber: createOrderWithPredefinedNumber,
    isValidCreditDirect: isValidCreditDirect,
    isValidEasyCredit: isValidEasyCredit,
    createContainerHash: createContainerHash,
    EXPRESS_PAYMENT_METHODS: expressPaymentMethods
};
