'use strict';
/**
 * Save paygate response data (transaction id) with order; specific payment method
 * data with orderPaymentInstrument
 */
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
var cdpmLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
var PaymentInstrument = require('dw/order/PaymentInstrument');

var logPrefix = 'PAYMENTOPERATOR_PAYGATE - SavePaymentOperatorData.js:\n\t';

/**
 * Save transactionID from paygate response
 * In case of PayU payment save possibly existing error data
 *
 * @param {dw.order.Order} order - current order
 * @param {dw.util.HashMap} paymentOperatorStatus - status from paygate response
 */
function savePaymentOperatorData(order, paymentOperatorStatus) {
    try {
        Transaction.wrap(function () {
            if (Object.prototype.hasOwnProperty.call(paymentOperatorStatus, 'TransID')) {
                order.custom.paymentOperatorPaymentData = 'TransID,' // eslint-disable-line
                    + paymentOperatorStatus.get('TransID');
            }
            if (!(order.getPaymentInstruments('PAYMENTOPERATOR_PAYU').isEmpty())) {
                order.custom.paymentOperatorPayUErrorText = paymentOperatorStatus.get('ErrorText'); // eslint-disable-line
                order.custom.paymentOperatorPayUCodeExt = paymentOperatorStatus.get('CodeExt'); // eslint-disable-line
            }
            if (Object.prototype.hasOwnProperty.call(paymentOperatorStatus, 'PayID')) {
                order.custom.paymentOperatorPayID = paymentOperatorStatus.get('PayID');
            }
            if (Object.prototype.hasOwnProperty.call(paymentOperatorStatus, 'XID')) {
                order.custom.paymentOperatorPaymentXID = paymentOperatorStatus.get('XID');
            }
        });
    } catch (err) {
        cdpmLogger.error(logPrefix + 'Error while saving response data with order!'
            + err.fileName + ': ' + err.message + '\n' + err.stack);
    }
}

/**
 * Saves response data to order.
 *
 * @param {dw.order.Order} order - current order
 * @param {dw.util.HashMap} paymentOperatorStatus - decrypted response data
 */
function savePaymentOperatorResponse(order, paymentOperatorStatus) {
    var PayPalHelpers = require(
        '*/cartridge/scripts/computop/helpers/PayPalHelpers');

    savePaymentOperatorData(
        order,
        paymentOperatorStatus
    );

    var orderPaymentInstruments = order.getPaymentInstruments('PAYMENTOPERATOR_ONLINE_TRANSFER');
    if (!orderPaymentInstruments.isEmpty()) {
        Transaction.wrap(function () {
            var paymentInstrument = orderPaymentInstruments[0];
            var bankCode = paymentOperatorStatus.get('AccBank') || paymentOperatorStatus.get('BIC');
            var iban = paymentOperatorStatus.get('AccIBAN') || paymentOperatorStatus.get('IBAN');

            paymentInstrument.custom.paymentOperatorOTAccBank = bankCode;
            paymentInstrument.custom.paymentOperatorOTAccIBAN = iban;
            paymentInstrument.custom.paymentOperatorOTAccOwner = paymentOperatorStatus.get('AccOwner'); // eslint-disable-line
        });
    }

    orderPaymentInstruments = order.getPaymentInstruments('PAYMENTOPERATOR_CREDIT');
    if (!orderPaymentInstruments.isEmpty()) {
        Transaction.wrap(function () {
            var paymentInstrument = orderPaymentInstruments[0];
            paymentInstrument.custom.paymentOperatorCCNr = paymentOperatorStatus.get('PCNr');
            paymentInstrument.custom.paymentOperatorCCExpiry = paymentOperatorStatus.get('CCExpiry'); // eslint-disable-line
            paymentInstrument.custom.paymentOperatorCCBrand = paymentOperatorStatus.get('CCBrand');
        });
    }

    // Get ApplePay payement instruments.
    orderPaymentInstruments = order.getPaymentInstruments(PaymentInstrument.METHOD_DW_APPLE_PAY);
    if(!orderPaymentInstruments.isEmpty()){
        Transaction.wrap(function () {
            var paymentInstrument = orderPaymentInstruments[0];
            paymentInstrument.custom.paymentOperatorCCNr = paymentOperatorStatus.get('PCNr');
            paymentInstrument.custom.paymentOperatorCCExpiry = paymentOperatorStatus.get('CCExpiry'); // eslint-disable-line
            paymentInstrument.custom.paymentOperatorCCBrand = paymentOperatorStatus.get('CCBrand');
        });
    }


    // Get all PayPal and PayPal express payment instruments.
    // There will never be more than one at a time.
    orderPaymentInstruments = order.getPaymentInstruments('PAYMENTOPERATOR_PAYPALEXPRESS');
    orderPaymentInstruments.addAll(order.getPaymentInstruments('PAYMENTOPERATOR_PAYPAL'));

    // Save PayPal specific response data.
    if (!orderPaymentInstruments.empty &&
        paymentOperatorStatus.containsKey('billingagreementid')
    ) {
        var returnedAgreementId = paymentOperatorStatus.get(
            'billingagreementid');
        var existingAgreementId = PayPalHelpers.getPayPalCustomerPI();

        // Add the billing agreement ID as a custom attribute of both the order
        // payment instrument, and the order.
        Transaction.wrap(function () {
            order.custom.paymentOperatorPPBillingAgreementId =
                returnedAgreementId;
            orderPaymentInstruments.toArray().forEach(function (opi) {
                opi.custom.paymentOperatorPPBillingAgreementId =
                    returnedAgreementId;
            });
        });

        // If there is not an existing PP agreement saved create a payment
        // instrument to hold the billing agreement information.
        if (!existingAgreementId) {
            // Create a customer payment instrument to hold the billing
            // agreement information.
            PayPalHelpers.createPayPalCustomerPI(paymentOperatorStatus, order);
            // Save the address if the customer does not have any saved.
            var orderAddress = order.getDefaultShipment().shippingAddress;

            if (!empty(orderAddress)) {
                savePaymentOperatorAddress(orderAddress);
            } else {
                cdpmLogger.error(logPrefix +
                    'No order found to save to the customer ' +
                    'profile for use with PP billing agreement ID.'
                );
            }
        }
    }

    // Names of custom attributes of the SFCC Order system object that hold
    // custom PP data from Computop.
    var attributeNames = [
        'paymentOperatorPPPayerStatus',
        'paymentOperatorPPTransactionID',
        'paymentOperatorPPRefNr',
        'paymentOperatorResponseCode'
    ];

    // Assign values from the response to the custom attributes of the order.
    Transaction.wrap(function () {
        [
            'payerstatus',
            'TransactionID',
            'refnr',
            'Code'
        ].forEach(function (key, i) {
            if (paymentOperatorStatus.containsKey(key)) {
                var returnedValue = paymentOperatorStatus.get(key);
                if (!empty(returnedValue)) {
                    order.custom[attributeNames[i]] = returnedValue;
                }
            }
        });
    });
}

