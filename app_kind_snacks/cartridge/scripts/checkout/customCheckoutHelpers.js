/* global request, empty */
/* eslint-disable */
'use strict';

var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');

/**
 * Checks the current basket for line items listed int he OrderGroove cookie as
 * auto-ship items, and returns a boolean value denoting if a subscription
 * item was found.
 *
 * @returns {boolean} - Returns true if one or more items in the basket are set
 *      as subscription purchases, and false otherwise.
 */
function checkBasketForSubscription() {
    var BasketMgr = require('dw/order/BasketMgr');
    var coLogger = Logger.getLogger('paymentOperator', 'paymentOperator');
    var basket = BasketMgr.getCurrentBasket();
    var pliArray = !empty(basket) && !basket.allProductLineItems.empty ?
        basket.allProductLineItems.toArray() : [];
    var cookies = request.getHttpCookies();
    var subscriptionDataString = '';
    var subscriptionData = {};
    var result = false;
    var i = 0;

    if (!empty(cookies) || !empty(pliArray)) {
        var pliIDArray = pliArray.map(function (pli) {
            return !empty(pli.productID) ? pli.productID : '';
        }).filter(function (ID) {
            return ID !== '';
        });

        try {
            // Check for the OG autoship cookie.
            while (i < cookies.getCookieCount()) {
                var cookie = cookies[i];
                var cookieName = cookie.getName();
                if (cookieName === 'og_cart_autoship') {
                    subscriptionDataString = decodeURIComponent(cookie.getValue());
                    break;
                }
                i++;
            }

            if (subscriptionDataString) {
                subscriptionData = JSON.parse(subscriptionDataString);

                // Make sure there is subscription data.
                if (subscriptionData &&
                    subscriptionData.length &&
                    pliIDArray.length
                ) {
                    // Loop through the subscription products in the cookie and
                    // check if any match the product ID of items in the basket.
                    subscriptionData.forEach(function (subscriptionProduct) {
                        if ('id' in subscriptionProduct &&
                            'e' in subscriptionProduct &&
                            pliIDArray.indexOf(subscriptionProduct.id) > -1
                        ) {
                            result = true;
                        }
                    });
                }
            }
        } catch (e) {
            var errString = 'ERROR: at customOrderHelpers.js in checkBasketForSubscription(): {0}';
            coLogger.warn(errString, Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            })).join();
            result = false;
        }
    }

    return result;
}

/**
 * Checks a user's profile for the custom attribute of the saved PI that is the
 * default, and returns the default PI if it exists. If it doesn't exist, the
 * method will return the 1st saved PI in the wallet, or null if there are none.
 *
 * @param {dw.customer.Customer} customer - The SFCC Customer.
 * @returns {dw.customer.CustomerPaymentInstrument} - Returns the PI marked as
 *      default, the 1st PI in the customer's wallet, or Null if no PIs are
 *      saved in the user's profile.
 */
function getCustomerDefaultPaymentInstrument(customer) {
    var customerPI = null;
    var profile = customer.profile;

    if (customer.registered && customer.authenticated && !empty(profile)) {
        var piUUID = '';
        var proCustom = profile.getCustom();

        // Get the customer's default PI's UUID from the custom attribute on
        // their profile.
        if ('defaultPaymentInstrument' in proCustom &&
            !empty(proCustom.defaultPaymentInstrument)
        ) {
            piUUID = proCustom.defaultPaymentInstrument;
        }

        // Look for the the default PI.
        if (!profile.wallet.paymentInstruments.empty) {
            var piArray = profile.wallet.paymentInstruments.toArray();

            // If the customer has a saved default, then loop through the saved
            // PIs and find the one with the matching UUID.
            if (!empty(piUUID)) {
                piArray.forEach(function (pi) {
                    if (pi.UUID === piUUID) {
                        customerPI = pi;
                    }
                });
            }

            // If no default is marked, or the default was not found in the wallet,
            // then return the 1st saved payment instrument in the wallet.
            if (empty(customerPI)) {
                customerPI = piArray[0];
            }
        }
    }

    return customerPI;
}

function setLiftGate(shipment, lg, delivery_instruct) {
    var result = { error: false, errorMessage: null };
    try {
        Transaction.wrap(function () {
            if (lg) {
                shipment.custom.liftgate = Boolean(lg);
            } else {
                shipment.custom.liftgate = null;
            }
            if (delivery_instruct) {
                shipment.custom.delivery_instruct = delivery_instruct;
            } else {
                shipment.custom.delivery_instruct = null;
            }
        });
    } catch (e) {
        result.error = true;
        result.errorMessage = Resource.msg('error.message.could.not.be.attached.lift', 'checkout', null);
    }

    return result;
}


module.exports = {
    checkBasketForSubscription: checkBasketForSubscription,
    getCustomerDefaultPaymentInstrument: getCustomerDefaultPaymentInstrument,
    setLiftGate: setLiftGate
};
