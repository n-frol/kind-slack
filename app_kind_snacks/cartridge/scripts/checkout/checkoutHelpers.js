/* global empty, session */

'use strict';

/**
 * checkoutHelpers.js
 * @extends app_storefront_base/cartridge/scripts/checkout/checkoutHelpers.js
 *
 * Extends the methods in the base checkoutHelpers module and modifies the
 * extended behaviors defined in the int_computop version of the checkoutHelpers
 * module.
 */

// SFCC API imports
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');

// int_computop module imports
var base = require('int_computop/cartridge/scripts/checkout/checkoutHelpers');
var paymentOperatorHelper = require(
    '*/cartridge/scripts/computop/util/Checkout');

/**
 * Sets the payment transaction amount
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {Object} an error object
 */
function calculatePaymentTransaction(currentBasket) {
    var result = { error: false };

    try {
        Transaction.wrap(function () {
            // TODO: This function will need to account for gift certificates at a later date
            var orderTotal = currentBasket.totalGrossPrice;
            var paymentInstrument = currentBasket.paymentInstrument;

            if (orderTotal.available && orderTotal.value !== 0) {
                paymentInstrument.paymentTransaction.setAmount(orderTotal);
            }
        });
    } catch (e) {
        result.error = true;
    }

    return result;
}

/**
 * Attempts to create an order from the current basket
 * @param {dw.order.Basket} currentBasket - The current basket
 * @returns {dw.order.Order} The order object created from the current basket
 */
function createOrder(currentBasket) {
    // Explicitly set the channel type to storefront per KIND
    if (!empty(currentBasket)) {
        Transaction.wrap(function () {
            currentBasket.setChannelType(currentBasket.CHANNEL_TYPE_STOREFRONT);
        });
    }

    // Creates a new order. This will internally ReserveInventoryForOrder and will create a new Order with status 'Created'.
    var order = paymentOperatorHelper.createOrderWithPredefinedNumber(
        currentBasket);
    if (order) {
        return order;
    }
    // Added additional logging for this silent error - FR
    var Logger = require('dw/system/Logger');
    try {
        order = Transaction.wrap(function () {
            return OrderMgr.createOrder(currentBasket);
        });
    } catch (error) {
        Logger.error(error);
        return null;
    }

    // Check if this is a PayPal order.
    var paymentInstruments = order.getPaymentInstruments();
    if (!paymentInstruments.empty && paymentInstruments.length === 1) {
        var pi = paymentInstruments.toArray().pop();
        if (pi.paymentMethod === 'PAYMENTOPERATOR_PAYPAL') {
            // Store the order # to the session storage to gracefully handle
            // back button from PayPal page.
            session.privacy.payPalOrderNumber = order.orderNo;
        }
    }

    return order;
}

/**
 * renders the user's stored payment Instruments
 * @param {Object} req - The request object
 * @param {Object} accountModel - The account model for the current customer.
 * @param {Object} orderModel - The order model instance for the current basket.
 * @returns {string|null} newly stored payment Instrument
 */
function getRenderedPaymentInstruments(req, accountModel, orderModel) {
    var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
    var result;

    if (req.currentCustomer.raw.authenticated
        && req.currentCustomer.raw.registered
        && req.currentCustomer.raw.profile.wallet.paymentInstruments.getLength()
    ) {
        var context;
        var template = 'checkout/billing/storedPaymentInstruments';

        context = { customer: accountModel, order: orderModel };
        result = renderTemplateHelper.getRenderedHtml(
            context,
            template
        );
    }

    return result || null;
}

/**
 * Overrides the defualt basket validation in the following manner:
 *  - Allows for 0-amount payments without a payment method from the user.
 *
 * @param {Object} req - The request wrapper object.
 * @param {dw.order.Basket} basket - The current basket.
 * @returns {Object} The validation result
 */
