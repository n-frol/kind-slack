/* global empty, request */

'use strict';

/**
 * customOrderHelpers.js
 *
 * A module that exports helper functions for adding attributes to a successful
 * order after it has been placed.
 *
 * @module CustomOrderHelpers
 */

// SFCC API imports
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');
var CustomerMgr = require('dw/customer/CustomerMgr');

// Constants assigned as end use codes
// FFR added site preference for end use codes, so that it is driven by site
var END_USE_CODES = {
    subscription: dw.system.Site.getCurrent().getCustomPreferenceValue('endUseSubscriptionCode') == "" ? 'CLB' : dw.system.Site.getCurrent().getCustomPreferenceValue('endUseSubscriptionCode'), //eslint-disable-line
    oneTimePurchase: dw.system.Site.getCurrent().getCustomPreferenceValue('endUseAdhocCode') == "" ? 'ADH' : dw.system.Site.getCurrent().getCustomPreferenceValue('endUseAdhocCode'), //eslint-disable-line
    wholesale: dw.system.Site.getCurrent().getCustomPreferenceValue('endUseBusinessCode') == "" ? 'RSL' : dw.system.Site.getCurrent().getCustomPreferenceValue('endUseBusinessCode') //eslint-disable-line
};

/**
 * Checks for the Order Groove cookies to determine if the ProductLineItem is
 * a re-occurring subscription type purchase.
 *
 * @param {string} productId - The Id of the product.
 * @param {string} variantId - Optional variant Id of the product
 * @returns {number} - The number to be used in the subscriptionType custom
 *      attribute for the ProductLineItem;
 */
function getSubscriptionType(productId, variantId) {
    var jdeLogger = Logger.getLogger('JDE', 'JDE');
    var cookies = request.getHttpCookies();
    var subscriptionDataString = '';
    var subscriptionData = {};
    var result = 0;

    if (empty(cookies)) {
        return result;
    }

    var i = 0;
    try {
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

            if (subscriptionData && subscriptionData.length) {
                subscriptionData.forEach(function (subscriptionProduct) {
                    if ('id' in subscriptionProduct &&
                        'e' in subscriptionProduct &&
                        (productId == subscriptionProduct.id || variantId == subscriptionProduct.id) //eslint-disable-line
                    ) {
                        result = Number(subscriptionProduct.e);
                    }
                });
            }
        }
    } catch (e) {
        jdeLogger.warn('Error adding custom attributes for JDE to the order: {0}',
            JSON.stringify(e));
        result = 0;
    }

    return result;
}

/* Public / Exported Functions
   ========================================================================== */

/**
 * Gets a concatenation of all of the applicable address field values in the
 * address. This is used as the key for a new CustomObject instance of type
 * AddressFraud.
 *
 * @param {dw.order.OrderAddress} address - The address to get a key for.
 * @returns {string} - Returns a primary key string for storing an address as a
 *      AddressFraud custom object instance.
 */
function getAddressKey(address) {
    var key = '';
    key += !empty(address.address1) ? address.address1.toUpperCase() : '';
    key += !empty(address.address2) ? address.address2.toUpperCase() : '';
    key += !empty(address.city) ? address.city.toUpperCase() : '';
    key += !empty(address.stateCode) ? address.stateCode.toUpperCase() : '';
    key += !empty(address.postalCode) ? address.postalCode.toUpperCase() : '';

    return key;
}

/**
 * Adds an address to the list of used addresses so that it can't be used to
 * purchase a promotional trial-pack a second time.
 *
 * @param {dw.order.OrderAddress} address - The address that needs to be added
 *      as an instance of the AddressFraud custom object.
 * @memberof CustomOrderHelpers
 */
function addAddressToFraudList(address) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var key = getAddressKey(address);

    Transaction.wrap(function () {
        var customObjectInstance = CustomObjectMgr.createCustomObject(
            'AddressFraud', key);

        // Get the address 1 field and remove any periods from abbreviations.
        customObjectInstance.custom.addressOne = address.address1.toUpperCase().split('.').join('');
        customObjectInstance.custom.city = address.city.toUpperCase();
        customObjectInstance.custom.stateCode = address.stateCode.toUpperCase();
        var pCode = address.postalCode.toUpperCase();

        // Only save the first 5 of the zip to ensure a match if the customer
        // only enters 5 and the address is validated.
        if (pCode.length > 5) {
            pCode = pCode.substring(0, 5);
        }

        customObjectInstance.custom.postalCode = pCode;

        if (!empty(address.address2)) {
            customObjectInstance.custom.addressTwo = address.address2.toUpperCase();
        }
    });
}

