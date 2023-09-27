'use strict';

var base = module.superModule;

var BasketMgr = require('dw/order/BasketMgr');
var HookMgr = require('dw/system/HookMgr');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var PaymentMgr = require('dw/order/PaymentMgr');
var Transaction = require('dw/system/Transaction');

var paymentOperatorHelper = require('~/cartridge/scripts/computop/util/Checkout');
var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');

/**
 * Copies a CustomerAddress to a Shipment as its Shipping Address
 * @param {dw.customer.CustomerAddress} address - The customer address
 * @param {dw.order.Shipment} [shipmentOrNull] - The target shipment
 */
function copyCustomerAddressToShipment(address, shipmentOrNull) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var shipment = shipmentOrNull || currentBasket.defaultShipment;
    var shippingAddress = shipment.shippingAddress;

    Transaction.wrap(function () {
        if (shippingAddress === null) {
            shippingAddress = shipment.createShippingAddress();
        }

        shippingAddress.setFirstName(address.firstName);
        shippingAddress.setLastName(address.lastName);
        // dotsource: set custom housenumber
        if (address.houseNumber) {
            shippingAddress.custom.houseNumber = address.houseNumber;
        }
        shippingAddress.setCompanyName(address.companyName);
        shippingAddress.setAddress1(address.address1);
        shippingAddress.setAddress2(address.address2);
        shippingAddress.setCity(address.city);
        shippingAddress.setPostalCode(address.postalCode);
        shippingAddress.setStateCode(address.stateCode);
        var countryCode = address.countryCode;
        shippingAddress.setCountryCode(countryCode.value);
        shippingAddress.setPhone(address.phone);
    });
}

/**
 * Copies a CustomerAddress to a Basket as its Billing Address
 * @param {dw.customer.CustomerAddress} address - The customer address
 */
function copyCustomerAddressToBilling(address) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var billingAddress = currentBasket.billingAddress;

    Transaction.wrap(function () {
        if (!billingAddress) {
            billingAddress = currentBasket.createBillingAddress();
        }

        billingAddress.setFirstName(address.firstName);
        billingAddress.setLastName(address.lastName);
        // dotsource: set custom housenumber
        if (Object.prototype.hasOwnProperty.call(address, "custom") &&
        Object.prototype.hasOwnProperty.call(address.custom, 'houseNumber')) {
            billingAddress.custom.houseNumber = address.custom.houseNumber;
        }
        billingAddress.setAddress1(address.address1);
        billingAddress.setAddress2(address.address2);
        billingAddress.setCity(address.city);
        billingAddress.setPostalCode(address.postalCode);
        billingAddress.setStateCode(address.stateCode);
        var countryCode = address.countryCode;
        billingAddress.setCountryCode(countryCode.value);
        if (!billingAddress.phone) {
            billingAddress.setPhone(address.phone);
        }
    });
}

/**
 * Copies information from the shipping form to the associated shipping address
 * @param {Object} shippingData - the shipping data
 * @param {dw.order.Shipment} [shipmentOrNull] - the target Shipment
 */
function copyShippingAddressToShipment(shippingData, shipmentOrNull) {
    var currentBasket = BasketMgr.getCurrentBasket();
    var shipment = shipmentOrNull || currentBasket.defaultShipment;

    var shippingAddress = shipment.shippingAddress;

    Transaction.wrap(function () {
        if (shippingAddress === null) {
            shippingAddress = shipment.createShippingAddress();
        }

        shippingAddress.setFirstName(shippingData.address.firstName);
        shippingAddress.setLastName(shippingData.address.lastName);
        // dotsource: set custom housenumber
        if (shippingData.address.houseNumber) {
            shippingAddress.custom.houseNumber = shippingData.address.houseNumber;
        }
        shippingAddress.setAddress1(shippingData.address.address1);
        shippingAddress.setAddress2(shippingData.address.address2);
        shippingAddress.setCity(shippingData.address.city);
        shippingAddress.setPostalCode(shippingData.address.postalCode);
        shippingAddress.setStateCode(shippingData.address.stateCode);
        shippingAddress.setCountryCode(shippingData.address.countryCode);
        shippingAddress.setPhone(shippingData.address.phone);

        ShippingHelper.selectShippingMethod(shipment, shippingData.shippingMethod);
    });
}