/**
 * Checks if the current customer is logged in, and doesn't have any saved
 * addresses, then adds the specified address as a customer address in the
 * customer's profile.
 *
 * @param {dw.order.OrderAddress} address - The shipping address from the order
 *      that was just processed.
 * @returns {{success: boolean, address?: dw.customer.CustomerAddress}} -
 *      Returns an object literal with a success flag property, and a property
 *      that holds the CustomerAddress instance that was created or already
 *      exists.
 */
function savePaymentOperatorAddress(address) {
    var PAYPAL_ADDRESS_ID = 'PayPal Address'
    var result = { success: false, address: null };
    var profile = session.customer && session.customerAuthenticated &&
        !empty(session.customer.profile) ? session.customer.profile : null;
    var addressBook = !empty(profile) &&
        !empty(profile.addressBook) ?
        profile.addressBook : null;

    if (!empty(addressBook)) {
        if (!addressBook.addresses.empty) {
            // If a specified PayPal address exists return it.
            result.address = addressBook.getAddress(PAYPAL_ADDRESS_ID);

            // If there is not an address using the PayPal ID, then use the
            // customer's preferred address.
            if (empty(result.address)) {
                result.address = addressBook.getPreferredAddress();
            }

            // If no preferred address exists, use the first address in list.
            if (empty(result.address)) {
                result.address = addressBook.get(0);
            }

            // If still unable to get an address, return an error.
            result.success = empty(result.address);

            cdpmLogger.info(logPrefix +
                'Customer already has an address in address book');
        } else {
            // Create an
            Transaction.wrap(function () {
                result.address = addressBook.createAddress(PAYPAL_ADDRESS_ID);
                result.address.setAddress1(address.address1);
                result.address.setFirstName(address.firstName);
                result.address.setLastName(address.lastName);
                result.address.setCity(address.city);
                result.address.setPostalCode(address.postalCode);
                result.address.setCountryCode(address.countryCode);
                result.address.setStateCode(address.stateCode);
                // paymentoperator custom -- house number
                result.address.custom.houseNumber = '';

                if ('email' in address.custom && !empty(address.custom.email)) {
                    result.address.custom.email = address.custom.email;
                }

                if (!empty(address.address2)) {
                    result.address.setAddress2(address.address2);
                }

                if (!empty(address.phone)) {
                    result.address.setPhone(address.phone);
                }
            });

            cdpmLogger.info(
                logPrefix +
                'Customer address created: {0}',
                PAYPAL_ADDRESS_ID
            );
        }
    } else {
        result.success = false;
        cdpmLogger.error(logPrefix + 'No customer AddressBook available.');
    }
}

exports.savePaymentOperatorResponse = savePaymentOperatorResponse;
exports.savePaymentOperatorAddress = savePaymentOperatorAddress;
