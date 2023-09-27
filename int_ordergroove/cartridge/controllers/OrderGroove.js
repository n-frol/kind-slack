'use strict';

/**
 * This controller implements endpoints for OrderGroove to authenticate the MSI
 * and to place recurring orders.
 *
 * @module controllers/OrderGroove
 */

/* Global API Includes */
var Site = require('dw/system/Site');
var ISML = require('dw/template/ISML');
var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
const CouponMgr = require('dw/campaign/CouponMgr');
const Transaction = require('dw/system/Transaction');
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');


/**
 * Determine the appropriate OrderGroove shipping method to use
 *
 * @param {string} stateCode - The state code of the current address
 * @return {string} The ID of the appropriate shipping method, or null if none is set
 */
function getOgShippingMethod(stateCode) {
    var secondaryShippingMethod = Site.getCurrent().getCustomPreferenceValue('OrderGrooveSecondaryShippingMethod');
    var secondaryShippingStates = Site.getCurrent().getCustomPreferenceValue('OrderGrooveSecondaryShippingMethodStates');
    if (!empty(secondaryShippingMethod) && !empty(secondaryShippingStates)) {
        var stateInd = secondaryShippingStates.indexOf(stateCode);

        if (stateInd !== -1) {
            return secondaryShippingMethod;
        }
    }

    return !empty(Site.getCurrent().getCustomPreferenceValue('OrderGrooveShippingMethod')) ? Site.getCurrent().getCustomPreferenceValue('OrderGrooveShippingMethod') : null;

}


/**
 * Return the actual amount of items available to sell (ATS) in the Storefront.
 * If "Pre-Order/Backorder Handling" is specified, then it's calculated as stock level + pre-order/backorder allocation.
 * Otherwise it's the same as the stock level.
 *
 * @param {string} productId - The product SKU
 * @param {string} inventoryListId - The Id of the organization invetory list
 * @return {number} Amount of items available to sell
 */
function getAmountsOfItemAvailableToSell(productId,inventoryListId){
    // We need to const the perpetualQty value because the inventory object is not has any quantity value for this use case.
    // We do 100 because BYOB products can not be more than 100.
    var perpetualQty = 100;
    var inventoryList = ProductInventoryMgr.getInventoryList(inventoryListId);
    var itemInventoryRecord = inventoryList.getRecord(productId);
    var isPerpetual =  Object.hasOwnProperty.call(itemInventoryRecord, 'perpetual');
    var availableToSell = isPerpetual ? itemInventoryRecord.perpetual ? perpetualQty : Object.hasOwnProperty.call(itemInventoryRecord, 'ATS') ?
        itemInventoryRecord.ATS.value : 0 : 0;
    return availableToSell;
}

/**
 * Return the calculated amout of required swap items for items and components
 *
 * @param {dw.util.HashMap} productMap - Order groove subscription items
 * @return {Object} Amount of items required to swap item
 */
function calculateRequiredSwapInventory(productMap){
    var items = productMap.values().toArray();
    var requiredSwapInventory = new Object();
    requiredSwapInventory["itemAmount"] = 0;
    requiredSwapInventory["componentAmount"] = 0;
    requiredSwapInventory["components"] = new Array();
    requiredSwapInventory["items"] = new Array();
    items.forEach(function (item) {
        if(item["finalPrice"] > 0){
            /**
             * @todo Add item level requred swap inventory calculation
             */

            item["components"].forEach(function (component) {
                var productID = component["product_id"];
                var qty = component["qty"];
                var inventoryId = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementInventory');
                var availableToSell = getAmountsOfItemAvailableToSell(productID, inventoryId);
                if(availableToSell < qty){
                    requiredSwapInventory["componentAmount"] = requiredSwapInventory["componentAmount"] + qty;
                    requiredSwapInventory["components"].push(productID);
                }
            });
        }
    });
    return requiredSwapInventory;
}

/**
 * Checks available swap inventory amount for out of stock items.
 * It loops the every swap item until find available inventory.
 * Available swap item product will return otherwise null
 *
 * @param {Object} requiredSwapInventory
 * @param {dw.customer.Customer} customer - Customer
 * @return {String}  SKU If available to sell greater than required swap inventory. Default is null
 */
function checkAvailableSwapItemAmountForComponents(requiredSwapInventory, customer){
    var inventoryId = Site.getCurrent().getCustomPreferenceValue('byob_AutoSwapReplacementInventory');
    var swapItems = Site.getCurrent().getCustomPreferenceValue("byob_AutoSwapReplacementItems");
    if(Object.hasOwnProperty.call(customer.profile.custom, 'swapbar')) {
        var customerChooseSwapItem = customer.profile.custom.swapbar
        if(!empty(customerChooseSwapItem)) {
            var availableToSell = getAmountsOfItemAvailableToSell(customerChooseSwapItem, inventoryId);
            if(availableToSell >= requiredSwapInventory["componentAmount"]){
                return customerChooseSwapItem;
            }
        }
    }

    if(!empty(swapItems)){
        for (let index = 0; index < swapItems.length; index++) {
            var productId = swapItems[index];
            var availableToSell = getAmountsOfItemAvailableToSell(productId, inventoryId);
            if(availableToSell >= requiredSwapInventory["componentAmount"]){
                return productId;
            }
        }
    } else {
        return null;
    }
}