function validatePayment(req, basket) {
    // SFCC API imports
    var PaymentMgr = require('dw/order/PaymentMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');

    var applicablePaymentCards;
    var applicablePaymentMethods;
    var creditCardPaymentMethod = PaymentMgr.getPaymentMethod(PaymentInstrument.METHOD_CREDIT_CARD);
    var paymentAmount = basket.totalGrossPrice.value;
    var countryCode = req.geolocation.countryCode;
    var currentCustomer = req.currentCustomer.raw;
    var paymentInstruments = basket.paymentInstruments;
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

    if (basket.totalNetPrice.available &&
        basket.totalNetPrice.value === 0 &&
        basket.merchandizeTotalNetPrice > 0
    ) {
        return { error: false };
    }

    for (var i = 0; i < paymentInstruments.length; i++) {
        var paymentInstrument = paymentInstruments[i];

        if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.paymentMethod)) {
            invalid = false;
        }

        var paymentMethod = PaymentMgr.getPaymentMethod(paymentInstrument.getPaymentMethod());

        if (paymentMethod && applicablePaymentMethods.contains(paymentMethod)) {
            if (PaymentInstrument.METHOD_CREDIT_CARD.equals(paymentInstrument.paymentMethod)) {
                var card = PaymentMgr.getPaymentCard(paymentInstrument.creditCardType);

                // Checks if payment card is still applicable.
                if (card && applicablePaymentCards.contains(card)) {
                    invalid = false;
                }
            } else if ('PAYMENTOPERATOR_EASYCREDIT'.equals(paymentInstrument.paymentMethod)) {
                invalid = !paymentOperatorHelper.isValidEasyCredit(basket);
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
 // eslint-disable-next-line valid-jsdoc
 /**
     * Creates a new product line item for each quantity in the basket
     * If minOrderQuantityValue is 2 it skips
     * @param {dw.order.ProductLineItem} pli - The ProductLineItem.
     */
function separateQuantities(pli, currentBasket) {
    var quantity = pli.quantityValue;
    var pliMinQty = pli.minOrderQuantityValue;
    Transaction.wrap(function () {
        for (var i = 0; i < quantity; i++) {
            if (empty(pli.custom.fromStoreId)) {
                var UUIDUtils = require('dw/util/UUIDUtils');
                var uuid = UUIDUtils.createUUID();
                var shipment = currentBasket.createShipment(uuid);
                if (pliMinQty === 1) {
                    currentBasket.createProductLineItem(
                        pli.product,
                        pli.optionModel,
                        shipment
                    );
                    pli.setQuantityValue(1);
                } else {
                    pli.setShipment(shipment);
                }
            }
        }
    });
}


/**
 * sets the gift message on a shipment
 * @param {dw.order.Shipment} shipment - Any shipment for the current basket
 * @param {boolean} isGift - is the shipment a gift
 * @param {string} giftTo - The name of the person receiving the gift
 * @param {string} giftFrom - The name of the person giving the gift
 * @param {string} giftMessage - Message to person receiving the gift
 * @returns {Object} object containing error information
 */
function setGift(shipment, isGift, giftTo, giftFrom, giftMessage) {
    var Resource = require('dw/web/Resource');
    var result = { error: false, errorMessage: null };

    try {
        Transaction.wrap(function () {
            shipment.gift = isGift;
            if (giftTo) {
                shipment.custom.giftRecipient = giftTo;
            } else {
                shipment.custom.giftRecipient = null;
            }
            if (giftFrom) {
                shipment.custom.giftSender = giftFrom;
            } else {
                shipment.custom.giftSender = null;
            }
            if (isGift && giftMessage) {
                shipment.setGiftMessage(giftMessage);
            } else {
                shipment.setGiftMessage(null);
            }
        });
    } catch (e) {
        result.error = true;
        result.errorMessage = Resource.msg('error.message.could.not.be.attached', 'checkout', null);
    }

    return result;
}


module.exports = base;
module.exports.getRenderedPaymentInstruments = getRenderedPaymentInstruments;
module.exports.calculatePaymentTransaction = calculatePaymentTransaction;
module.exports.createOrder = createOrder;
module.exports.validatePayment = validatePayment;
module.exports.separateQuantities = separateQuantities;
module.exports.setGift = setGift;