/**
 * Copies a raw address object to the baasket billing address
 * @param {Object} address - an address-similar Object (firstName, ...)
 * @param {Object} currentBasket - the current shopping basket
 * @param {Object} defaultPaymentInstrument - Optional default/first payment instrument
 */
function copyBillingAddressToBasket(address, currentBasket) {
    var billingAddress = currentBasket.billingAddress;
    var customer = currentBasket.getCustomer();
    var billingPhone = address.phone;

    if (!empty(customer)) {
        var profile = customer.profile;

        if (!empty(profile)) {
            var defaultUUID = profile.custom.defaultPaymentInstrument;

            if (!empty(defaultUUID) && !empty(profile.wallet)) {
                var paymentInstruments = profile.wallet.paymentInstruments;
                var len = paymentInstruments.length;

                for (var i = 0; i < len; i++) {
                    var paymentInstrument = paymentInstruments[i];

                    if (paymentInstrument.UUID === defaultUUID) {
                        billingPhone = paymentInstrument.custom.phone || billingPhone;
                        break;
                    }
                }
            }
        }
    }

    Transaction.wrap(function () {
        if (!billingAddress) {
            billingAddress = currentBasket.createBillingAddress();
        }

        billingAddress.setFirstName(address.firstName);
        billingAddress.setLastName(address.lastName);
        // dotsource: set custom housenumber
        if (Object.prototype.hasOwnProperty.call(address.custom, 'houseNumber')) {
            billingAddress.custom.houseNumber = address.custom.houseNumber;
        }
        billingAddress.setCompanyName(address.companyName);
        billingAddress.setAddress1(address.address1);
        billingAddress.setAddress2(address.address2);
        billingAddress.setCity(address.city);
        billingAddress.setPostalCode(address.postalCode);
        billingAddress.setStateCode(address.stateCode);
        billingAddress.setCountryCode(address.countryCode.value);
        if (!billingAddress.phone) {
            billingAddress.setPhone(billingPhone);
        }
    });
}

/**
 * Validate credit card form fields
 * @param {Object} form - the form object with pre-validated form fields
 * @returns {Object} the names of the invalid form fields
 */
function validateCreditCard(form) {
//    var result = {};
//    var currentBasket = BasketMgr.getCurrentBasket();

    // dotsource custom code: form.paymentMethod.value needs to be check prior to validating the credit form
    /*if (!form.paymentMethod.value) {
        if (currentBasket.totalGrossPrice.value > 0) {
            result[form.paymentMethod.htmlName] =
                Resource.msg('error.no.selected.payment.method', 'creditCard', null);
        }

        return result;
    }*/

    return base.validateFields(form);
}

/**
 * Checks if an order with a total net price of 0 is valid.
 *
 * @param {dw.order.Order} order - The SFCC order with a 0 net total.
 * @returns {boolean} - Returns a success flag. If true, the 0 total is ok, and
 *      authorization of the payment method can be skipped. If false, the 0
 *      total is not valid, and the order payment handling should fail.
 */
function validateZeroPaymentOrder(order) {
    var lineItemsValid = true;
    var orderAttributesValid = false;
    var pliArray = order.productLineItems.empty ? [] : order.productLineItems.toArray();

    // Verify that the product line items have valid prices.
    if (pliArray.length) {
        pliArray.forEach(function (pli) {
            // Check that all ProductLineItem instances have a valid price
            // and are pro-rated to a 0 total.
            if (!pli.price.available ||
                !pli.proratedPrice.available ||
                !pli.proratedPrice.value === 0
            ) {
                lineItemsValid = false;
            }
        });
    } else {
        return false;
    }

    if (order.merchandizeTotalNetPrice.available &&
        order.shippingTotalNetPrice.available &&
        order.totalNetPrice.available &&
        order.totalTax.available
    ) {
        orderAttributesValid = true;
    }

    return (lineItemsValid && orderAttributesValid);
}