/**
 * @param {dw.util.HashMap} productMap - Order groove subscription items
 * @param { dw.customer.Customer} customer - Customer
 * @return {Object} Object of the swap items details
 */
function outOfStockItemsForSwapping(productMap, customer){
    var calculatedRequiredSwapInventory = calculateRequiredSwapInventory(productMap);
    calculatedRequiredSwapInventory["isSwapItemAvailable"] = true;
    if(calculatedRequiredSwapInventory["componentAmount"] > 0){
        var availableSwapItem = checkAvailableSwapItemAmountForComponents(calculatedRequiredSwapInventory, customer);
        if(availableSwapItem != null){
            calculatedRequiredSwapInventory["availableSwapItem"] = availableSwapItem;
            return calculatedRequiredSwapInventory
        } else {
            calculatedRequiredSwapInventory["isSwapItemAvailable"] = false;
            return calculatedRequiredSwapInventory;
        }
    }
    return null;
}

/**
 * @description
 * Calling calculate hook since it will override prices, promotions, and taxes
 * After apply the coupon or any promotion activity, reset the discounted subscription price for non zero price items.
 * The function brings back non zero items to subscription price.
 *
 * @param {Array} items Array version of the productMap
 * @param { dw.order.Basket} basket Current basket
 */
function reCalculateClbPrice(items, basket) {
    items.forEach(function (item) {
        if(item["finalPrice"] > 0){
            var price : Number = item["finalPrice"];
            var productID : String = item["product_id"];
            var qty : Number = item["qty"];
            price = price / qty;
            var allProductLineItems = basket.getAllProductLineItems(productID).iterator();
            while (allProductLineItems.hasNext()) {
                var lineItem = allProductLineItems.next();
                if(lineItem.isBonusProductLineItem() === false){
                    lineItem.setPriceValue(price);
                    basket.updateTotals();
                }
            }
        }
    });
}

exports.Auth = function() {
    /* Local API Includes */
    var Mac = require('dw/crypto/Mac');
    var Encoding = require('dw/crypto/Encoding');
    var ArrayList = require('dw/util/ArrayList');
    var Cookie = require('dw/web/Cookie');

    if (request.getHttpMethod() !== 'GET') {
        // switching is not possible, set status 403 (forbidden)
        response.setStatus(403);
        return;
    }
    if(request.isHttpSecure() == false) {
        var url = "https://" + request.httpHost + request.httpPath;
        if (!empty(request.httpQueryString)) {
            url += "?" + request.httpQueryString;
        }
        response.redirect(url);
        return;
    }

    if(customer.isAuthenticated()) {
        var customerNo : String = customer.getProfile().getCustomerNo();
        var epoch : String = (Date.now() / 1000.0).toPrecision(10).toString();
        var encryptor : Mac = new Mac(Mac.HMAC_SHA_256);
        var hashInput : String = customerNo + "|" + epoch;
        var hashKey : String = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantHashKey');
        var hashBytes : Bytes = encryptor.digest(hashInput, hashKey);
        var hash : String = Encoding.toBase64(hashBytes);
        var contentList : ArrayList = new ArrayList();
        contentList.add1(customerNo);
        contentList.add1(epoch);
        contentList.add1(hash);
        var content : String = contentList.join("|");
        var cookie : Cookie = new Cookie("og_auth", content);
        cookie.setSecure(true); // secure cookie
        cookie.setMaxAge(7200); // 2 hour expiration in seconds
        cookie.setPath("/"); // base path
        response.addHttpCookie(cookie); // response is an implicit variable according to the API
    }

    // Render authentication page
    ISML.renderTemplate("authentication");
    return;
}