/**
 * Checks all of the product line items in the basket to see if any are trial-packs
 * (one time only promo). If they are, then the address requires additional
 * validation for the one time use.
 *
 * @param {dw.order.Basket} basket - The customer's current basket.
 * @returns {boolean} - Returns a flag indicating if a qualifying product was
 *      found. A product is qualifying if it has the custom attribute
 *      isCheckAddressFraud set to true.
 * @memberof CustomOrderHelpers
 */
function checkForFraudCheckProduct() {
    // Get system class definitions.
    var BasketMgr = require('dw/order/BasketMgr');

    // Get system object instances.
    var afcLogger = Logger.getLogger('addressFraudCheck', 'addressFraudCheck');
    var basket = BasketMgr.getCurrentBasket();
    var lineItems = basket.getAllProductLineItems();
    var cookies = request.getHttpCookies();

    // Set initial values.
    var isAddressCheckNeeded = false;
    var autoShip = 0;
    var autoShipJSON = null;

    // get the OG cart from the cookie
    for (var i = 0; i < cookies.getCookieCount(); i++) {
        var cookie = cookies[i];
        var cookieName = cookie.getName();
        if (cookieName === "og_autoship") {
            autoShip = Number(cookie.getValue());
        }
        if (cookieName === 'og_cart_autoship') {
            autoShipJSON = decodeURIComponent(cookie.getValue());
        }
    }

    if ((autoShip === 1) && !empty(autoShipJSON)) {
        var autoShipCart = JSON.parse(autoShipJSON);

        var lineItemsIter = lineItems.iterator();
        while (lineItemsIter.hasNext()) {
            var lineItem = lineItemsIter.next();

            if (!empty(lineItem.product) && lineItem.product.custom.isCheckAddressFraud) {
                for (var j = 0; j < autoShipCart.length; j++) {
                    var autoShipLineItem = autoShipCart[j];
                    var promoID = autoShipLineItem.c;
                    var priceAdjustment = lineItem.getPriceAdjustmentByPromotionID(promoID);

                    if (!empty(priceAdjustment) && priceAdjustment.custom.isSnackPackPromotionalPricing) {
                        isAddressCheckNeeded = true;
                    }
                }

                // Log information on the products that are forcing a
                // fraud check
                var infoString = 'Fraud address check found for product ID: {0}\n';
                afcLogger.info(infoString, lineItem.product.ID);
            }
        }
    }

    return isAddressCheckNeeded;
}


/**
 * Checks if the address exists in the AddressFraud Custom Object.
 *
 * @param {dw.order.OrderAddress} address - The address to check.
 * @returns {{found: boolean, match: boolean}} - Returns an object literal
 *      with two flag properties:
 *          - found: True if the key returned an existing CustomObject instance,
 *                   otherwise false.
 *          - match: True if all fields in the address match all fields in the
 *                   custom object instance, otherwise false.
 * @memberof CustomOrderHelpers
 */
function checkFraudListForAddress(address) {
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    var result = {
        found: false,
        match: false
    };

    var key = getAddressKey(address);

    if (!empty(key)) {
        var custObj = CustomObjectMgr.getCustomObject('AddressFraud', key.toUpperCase());

        if (!empty(custObj)) {
            // Set the address found flag to true, then check each field for
            // a complete match.
            result.found = true;
            result.match = true;

            // If any of the fields do not match, then return false.
            ['city', 'postalCode'].forEach(
                function (field) {
                    var fieldVal = !empty(address[field]) ?
                        address[field].toUpperCase() : '';
                    var custObjVal = field in custObj.custom ?
                        custObj.custom[field].toUpperCase() : '';

                    // Only use the first 5 of the zip for matching addresses.
                    if (field === 'postalCode' &&
                        !empty(fieldVal)
                        && fieldVal.length > 5
                    ) {
                        fieldVal = fieldVal.substring(0, 5);
                    }

                    if (!empty(fieldVal) &&
                        !empty(custObjVal) &&
                        fieldVal !== custObjVal
                    ) {
                        result.match = false;
                    }
                }
            );

            // Check state
            if (!empty(address.stateCode)) {
                if (empty(custObj.custom.stateCode) ||
                    address.stateCode.toUpperCase() !==
                    custObj.custom.stateCode.toUpperCase()
                ) {
                    result.match = false;
                }
            }

            // Check Address 1.
            if (!empty(address.address1)) {
                if (empty(custObj.custom.addressOne) ||
                    address.address1.toUpperCase() !==
                    custObj.custom.addressOne.toUpperCase()
                ) {
                    result.match = false;
                }
            }

            // Check Address 2.
            if (!empty(address.address2)) {
                if (empty(custObj.custom.addressTwo) ||
                    address.address2.toUpperCase() !==
                    custObj.custom.addressTwo.toUpperCase()
                ) {
                    result.match = false;
                }
            }
        }
    }

    return result;
}