/**
 * handles the payment authorization for each payment instrument
 * @param {dw.order.Order} order - the order object
 * @param {string} orderNumber - The order number for the order
 * @returns {Object} an error object
 */
function handlePayments(order, orderNumber) {
    var Logger = require('dw/system/Logger');
    var Money = require('dw/value/Money');
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    var log = Logger.getLogger('paymentOperator', 'paymentOperator');
    var result = {};
    var paymentInstruments = order.paymentInstruments;
    var paymentInstrument = null;

    if (order.totalNetPrice.value !== 0.00) {
        if (paymentInstruments.length === 0) {
            Transaction.wrap(function () { OrderMgr.failOrder(order); });
            result.error = true;
        }

        if (!result.error) {
            for (var i = 0; i < paymentInstruments.length; i++) {
                paymentInstrument = paymentInstruments[i];
                var paymentProcessor = PaymentMgr
                    .getPaymentMethod(paymentInstrument.paymentMethod)
                    .paymentProcessor;
                var authorizationResult;
                if (paymentProcessor === null) {
                    Transaction.begin();
                    paymentInstrument.paymentTransaction.setTransactionID(orderNumber);
                    Transaction.commit();
                } else {
                    if (HookMgr.hasHook('app.payment.processor.' +
                            paymentProcessor.ID.toLowerCase())) {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                            'Authorize',
                            orderNumber,
                            paymentInstrument,
                            paymentProcessor
                        );
                    } else {
                        authorizationResult = HookMgr.callHook(
                            'app.payment.processor.default',
                            'Authorize'
                        );
                    }

                    if (authorizationResult.error) {
                        Transaction.wrap(function () { OrderMgr.failOrder(order); });
                        result.error = true;
                        break;
                    } else if (authorizationResult.acs_redirect) {
                        // dotsource: here the paygate response implicates a redirect to the acs_url
                        return authorizationResult;
                    }
                }
            }
        }
    } else if (validateZeroPaymentOrder(order)) {
        var MOCK_CC_NUMBER = '1000000000000000';
        var MOCK_CC_EXP_YEAR = 3999;
        var MOCK_CC_EXP_MONTH = 1;

        result.error = false;

        // Remove any payment instruments in basket, and add note to order.
        if (!paymentInstruments.empty) {
            Transaction.wrap(function () {
                order.removeAllPaymentInstruments();
            });
        }

        var note = 'Order will be processed with a 0 payment amount.';
        Transaction.begin()
        try {
            order.addNote('Zero Total Order', note);

            // OMS Related changes and adding to paymentMethod custom object.
            order.custom.paymentMethod = "PAYMENTOPERATOR_ZERO_AMOUNT";

            // Create a dummy OrderPaymentInstrument for creating PaymentTransaction.
            paymentInstrument = order.createPaymentInstrument('PAYMENTOPERATOR_CREDIT_DIRECT',
                new Money(0.0, order.currencyCode));
            paymentInstrument.setCreditCardType('PAYMENTOPERATOR_ZERO_AMOUNT');
            paymentInstrument.setCreditCardHolder(order.billingAddress.fullName);
            paymentInstrument.setCreditCardNumber(MOCK_CC_NUMBER);
            paymentInstrument.setCreditCardExpirationMonth(MOCK_CC_EXP_MONTH);
            paymentInstrument.setCreditCardExpirationYear(MOCK_CC_EXP_YEAR);

            var paymentProcessor = PaymentMgr
                .getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD)
                .getPaymentProcessor();
            var paymentTransaction = paymentInstrument.getPaymentTransaction();

            paymentTransaction.setPaymentProcessor(paymentProcessor);
            paymentTransaction.setTransactionID(order.getOrderNo());

            var token = HookMgr.callHook(
                'app.payment.processor.' + paymentProcessor.ID.toLowerCase(),
                'createMockToken'
            );

            paymentInstrument.setCreditCardToken(token);

            // Commit changes.
            Transaction.commit();
        } catch (e) {
            // Roll back any changes.
            Transaction.rollback();

            // Log the entire Error object.
            var errMsg = 'ERROR in checkoutHelpers.js (int_computop) at handlePayments():';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            log.error(errMsg);

            // Set error condition in result.
            result.error = true;
        }
    } else {
        return { error: true };
    }

    return result;
}

