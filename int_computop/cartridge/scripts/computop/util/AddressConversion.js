/* globals session */

'use strict';

/* API includes */
var StringUtils = require('dw/util/StringUtils');
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var logPrefix = 'PAYMENTOPERATOR_PAYGATE - AddressConversion.js:\n\t';

/**
 * Updating addresses in basket from PayPal express response
 *
 * @param {dw.order.Basket} basket - current basket
 * @param {dw.util.HashMap} response - paygate response
 * @returns {boolean} - returns true if addres creation is successful
 */
function createBasketAddressesFromPaypalExpress(basket, response) {
    logPrefix += 'at createBasketAddressFromPaypalExpress()\n\t';
    var result = false;
    if (basket == null || response == null) {
        cdpmLogger.error(logPrefix + 'Error creating basket addresses from PaypalExpress [missing basket or response]');
        return result;
    }

    if (session.privacy.paypalExpressTransId !== response.get('TransID')) {
        cdpmLogger.error(logPrefix + 'Error creating basket addresses from PaypalExpress [different TransID in response and session]');
        return result;
    }

    if (!response.get('name')) {
        cdpmLogger.error(logPrefix + 'Error creating basket addresses from PaypalExpress [missing parameters in response]');
        return result;
    }

    var Transaction = require('dw/system/Transaction');
    Transaction.begin();
    try {
        // preparing basket addresses
        var billingAddress = basket.getBillingAddress();
        if (!billingAddress) {
            billingAddress = basket.createBillingAddress();
        }
        var shippingAddress = basket.getDefaultShipment().getShippingAddress();
        if (!shippingAddress) {
            shippingAddress = basket.getDefaultShipment().createShippingAddress();
        }
        // update basket addresses
        updateBasketAddressFromDefault(billingAddress, response); // eslint-disable-line no-use-before-define
        updateBasketAddressFromDefault(shippingAddress, response); // eslint-disable-line no-use-before-define
        var customerEmail = basket.getCustomerEmail();
        if (!customerEmail) {
            customerEmail = response.get('e-mail') || response.get('conemail');
        }
        if (!customerEmail) {
            throw new Error('Checkout with PaypalExpress requires valid customer email-address!');
        }
        basket.setCustomerEmail(customerEmail);
        result = true;
    } catch (err) {
        Transaction.rollback();

        // Log the failure.
        cdpmLogger.error(logPrefix +
            'Error creating basket addresses from PaypalExpress ' +
            err.fileName +
            ': ' +
            err.message +
            '\n' +
            err.stack
        );
    }
    Transaction.commit();

    return result;
}

/**
 * Updating addresses in basket from MasterPassQuickCheckout response
 *
 * @param {dw.order.Basket} basket - current basket
 * @param {dw.util.HashMap} response - paygate response
 * @returns {boolean}
 */
function createBasketAddressesFromMasterPassQuickCheckout(basket, response) {
    if (basket == null || response == null) {
        cdpmLogger.error('Error creating basket addresses from MasterPassQuickCheckout [missing basket or response]');
        return false;
    }

    if (session.privacy.masterpassQuickCheckoutTransId !== response.get('TransID')) {
        cdpmLogger.error('Error creating basket addresses from MasterPassQuickCheckout [different TransID in response and session]');
        return false;
    }

    if (!response.get('name')) {
        cdpmLogger.error('Error creating basket addresses from MasterPassQuickCheckout [missing parameters in response]');
        return false;
    }

    require('dw/system/Transaction').wrap(function () {
        try {
            // preparing basket addresses
            var billingAddress = basket.getBillingAddress();
            if (!billingAddress) {
                billingAddress = basket.createBillingAddress();
            }
            var shippingAddress = basket.getDefaultShipment().getShippingAddress();
            if (!shippingAddress) {
                shippingAddress = basket.getDefaultShipment().createShippingAddress();
            }
            // update basket addresses, use separate billing address if available
            if (response.get('billingname')) {
                updateBasketAddressFromBilling(billingAddress, response); // eslint-disable-line no-use-before-define
            } else {
                updateBasketAddressFromDefault(billingAddress, response); // eslint-disable-line no-use-before-define
            }
            updateBasketAddressFromDefault(shippingAddress, response); // eslint-disable-line no-use-before-define
            basket.setCustomerEmail(response.get('conemail'));
        } catch (err) {
            cdpmLogger.error('Error creating basket addresses from MasterPassQuickCheckout ' + err.fileName + ': ' + err.message + '\n' + err.stack);
            return false;
        }
    });

    return true;
}