/**
 * Adds custom attributes to the basket's items for handling in the JDE system
 * once the order has been placed and exported.
 *
 * @memberof CustomOrderHelpers
 */
function addJDEAttributesToBasket() {
    var BasketMgr = require('dw/order/BasketMgr');
    var basket = BasketMgr.getCurrentBasket();
    var Site = require('dw/system/Site');
    var site = Site.getCurrent();

    if (!empty(basket)) {
        var shipmentCollection = basket.getShipments();
        var pliCollection = basket.getProductLineItems();

        // Add attributes to the ProductLineItems
        if (!pliCollection.empty) {
            var byobSubscriptionTypes = {}; // Store box subscription types so their contents can inherit

            // Loop through the ProductLineItems in the Basket and add the JDE
            // custom attributes.
            pliCollection.toArray().forEach(function (pli) {
                if (!empty(pli.product)) {
                    var categoryString = '';
                    var quantity = pli.quantityValue;
                    var productCustom = pli.product.getCustom();
                    var pliCustom = pli.getCustom();
                    var categories = pli.product.getAllCategories();
                    var bundleid = pli.UUID;

                    if (!categories.empty) {
                        categories.toArray().forEach(function (category, i) {
                            if (i !== 0) {
                                categoryString += ',';
                            }
                            categoryString += category.ID;
                        });
                    }

                    // Get the weight from the Product.
                    var weight = 'weight' in productCustom &&
                    !empty(productCustom.weight) ?
                        productCustom.weight : '';
                    var weightNumber = isNaN(Number(weight)) ?
                        Number(weight) : 0;

                    var excludeFromShipping = 'excludeFromShipping' in productCustom &&
                    !empty(productCustom.excludeFromShipping) ?
                        productCustom.excludeFromShipping : false;

                    // Get the subscription type from the cookie
                    var subscriptionType = getSubscriptionType(pli.productID);

                    if (!empty(pli.custom.boxID)) {
                        if (pli.custom.isByobMaster === true) {
                            byobSubscriptionTypes[pli.custom.boxID] = subscriptionType;
                        } else {
                            subscriptionType = byobSubscriptionTypes[pli.custom.boxID] || subscriptionType;
                        }
                    }

                    // If there is a custom attribute value for the wieght of
                    // the product, then assign that value to the line item so
                    // that it can be seen in the order XML.
                    Transaction.wrap(function () {
                        var images = pli.product.getImages('large');
                        pliCustom.productCategories = categoryString;
                        if (images.length > 0) {
                            pliCustom.imageURL = images[0].getAbsURL();
                        }
                        pliCustom.weight = weightNumber *
                            quantity;
                        pliCustom.excludeFromShipping = excludeFromShipping;
                        if ('bundledProductLineItems' in pli) {
                            if (pli.bundledProductLineItems.toArray().length > 0) {
                                pliCustom.isBundleMaster = true;
                                pliCustom.bundleID = bundleid;
                            } else {
                                pliCustom.isBundleMaster = false;
                                pliCustom.bundleID = '';
                            }
                        } else {
                            pliCustom.isBundleMaster = false;
                            pliCustom.bundleID = '';
                        }
                        // BYOB code
                        if (Object.prototype.hasOwnProperty.call(pliCustom, "boxID")) {
                            if (Object.prototype.hasOwnProperty.call(pliCustom, "isByobMaster") && pliCustom.isByobMaster) {
                                pliCustom.isBundleMaster = true;
                            } else {
                                pliCustom.isBundleMaster = false;
                            }
                            // Instead of using UUID, use the boxID if this is a BYOB item
                            pliCustom.bundleID = pliCustom.boxID;
                        }

                        // If this is a subscription product
                        if (site.getID() === "kind_b2b") {
                            pliCustom.endUseCode =
                                END_USE_CODES.wholesale;
                        } else if (!empty(basket.getChannelType()) && basket.getChannelType().getValue() === basket.CHANNEL_TYPE_SUBSCRIPTIONS) {
                            pliCustom.endUseCode =
                                END_USE_CODES.subscription;
                        } else if (subscriptionType > 0) {
                            pliCustom.subscriptionType = String(
                                subscriptionType);
                            pliCustom.endUseCode =
                                END_USE_CODES.subscription;
                        } else {
                            pliCustom.endUseCode =
                                END_USE_CODES.oneTimePurchase;
                        }
                    });
                    // Set the bundlemaster properties for all child objects to false and copy over the UUID to the child objects
                    if ('bundledProductLineItems' in pli) { // eslint-disable-line
                        pli.bundledProductLineItems.toArray()
                            .forEach(function (bpli) { // eslint-disable-line
                                Transaction.wrap(function () {
                                    bpli.getCustom().isBundleMaster = false;
                                    // BYOB divider and shipper overrides
                                    if ((bpli.productID == "23514-00" || bpli.productID == "26671-00" || bpli.productID == "23513-00")) { // eslint-disable-line
                                        bpli.getCustom().bundleID = pliCustom.boxID;
                                        bpli.getCustom().boxID = pliCustom.boxID;
                                    } else {
                                        bpli.getCustom().bundleID = bundleid;
                                    }
                                });
                            });
                    }
                }
            });
        }

        // Add attributes to the OrderAddresses
        if (!empty(shipmentCollection)) {
            // Get all shipping addresses.
            shipmentCollection.toArray().forEach(function (shipment) {
                if (!empty(shipment.shippingAddress)) {
                    Transaction.wrap(function () {
                        shipment.shippingAddress.custom.addressClass =
                            'Residential';
                    });
                }
            });
        }
    }
}