exports.OrderPlacement = function() {
    /* Local API Includes */
    var Logger = require('dw/system/Logger');
    var Resource = require('dw/web/Resource');
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var AmountDiscount = require('dw/campaign/AmountDiscount');
    var BasketMgr = require('dw/order/BasketMgr');
    var Transaction = require('dw/system/Transaction');
    var ShippingMgr = require('dw/order/ShippingMgr');
    var HashMap = require('dw/util/HashMap');
    var ShippingLocation = require('dw/order/ShippingLocation');
    var TaxMgr = require('dw/order/TaxMgr');
    var PaymentInstrument = require('dw/order/PaymentInstrument');
    var Money = require('dw/value/Money');
    var StringUtils = require('dw/util/StringUtils');
    var Cipher = require('dw/crypto/WeakCipher');
    var OrderMgr = require('dw/order/OrderMgr');
    var PaymentMgr = require('dw/order/PaymentMgr');
    var HookMgr = require('dw/system/HookMgr');
    var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
    var Order = require('dw/order/Order');
    var Status = require('dw/system/Status');
    var order;
    var placeOrderStatus;

    var log : Log = Logger.getLogger("order-groove", "OG");

    if(empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) || Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == false) {
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "999",
            ErrorMsg: "The endpoint is currently disabled."
        });
        return;
    }
    if(request.isHttpSecure() == false) {
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "999",
            ErrorMsg: "The HTTP communication is not secure."
        });
        return;
    }
    if(request.getHttpMethod() !== "POST") {
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "999",
            ErrorMsg: "The HTTP method is forbidden."
        });
        return;
    }

    // Validate basic authentication from header
    var headers : Map = request.getHttpHeaders();
    if (headers.containsKey("authorization")) {
        var basic = headers.get("authorization").toString();
        basic = basic.replace("Basic ", "");
        basic = StringUtils.decodeBase64(basic);
        basic = basic.split(":");
        var username = basic.shift().toString();
        var password = basic.shift().toString();
        if(empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveBasicUser")) || empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveBasicPass"))
            || Site.getCurrent().getCustomPreferenceValue("OrderGrooveBasicUser") !== username || Site.getCurrent().getCustomPreferenceValue("OrderGrooveBasicPass") !== password) {
            ISML.renderTemplate("ErrorXML", {
                ErrorCode: "403",
                ErrorMsg: "Not authorized to perform a request."
            });
            return;
        }
    } else {
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "403",
            ErrorMsg: "Authentication is required."
        });
        return;
    }

    // Retrieve posted query string OrderGroove
    var map : HttpParameterMap = request.getHttpParameterMap();
    dw.system.Logger.info(map.getRequestBodyAsString());
    var xml : XML = new XML(map.getRequestBodyAsString());
    if(xml.children().length() == 0) {
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "999",
            ErrorMsg: "The request body was empty or not XML."
        });
        return;
    }
    var headXML : XMLList = xml.child("head");
    var customerXML : XMLList = xml.child("customer");

    // Get customer record
    var customerNo : String = customerXML.child("customerPartnerId").toString();
    log.warn("Retrieving customer for customerNo: '" + customerNo + "'");
    log.warn("customerNo type: " + typeof customerNo);
    var customer : Customer = CustomerMgr.getCustomerByCustomerNumber(customerNo);
    log.warn("customer: " + customer);
    if(empty(customer)) {
        log.error('Customer not found');
        ISML.renderTemplate("ErrorXML", {
            ErrorCode: "999",
            ErrorMsg: "Could not obtain a customer record for the provided customer number."
        });
        return;
    }

    // Get or create basket
    var basket : Basket = BasketMgr.getCurrentOrNewBasket();

    // Gather line items and manually increment quantity for duplicates since pricing gets override
    var itemsXML : XMLList = xml.child("items");
    var productMap = new HashMap();
    for(var i : Number = new Number(0); i < itemsXML.children().length(); i++) {
        var item : XMLList = itemsXML.children()[i];
        var productKey : String = item.child("product_id").toString();
        if(productMap.containsKey(productKey) == false) {
            var product : Object = new Object();
            product["product_id"] = productKey;
            product["qty"] = Number(item.child("qty").toString());
            product["finalPrice"] = Number(item.child("finalPrice").toString());


            var xmlComponents = item.child("components");

            // Save BYOB components
            product["components"] = new Array();
            for (var j = 0; j < xmlComponents.children().length(); j++) {
                var xmlComponent = xmlComponents.children()[j];
                var component = new Object();
                component["product_id"] = xmlComponent.child("product_id").toString();
                component["qty"] = Number(xmlComponent.child("qty").toString());
                product["components"].push(component);
            }

            productMap.put(productKey, product);
        }
        else {
            productMap.get(productKey)["qty"] += Number(item.child("qty").toString());
            productMap.get(productKey)["finalPrice"] += Number(item.child("finalPrice").toString());
        }
    }

    // Get any order-level discounts
    var incentivesXML = xml.child('incentives');
    var incentiveID = null;
    var incentiveCode = null;
    for (var i = Number(0); i < incentivesXML.children().length(); i++) {
        var incentiveXML = incentivesXML.children()[i];
        var incentiveTarget = incentiveXML.child('target').toString();
        if (incentiveTarget === 'order') {
            incentiveID = incentiveXML.child('target_id').toString();
            incentiveCode = incentiveXML.child('code').toString();
            break;
        }
    }
    var orderDiscountAmount = new Number(headXML.child('orderSubtotalDiscount').toString());

    /* ============  Begin Transaction  ============ */
    var transactionStatus = Transaction.wrap(function () {
        var isAutoSwapEnabled = Site.getCurrent().getCustomPreferenceValue("byob_AutoSwapReplacementEnabled");
        var isAnyItemSwapped = false;

        if(isAutoSwapEnabled){
            var swappingItems = outOfStockItemsForSwapping(productMap, customer);
            if(swappingItems != null){
                if(!swappingItems["isSwapItemAvailable"]){
                    // Log that there is not swap item in the inventory with default flag.
                    log.warn('No swap item available to sell.');
                    return {
                        template: 'ErrorXML',
                        detail: {
                            ErrorCode: '020',
                            ErrorMsg: 'Swap item is not available to replace out of stock items.'
                        }
                    };
                }
            }
        }


        // If the client accepts cookies, if there are subsequent
        // calls after an error, line items can potentially
        // persist. Make sure the basket is empty.
        var lineItemIter = basket.getAllProductLineItems().iterator();
        while (lineItemIter.hasNext()) {
            var lineItem = lineItemIter.next();
            basket.removeProductLineItem(lineItem);
        }

        // Set email for basket
        basket.setCustomerEmail(customer.getProfile().getEmail());

        // Get default shipment and create shipping address based on XML
        var shipment : Shipment = basket.getDefaultShipment();
        var shippingAddress : OrderAddress = shipment.createShippingAddress();
        var customerShippingZip = customerXML['customerShippingZip'].toString().trim();

        // Only get the first 5 of the zip.
        if (customerShippingZip.length > 5) {
            customerShippingZip = customerShippingZip.substring(0, 5);
        }

        shippingAddress.setCompanyName(customerXML["customerShippingCompany"].toString());
        shippingAddress.setFirstName(customerXML["customerShippingFirstName"].toString());
        shippingAddress.setLastName(customerXML["customerShippingLastName"].toString());
        shippingAddress.setAddress1(customerXML["customerShippingAddress1"].toString());
        shippingAddress.setAddress2(customerXML["customerShippingAddress2"].toString());
        shippingAddress.setCity(customerXML["customerShippingCity"].toString());
        shippingAddress.setPostalCode(customerShippingZip);
        shippingAddress.setStateCode(customerXML["customerShippingState"].toString());
        shippingAddress.setCountryCode(customerXML["customerShippingCountry"].toString().toUpperCase());
        shippingAddress.setPhone(customerXML["customerShippingPhone"].toString());

        // Get tax jurisdiction to realize tax rate
        var location : ShippingLocation = new ShippingLocation(shippingAddress);
        var taxJurisdictionID = TaxMgr.getTaxJurisdictionID(location);
        if (empty(taxJurisdictionID)) {
            taxJurisdictionID = TaxMgr.getDefaultTaxJurisdictionID();
        }

        // Create product line items and set cost
        var items : Array = productMap.values().toArray();
        items.forEach(function (item) {
            var price : Number = item["finalPrice"];
            var productID : String = item["product_id"]

            var pli : ProductLineItem = basket.createProductLineItem(productID, shipment);
            var qty : Number = item["qty"];
            pli.setQuantityValue(qty);
            price = price > 0 ? price / qty : 0.00;
            pli.setPriceValue(price);
            var productTaxClassID : String = pli.getTaxClassID();
            if (empty(productTaxClassID)) {
                productTaxClassID = TaxMgr.getDefaultTaxClassID();
            }
            var taxRate : Number = TaxMgr.getTaxRate(productTaxClassID, taxJurisdictionID);
            pli.updateTax(taxRate);

            var boxContents = [];
            // We don't have the original box ID, but we can use the
            // lineItem's UUID to associate the box with the contents
            if (!empty(pli.product) && pli.product.variant && !empty(pli.product.masterProduct) &&
                pli.product.masterProduct.custom.isByobMaster) {
                pli.custom.isByobMaster = true;
                pli.custom.boxID = pli.getUUID();
            }

            // Create component line items
            item["components"].forEach(function (component) {
                var componentProductID = component["product_id"];
                var componentQty = component["qty"];

                if(isAutoSwapEnabled){
                    // Checking out of stock components and swapping it
                    if(swappingItems != null){
                        swappingItems["components"].forEach(function (swapComponent){
                            if(componentProductID == swapComponent){
                                componentProductID = swappingItems["availableSwapItem"];
                                isAnyItemSwapped = true;
                            }
                        });
                    }
                }

                // The bug identified KSC-875, same sku on swap item, overwriting the line item.
                // Solutions before add Swap item to make sure line item is not has the same sku,
                // other wise increase the quantity with swap quantity.
                var allProductLineItems = basket.getAllProductLineItems(componentProductID).iterator();
                while (allProductLineItems.hasNext()) {
                    var lineItem = allProductLineItems.next();
                    if(!lineItem.bundledProductLineItem){
                        componentQty += lineItem.quantity.value;
                    }
                }

                var componentPli = basket.createProductLineItem(componentProductID, shipment);
                componentPli.setQuantityValue(componentQty);
                componentPli.setPriceValue(0.00);
                var componentTaxClassID : String = componentPli.getTaxClassID();
                if (empty(productTaxClassID)) {
                    componentTaxClassID = TaxMgr.getDefaultTaxClassID();
                }
                var taxRate : Number = TaxMgr.getTaxRate(componentTaxClassID, taxJurisdictionID);
                componentPli.updateTax(taxRate);

                // Associate with box via box ID
                if (pli.custom.isByobMaster) {
                    componentPli.custom.boxID = pli.custom.boxID;
                    boxContents.push({ sku: componentPli.product.ID, qty: componentPli.getQuantityValue() });
                }
            });

            if (!empty(pli.product) && pli.product.variant && !empty(pli.product.masterProduct) &&
                pli.product.masterProduct.custom.isByobMaster) {
                pli.custom.boxContents = JSON.stringify(boxContents);
            }
        });

        // Checking Order Groove Exclusivity for promotions.
        basket.setChannelType(basket.CHANNEL_TYPE_SUBSCRIPTIONS);
        HookMgr.callHook('recurring.order.calculate', 'calculateRecurring', basket);
        reCalculateClbPrice(items, basket);

        // Set shipping method
        var basketPrice = basket.getAdjustedMerchandizeTotalPrice();
        var methods : Iterator = ShippingMgr.getAllShippingMethods().iterator();
        var shipMethodID : String = getOgShippingMethod(customerXML["customerShippingState"].toString());
        log.info('Shipping Method: {0}', shipMethodID);
        var customerMethod = null;
        while(methods.hasNext()) {
            var method : ShippingMethod = methods.next();
            if(method.getID() == shipMethodID) {
                customerMethod = method;
                break;
            }
        }
        shipment.setShippingMethod(customerMethod);

        // Set shipping cost
        var ogShippingCost = Number(headXML.child('orderShipping').toString());
        var OG_FREE_SHIP_THRESHOLD = Site.getCurrent().getCustomPreferenceValue('OrderGrooveFreeShippingThreshold');
        var OG_IS_THRESHOLD_ENABLED = Site.getCurrent().getCustomPreferenceValue('OrderGrooveEnableFreeShippingThreshold');
        var sli = shipment.getStandardShippingLineItem();
        var shipmentShippingModel = ShippingMgr.getShipmentShippingModel(shipment);
        var shipmentShippingCost = shipmentShippingModel.getShippingCost(customerMethod);
        var ogFreeShip = typeof ogShippingCost === 'number' && ogShippingCost === 0;

        if (ogFreeShip ||
            (!empty(OG_IS_THRESHOLD_ENABLED) &&
                !empty(OG_FREE_SHIP_THRESHOLD) &&
                OG_IS_THRESHOLD_ENABLED &&
                basketPrice.available &&
                basketPrice.decimalValue >= OG_FREE_SHIP_THRESHOLD)
        ) {
            // If the ammount is over the threshold for free shipping apply a $0
            // shipping cost.
            sli.setPriceValue(0);
        } else {
            // If the amount is under the free shipping threshold, apply the
            // cost of the configured shipping method.
            sli.setPriceValue(shipmentShippingCost.amount.value);
        }

        var shippingTaxClassID : String = sli.getTaxClassID();
        if (empty(shippingTaxClassID)) {
            shippingTaxClassID = TaxMgr.getDefaultTaxClassID();
        }
        var taxRate : Number = TaxMgr.getTaxRate(shippingTaxClassID, taxJurisdictionID);
        sli.updateTax(taxRate);

        // Create billing address based on XML
        var billingAddress : OrderAddress = basket.createBillingAddress();

        // Pass basket and make external tax service call to override DW tax table.
        HookMgr.callHook('dw.order.calculateTax', 'calculateTax', basket);

        // Update totals and do not call calculate hook since it will override prices, promotions, and taxes
        basket.updateTotals();

        // Set order-level discount
        var orderTotalAmount = basket.getTotalGrossPrice().getValue();
        if (incentiveID !== null && orderDiscountAmount !== null) {
            // Do not let order discount amount exceed the order total amount
            if (Math.abs(orderDiscountAmount) > orderTotalAmount) {
                orderDiscountAmount = orderTotalAmount;
            }
            var orderPA = basket.createPriceAdjustment(incentiveID, new AmountDiscount(Math.abs(orderDiscountAmount)));
            orderPA.setPriceValue(-Math.abs(orderDiscountAmount));
            orderPA.updateTax(0);
            if (incentiveCode !== '' && basket.getCouponLineItem(incentiveCode) === null) {
                var cli = basket.createCouponLineItem(incentiveCode);
                cli.associatePriceAdjustment(orderPA);
            }
        }

        // Update totals and do not call calculate hook since it will override prices, promotions, and taxes
        basket.updateTotals();

        // Add basket currency, credit card payment instrument, and payment transaction
        basket.removeAllPaymentInstruments();
        var currency : String = headXML.child("orderCurrency").toString();
        var amount : Money = new Money(basket.getAdjustedMerchandizeTotalPrice().getValue(), currency);

        // Switch between using a token or the encrypted credit card
        if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveCardNumber") == false) {
            var token : String = headXML.child("orderTokenId").toString();

            // Not necessary to redefine the customer when using the customer number as the token
            var wallet : Wallet = customer.getProfile().getWallet();
            var instrumentsIter : Iterator = wallet.getPaymentInstruments().iterator();
            var cpi;
            var opi;

            // Check if the customer has any payment instruments.
            if (instrumentsIter.hasNext()) {
                while (instrumentsIter.hasNext()) {
                    cpi = instrumentsIter.next();

                    if (!empty(cpi.creditCardType) && !empty(cpi.describe().getCustomAttributeDefinition("preferred")) && cpi.getCustom()["preferred"] == true) {
                        opi = basket.createPaymentInstrumentFromWallet(cpi, amount);
                        break;
                    }
                }

                if(empty(opi)) {
                    // Log that there is not payment instrument with default flag.
                    log.warn('No payment instrument found with default flag for customer No: {0}',
                        customer.profile.customerNo);

                    // Get the default payment instrument UUID stored on the Profile.
                    var piUUID = !empty(customer.profile.custom.defaultPaymentInstrument) ?
                        customer.profile.custom.defaultPaymentInstrument : '';
                    var fallbackIter = wallet.getPaymentInstruments().iterator();

                    while (fallbackIter.hasNext()) {
                        cpi = fallbackIter.next();

                        if (!empty(piUUID) && cpi.UUID === piUUID) {
                            cpi.custom.preferred = true;
                            opi = basket.createPaymentInstrumentFromWallet(cpi, amount);
                            break;
                        }
                    }

                    if(empty(opi)) {
                        // Log that there is not payment instrument with default flag.
                        log.warn('No defaultPaymentInstrument custom attribute found for customer No: {0}',
                            customer.profile.customerNo);
                        return {
                            template: 'ErrorXML',
                            detail: {
                                ErrorCode: '999',
                                ErrorMsg: 'Could not obtain a customer payment record for the provided token.'
                            }
                        };
                    }
                }
            } else {
                var errMsg = 'ERROR in OrderGroove.js at PlaceOrder():\n\t' +
                    'Could not obtain a customer payment record for the provided token.\n\t' +
                    'Customer No: {0} has no saved payment instruments';
                log.error(errMsg, customer.profile.customerNo);
                return {
                    template: 'ErrorXML',
                    detail: {
                        ErrorCode: '999',
                        ErrorMsg: 'Could not obtain a customer payment record for the provided token.'
                    }
                };
            }

            billingAddress.setFirstName(customer.getProfile().getFirstName());
            billingAddress.setLastName(customer.getProfile().getLastName());
            billingAddress.setCountryCode('US');

            // Address1
            if(!empty(cpi.describe().getCustomAttributeDefinition('address1'))
                && !empty(cpi.custom.address1)
            ) {
                billingAddress.setAddress1(cpi.getCustom()['address1']);
            }

            // Address2
            if(!empty(cpi.describe().getCustomAttributeDefinition('address2')) &&
                !empty(cpi.custom.address2)
            ) {
                billingAddress.setAddress2(cpi.getCustom()['address2']);
            }

            // City
            if(!empty(cpi.describe().getCustomAttributeDefinition('city')) &&
                !empty(cpi.custom.city)
            ) {
                billingAddress.setCity(cpi.getCustom()['city']);
            }

            // Postal Code
            if(!empty(cpi.describe().getCustomAttributeDefinition('postalCode')) &&
                !empty(cpi.custom.postalCode)
            ) {
                billingAddress.setPostalCode(cpi.getCustom()['postalCode']);
            }

            // State Code
            if(!empty(cpi.describe().getCustomAttributeDefinition('stateCode')) &&
                !empty(cpi.custom.stateCode)
            ) {
                billingAddress.setStateCode(cpi.getCustom()['stateCode']);
            }

            // Phone #
            if(!empty(cpi.describe().getCustomAttributeDefinition('phone')) &&
                !empty(cpi.custom.phone)
            ) {
                billingAddress.setPhone(cpi.custom.phone);
            } else {
                var xmlPhoneNumber = customerXML['customerShippingPhone'].toString();

                billingAddress.setPhone(xmlPhoneNumber);
                cpi.custom.phone = xmlPhoneNumber;
            }

            if (empty(billingAddress.getAddress1())) {
                billingAddress.setAddress1(customerXML['customerShippingAddress1'].toString());
                billingAddress.setAddress2(customerXML['customerShippingAddress2'].toString());
                billingAddress.setCity(customerXML['customerShippingCity'].toString());
                billingAddress.setPostalCode(customerXML['customerShippingZip'].toString());
                billingAddress.setStateCode(customerXML['customerShippingState'].toString());
                billingAddress.setCountryCode(customerXML['customerShippingCountry'].toString().toUpperCase());
                billingAddress.setPhone(customerXML['customerShippingPhone'].toString());
            }
        }
        else {
            var customerBillingZip = customerXML['customerShippingZip'].toString().trim();

            // Only save the first 5 of the zip to ensure a match if the customer
            // only enters 5 and the address is validated.
            if (customerBillingZip.length > 5) {
                customerBillingZip = customerBillingZip.substring(0, 5);
            }

            billingAddress.setCompanyName(customerXML['customerBillingCompany'].toString());
            billingAddress.setFirstName(customerXML['customerBillingFirstName'].toString());
            billingAddress.setLastName(customerXML['customerBillingLastName'].toString());
            billingAddress.setAddress1(customerXML['customerBillingAddress1'].toString());
            billingAddress.setAddress2(customerXML['customerBillingAddress2'].toString());
            billingAddress.setCity(customerXML['customerBillingCity'].toString());
            billingAddress.setPostalCode(customerBillingZip);
            billingAddress.setStateCode(customerXML['customerBillingState'].toString());
            billingAddress.setCountryCode(customerXML['customerBillingCountry'].toString().toUpperCase());
            billingAddress.setPhone(customerXML['customerBillingPhone'].toString());

            var opi : OrderPaymentInstrument = basket.createPaymentInstrument(PaymentInstrument.METHOD_CREDIT_CARD, amount);
            // Set credit card payment instrument details
            var hashKey : String = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantHashKey');
            var hashKeyEncoded : String = StringUtils.encodeBase64(hashKey);
            var cipher : Cipher = new Cipher();
            var ccHolderEncrypted : String = headXML.child('orderCcOwner').toString();
            var ccHolder : String = cipher.decrypt(ccHolderEncrypted, hashKeyEncoded, 'AES/ECB/NOPADDING', '', 0);
            ccHolder = ccHolder.replace('{', '', 'g');
            opi.setCreditCardHolder(ccHolder);
            var ccNumberEncrypted : String = headXML.child('orderCcNumber').toString();
            var ccNumber : String = cipher.decrypt(ccNumberEncrypted, hashKeyEncoded, 'AES/ECB/NOPADDING', '', 0);
            ccNumber = ccNumber.replace('{', '', 'g');
            opi.setCreditCardNumber(ccNumber);
            var ccType : String = headXML.child('orderCcType').toString().toUpperCase();
            switch(ccType) {
                case "VISA":
                    ccType = "Visa";
                    break;
                case "MASTER":
                case "MASTER CARD":
                case "MASTERCARD":
                    ccType = "Master";
                    break;
                case "AMEX":
                case "AMERICAN EXPRESS":
                    ccType = "Amex";
                    break;
                case "DISCOVER":
                    ccType = "Discover";
                    break;
                case "DINERS":
                    ccType = "Diners";
                    break;
                case "JCB":
                    ccType = "JCB";
                    break;
            }
            opi.setCreditCardType(ccType);
            var ccExpEncrypted : String = headXML.child("orderCcExpire").toString();
            var ccExp : String = cipher.decrypt(ccExpEncrypted, hashKeyEncoded, "AES/ECB/NOPADDING", "", 0);
            ccExp = ccExp.replace("{", "", "g").split("/");
            var ccMonth : Number = Number(ccExp[0]);
            opi.setCreditCardExpirationMonth(ccMonth);
            var ccYear : Number = Number(ccExp[1]);
            opi.setCreditCardExpirationYear(ccYear);

            // Verify credit card
            var paymentCard : PaymentCard = PaymentMgr.getPaymentCard(ccType);
            var ccStatus : Status = paymentCard.verify(ccMonth, ccYear, ccNumber);
            if(ccStatus.isError()) {
                if(ccStatus.getMessage() == PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE) {
                    return {
                        template: 'ErrorXML',
                        detail: {
                            ErrorCode: '120',
                            ErrorMsg: 'The credit card expiration date provided is not valid.'
                        }
                    };
                } else if(ccStatus.getMessage() == PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER) {
                    return {
                        template: 'ErrorXML',
                        details: {
                            ErrorCode: '110',
                            ErrorMsg: 'The credit card number provided is not valid.'
                        }
                    };
                }
            }
        }
        basket.setChannelType(basket.CHANNEL_TYPE_SUBSCRIPTIONS);

        // Adds custom attributes before order creation
        require('*/cartridge/scripts/checkout/customOrderHelpers').addJDEAttributesToBasket();

        // Set coupon code into basket
        try {
            var myBasket = basket;
            // Create order
            order = OrderMgr.createOrder(basket);

            // Set payment method as a custom field on the order for OMS
            if ("paymentTransaction" in order && "paymentInstrument" in order.paymentTransaction) {
                Transaction.wrap(function () {
                    order.custom.paymentMethod = order.paymentTransaction.paymentInstrument.paymentMethod;
                });
            }

        } catch(e if e instanceof APIException) {
            var errMsg = 'ERROR in OrderGroove.js at OrderPlacement():\n\t';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            log.error(errMsg);
            return {
                template: 'ErrorXML',
                detail: {
                    ErrorCode: '999',
                    ErrorMsg: 'A technical error occurred while creating the order.'
                }
            };
        }
        // Tie customer record to the order
        order.setCustomer(customer);

        // if any item swapped with swappe item, marked the order swapped
        if(isAnyItemSwapped){
            order.custom.isAnyItemSwapped = true;
        }


        // Authorize credit card
        if(order.getTotalNetPrice() !== 0.00) {
            var pil : List = order.getPaymentInstruments().iterator().asList();
            if(pil.isEmpty()) {
                OrderMgr.failOrder(order);

                return {
                    template: 'ErrorXML',
                    detail: {
                        ErrorCode: '140',
                        ErrorMsg: 'Missing payment information.'
                    }
                };
            }
            var opi : OrderPaymentInstrument = pil.get(0);
            opi.getPaymentTransaction().setAmount(order.getTotalGrossPrice());
            var authorizationResult = new Object();
            // Make external call to authorize credit card
            if(HookMgr.hasHook('app.payment.processor.paymentoperator_paymentgate')) {
                authorizationResult = HookMgr.callHook('app.payment.processor.paymentoperator_paymentgate', 'Authorize', order.getOrderNo(), opi, opi.getPaymentTransaction().getPaymentProcessor());
            } else {
                authorizationResult = HookMgr.callHook('app.payment.processor.default', 'Authorize', {
                    Order: order,
                    OrderNo: order.getOrderNo(),
                    PaymentInstrument: opi
                });
            }
            if(authorizationResult.not_supported || authorizationResult.error) {
                OrderMgr.failOrder(order);
                return {
                    template: 'ErrorXML',
                    detail: {
                        ErrorCode: '140',
                        ErrorMsg: 'Authorization Error'
                    }
                };
            } else if(authorizationResult.declined) {
                OrderMgr.failOrder(order);
                return {
                    template: 'ErrorXML',
                    detail: {
                        ErrorCode: '140',
                        ErrorMsg: 'Authorization Declined'
                    }
                };
            }
        } else {
            OrderMgr.failOrder(order);
            return {
                template: 'ErrorXML',
                detail: {
                    ErrorCode: '999',
                    ErrorMsg: 'Order total is 0'
                }
            };
        }

        // Place order
        placeOrderStatus = OrderMgr.placeOrder(order);
        if(placeOrderStatus === Status.ERROR) {
            OrderMgr.failOrder(order);
            return {
                template: 'ErrorXML',
                detail: {
                    ErrorCode: '020',
                    ErrorMsg: 'Failed to place order'
                }
            };
        }
        order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
        order.setExportStatus(Order.EXPORT_STATUS_READY);

        // Adds custom attributes after order creation
        var customerGroups = customer.getCustomerGroups();
        var cgId = require('*/cartridge/scripts/checkout/customOrderHelpers').codify(customerGroups);
        if (!empty(cgId)) {
            order.getCustom().customerGroup = cgId;
        }
        var firstName = order.customer.profile.firstName;
        var lastName = order.customer.profile.lastName;
        order.custom.firstName = firstName;
        order.custom.lastName = lastName;

        // injecting linc order create hook
        if (HookMgr.hasHook('app.kind.linc.order')) {
            HookMgr.callHook('app.kind.linc.order', 'createOrder', order);
        }

        return {
            template: 'SuccessXML',
            detail: {
                OrderNo: order.getOrderNo()
            }
        };
    });
    /* ============  End Transaction  ============ */


    if (!empty(transactionStatus) &&
        !empty(transactionStatus.template) &&
        !empty(transactionStatus.detail)
    ) {
        // If the order was successful, then send a confirmation email.
        if (!empty(order) && transactionStatus.template !== 'ErrorXML') {
            // Klaviyo include to send order confirmation event
            if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) {
                var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
                KlaviyoUtils.buildDataLayer(order.orderNo);
            }
        }

        // Render the template.
        ISML.renderTemplate(transactionStatus.template, transactionStatus.detail);
    } else {
        ISML.renderTemplate('ErrorXML', {
            ErrorCode: '999',
            ErrorMsg: 'The HTTP method is forbidden.'
        });
    }
}

/* Web exposed methods */
exports.OrderPlacement.public = true;
exports.Auth.public = true;