/**
 * Updating address with response address data
 *
 * @param {dw.order.OrderAddress} address - address object
 * @param {dw.util.HashMap} map - map with address data
 */
function updateBasketAddressFromDefault(address, map) {
    var firstname = getFirstName(map.get('name')); // eslint-disable-line no-use-before-define
    var lastname = getLastName(map.get('name')); // eslint-disable-line no-use-before-define
    address.setFirstName(firstname);
    address.setLastName(lastname);
    address.setAddress1(map.get('AddrStreet'));
    if (map.get('AddrStreet2') != null) {
        address.setSuite(map.get('AddrStreet2'));
    }
    if (map.get('AddrStreet3') != null) {
        address.setAddress2(map.get('AddrStreet3'));
    }
    address.setCity(map.get('AddrCity'));
    address.setPostalCode(map.get('AddrZip'));
    address.setCountryCode(map.get('AddrCountryCode'));
    if (map.get('addrstate') != null) {
        address.setStateCode(map.get('addrstate'));
    }
    if (map.get('conphone') != null) {
        address.setPhone(map.get('conphone'));
    } else if (map.get('Phone') != null) {
        address.setPhone(map.get('Phone'));
    }
}

/**
 * Updating address with response billing address data
 *
 * @param {dw.order.OrderAddress} address - address object
 * @param {dw.util.HashMap} map - map with address data
 */
function updateBasketAddressFromBilling(address, map) {
    var firstname = getFirstName(map.get('billingname')); // eslint-disable-line no-use-before-define
    var lastname = getLastName(map.get('billingname')); // eslint-disable-line no-use-before-define
    address.setFirstName(firstname);
    address.setLastName(lastname);
    address.setAddress1(map.get('billingaddrstreet'));
    if (map.get('billingaddrstreet2') != null) {
        address.setSuite(map.get('billingaddrstreet2'));
    }
    if (map.get('billingaddrstreet3') != null) {
        address.setAddress2(map.get('billingaddrstreet3'));
    }
    address.setCity(map.get('billingaddrcity'));
    address.setPostalCode(map.get('billingaddrzip'));
    address.setCountryCode(map.get('billingaddrcountrycode'));
    if (map.get('billingaddrstate') != null) {
        address.setStateCode(map.get('billingaddrstate'));
    }
    if (map.get('conphone') != null) {
        address.setPhone(map.get('conphone'));
    } else if (map.get('Phone') != null) {
        address.setPhone(map.get('Phone'));
    }
}

/**
 * Extract first name from given string
 *
 * @param {string} name - full name
 * @returns {string} - first name
 */
function getFirstName(name) {
    var arrName = name.split(' ');
    if (arrName.length > 0) {
        return arrName[0];
    }
    return name;
}

/**
 * Extract last name from given string
 *
 * @param {string} name - full name
 * @returns {string} - last name
 */
function getLastName(name) {
    var arrName = name.split(' ');
    var length = arrName.length;
    if (length > 0) {
        return arrName[length - 1];
    }
    return name;
}

/**
 * Create address hash from order address
 *
 * @param {dw.order.OrderAddress} address - address object
 * @returns {string} - address string
 */
function getHashFromAddress(address) {
    if (!address) {
        return false;
    }
    var addrString = '';
    addrString += ('firstName' + address.firstName);
    addrString += ('lastName' + address.lastName);
    addrString += ('address1' + address.address1);
    addrString += ('address2' + address.address2);
    addrString += ('postalCode' + address.postalCode);
    addrString += ('city' + address.city);
    addrString += ('stateCode' + address.stateCode);
    addrString += ('countryCode' + address.countryCode);
    return StringUtils.encodeBase64(addrString);
}

/* exports */
module.exports = {
    createBasketAddressesFromPaypalExpress: createBasketAddressesFromPaypalExpress,
    createBasketAddressesFromMasterPassQuickCheckout: createBasketAddressesFromMasterPassQuickCheckout,
    getHashFromAddress: getHashFromAddress
};