/**
 * Adds the first and last name custom attributes to the Order for JDE.
 *
 * @memberof CustomOrderHelpers
 * @param {Object} bcReq - The before complete request object.
 * @param {Object} bcRes - The before complete response object.
 */
function addJDEAttributesToOrder(bcReq, bcRes) {
    var OrderMgr = require('dw/order/OrderMgr');
    var Site = require('dw/system/Site');
    var jdeLogger = Logger.getLogger('JDE', 'JDE');
    var viewData = bcRes.getViewData();
    var orderId = typeof viewData.orderID !== 'undefined' ? viewData.orderID : '';
    var site = Site.getCurrent();

    try {
        if (!empty(orderId)) {
            var order = OrderMgr.getOrder(orderId);

            if (!empty(order)) {
                var orderCustomer = order.getCustomer();
                var firstName = '';
                var lastName = '';
                var cgId = '';
                var customerNo = order.getCustomerNo();

                // Check if there is a registered customer.
                var customerGroups = !empty(orderCustomer) ?
                    orderCustomer.getCustomerGroups() : [];
                var profile = !empty(orderCustomer) ?
                    orderCustomer.profile : null;


                // Get the list of CustomerGroup IDs that should be reported.
                var groupIdsToReport = site.getCustomPreferenceValue(
                    'reportedCustomerGroups');

                if (!empty(groupIdsToReport) && !empty(customerGroups)) {
                    var y = 0;
                    var x = 0;

                    // Loop through the custom preference CustomerGroups list.
                    while (x < groupIdsToReport.length && !cgId) {
                        var pcg = groupIdsToReport[x];
                        y = 0;

                        // Loop through the customer's assigned CustomerGroups.
                        while (y < customerGroups.length && !cgId) {
                            var ccg = customerGroups[y].ID;

                            if (!empty(pcg) && !empty(ccg) &&
                                pcg.toLowerCase() === ccg.toLowerCase()
                            ) {
                                cgId = ccg;
                                break;
                            }

                            y++;
                        }
                        x++;
                    }
                }

                if (!empty(profile) && !empty(profile.firstName)) {
                    firstName = profile.firstName;
                }

                if (!empty(profile) && !empty(profile.lastName)) {
                    lastName = profile.lastName;
                }


                // eslint-disable-next-line no-undef
                if (dw.system.Site.getCurrent().ID === 'kind_b2b') {
                    var customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
                    if (customer.getProfile() !== null && Object.prototype.hasOwnProperty.call(customer.getProfile().custom, 'jde_customer_no') && !empty(customer.getProfile().custom.jde_customer_no)) {
                        customerNo = customer.getProfile().custom.jde_customer_no;
                    }
                }


                // If registered customer, and credit limit is updated, send custom attribute for value
                if (
                    !empty(profile) && order.paymentInstruments.length > 0 &&
                    order.paymentInstruments[0].paymentMethod === 'PAYONACCOUNT'
                ) {
                    Transaction.wrap(function () {
                        order.custom.creditLimit = profile.custom.creditLimit;
                    });
                }

                // If no customer, then get the information from the billing address.
                if (empty(firstName) &&
                    !empty(order.billingAddress) &&
                    !empty(order.billingAddress.firstName)
                ) {
                    firstName = order.billingAddress.firstName;
                }

                if (empty(lastName) &&
                    !empty(order.billingAddress) &&
                    !empty(order.billingAddress.lastName)
                ) {
                    lastName = order.billingAddress.lastName;
                }

                try {
                    // Begin the transactional state.
                    Transaction.begin();

                    // Create the new ProductList item & set the quantity.
                    order.custom.firstName = firstName;
                    order.custom.lastName = lastName;
                    order.custom.sfccCustomerNo = customerNo;

                    if (!empty(cgId)) {
                        order.custom.customerGroup = cgId;
                    }

                    // Commit the transaction.
                    Transaction.commit();
                } catch (e) {
                    // Rollback any failed transactions.
                    Transaction.rollback();
                }

                // Set payment method as a custom field on the order for OMS
                if ("paymentTransaction" in order && "paymentInstrument" in order.paymentTransaction) {
                    Transaction.wrap(function () {
                        order.custom.paymentMethod = order.paymentTransaction.paymentInstrument.paymentMethod;
                    });
                }
                /*eslint-disable */
                if(order.shipments.length > 1 && dw.system.Site.getCurrent().ID === 'kind_b2b'){
                    var orderJSON = HookMgr.callHook('app.setOrderPromotion', 'setOrderPromotion', order);
                    Transaction.wrap(function () {
                        order.custom.isParentOrder = true;
                        if(!empty(orderJSON)){
                            order.custom.orderPromotion = orderJSON;
                        }
                    })
                }
                /*eslint-enable */
            }
        }
    } catch (e) {
        var errString = 'ERROR in customOrderHelpers.js at addJDEAttributesToOrder:';
        Object.keys(e).forEach(function (key) {
            errString += '\n' + key + ': ' + e[key];
        });
        jdeLogger.error(errString);
    }
}