/**
 * Validates payment
 * @param {Object} req - The local instance of the request object
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an object that has error information
 */
function validatePayment(req, currentBasket) {
    var applicablePaymentCards;
    var applicablePaymentMethods;
    var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    var paymentAmount = currentBasket.totalGrossPrice.value;
    var countryCode = req.geolocation.countryCode;
    var currentCustomer = req.currentCustomer.raw;
    var paymentInstruments = currentBasket.paymentInstruments;
    var result = {};

    applicablePaymentMethods = PaymentMgr.getApplicablePaymentMethods(
        currentCustomer,
        countryCode,
        paymentAmount
    );
    applicablePaymentCards = creditCardPaymentMethod.getApplicablePaymentCards(
        currentCustomer,
        countryCode,
        paymentAmount
    );

    var invalid = true;

    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];

        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.paymentMethod)) {
            invalid = false;
        }

        var paymentMethod = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod());

        if (paymentMethod && applicablePaymentMethods.contains(paymentMethod)) {
            if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethod)) {
                var card = PaymentMgr.getPaymentCard(paymentInstrument.creditCardType);

                // Checks whether payment card is still applicable.
                if (card && applicablePaymentCards.contains(card)) {
                    invalid = false;
                }
            } else if ('PAYMENTOPERATOR_EASYCREDIT'.equals(paymentInstrument.paymentMethod)) {
                invalid = !paymentOperatorHelper.isValidEasyCredit(currentBasket);
            } else {
                invalid = false;
            }
        }

        if (invalid) {
            break; // there is an invalid payment instrument
        }
    }

    result.error = invalid;
    return result;
}

/**
 * Attempts to create an order from the current basket
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {dw.order.Order} The order object created from the current basket
 */
function createOrder(currentBasket) {
    // Creates a new order. This will internally ReserveInventoryForOrder and will create a new Order with status 'Created'.
    var order = paymentOperatorHelper.createOrderWithPredefinedNumber(currentBasket);
    if (order) {
        return order;
    }

    try {
        order = Transaction.wrap(function () {
            return OrderMgr.createOrder(currentBasket);
        });
    } catch (error) {
        return null;
    }
    return order;
}

/**
 * saves payment instruemnt to customers wallet
 *
 * Updating to set payment instrument phone
 *
 * @param {Object} billingData - billing information entered by the user
 * @param {dw.order.Basket} currentBasket - The current basket
 * @param {dw.customer.Customer} customer - The current customer
 * @returns {dw.customer.CustomerPaymentInstrument} newly stored payment Instrument
 */
function customSavePaymentInstrumentToWallet(billingData, currentBasket, customer) {
    var storedPaymentInstrument = base.savePaymentInstrumentToWallet(billingData, currentBasket, customer);

    return Transaction.wrap(function () {
        storedPaymentInstrument.custom.phone = currentBasket.billingAddress.phone;

        return storedPaymentInstrument;
    });
}

module.exports = base;
module.exports.customSavePaymentInstrumentToWallet = customSavePaymentInstrumentToWallet;
module.exports.copyBillingAddressToBasket = copyBillingAddressToBasket;
module.exports.copyCustomerAddressToBilling = copyCustomerAddressToBilling;
module.exports.copyCustomerAddressToShipment = copyCustomerAddressToShipment;
module.exports.copyShippingAddressToShipment = copyShippingAddressToShipment;
module.exports.createOrder = createOrder;
module.exports.handlePayments = handlePayments;
module.exports.validateCreditCard = validateCreditCard;
module.exports.validatePayment = validatePayment;