/**
 * Gets a list of customer group IDs for reporting
 *
 * @memberof CustomOrderHelpers
 * @param {Object} customerGroups - The customer group object.
 * @returns {string} - The customer group ID to report
 */
function codify(customerGroups) {
    var cgId = null;
    var groupIdsToReport = require('dw/system/Site').getCurrent().getCustomPreferenceValue('reportedCustomerGroups');
    var y = 0;
    var x = 0;
    while (y < groupIdsToReport.length && !cgId) {
        var ccg = groupIdsToReport[y];
        x = 0;

        // Loop through the custom preference CustomerGroups list.
        while (x < customerGroups.length && !cgId) {
            var pcg = customerGroups[x].ID;

            if (!empty(pcg) && !empty(ccg) &&
                pcg.toLowerCase() === ccg.toLowerCase()
            ) {
                cgId = ccg;
                break;
            }

            x++;
        }
        y++;
    }
    return cgId;
}

module.exports = {
    addAddressToFraudList: addAddressToFraudList,
    addJDEAttributesToBasket: addJDEAttributesToBasket,
    addJDEAttributesToOrder: addJDEAttributesToOrder,
    checkFraudListForAddress: checkFraudListForAddress,
    checkForFraudCheckProduct: checkForFraudCheckProduct,
    codify: codify,
    getAddressKey: getAddressKey,
    getSubscriptionType: getSubscriptionType
};
