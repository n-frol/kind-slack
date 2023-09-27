/* global empty, session */

'use strict';

/**
 * vertexRequest.js
 *
 * A data model call for the quotation-request call to the Vertex tax-calculation
 * web service. The invoce request initiates tax calculation for the supplied
 * transaction data.
 *
 * @module VertexRequest
 */

// SFCC system class imports.
var Logger = require('dw/system/Logger');
var Money = require('dw/value/Money');
var ProductLineItem = require('dw/order/ProductLineItem');
var ProductShippingLineItem = require('dw/order/ProductShippingLineItem');
var ShippingLineItem = require('dw/order/ShippingLineItem');
var Site = require('dw/system/Site');
var StoreMgr = require('dw/catalog/StoreMgr');

// Vertex module imports.
var VertexAddress = require('*/cartridge/models/vertexAddress');
var VertexLineItem = require('*/cartridge/models/vertexLineItem');

var vLog = Logger.getLogger('vertex', 'vertex');

/**
 * A data model class used as a standard interface for passing data to a tax
 * calculation request from the Vertex API web service. The constructor function
 * takes a LineItemCtnr instance (basket or order), null checks the required
 * fileds for making a call to the service, and assigns the needed data as local
 * members with naming that matches the format required for a call to the Vertex
 * API.
 *
 * @class
 * @constructor
 * @param {dw.order.LineItemCtnr} lineItemCtnr - The line item container to
 *      calculate taxes on.
 */
function VertexRequest(lineItemCtnr) {
    // Define class member defaults.
    this.lineItemCtnr = lineItemCtnr;
    this.discount = 0;
    this.valid = false;
    this.documentNumber = '';
    this.documentType = '';
    this.billingType = '';
    this.orderType = '';
    this.customer = {};
    this.seller = {};
    this.lineItems = [];

    // Get the needed site preference values and assign as member variables.
    var site = Site.getCurrent();
    var companyCode = site.getCustomPreferenceValue('vertexCompanyCode');
    this.companyCode = !empty(companyCode) ? companyCode : '';

    // Get the customer code, based on any customer groups the user is assigned
    // to, and assign the code and the codeID as local member variables.
    this.checkCustomerClass();

    // Gets the date as a string in the desired format: yyyy-mm-dd.
    this.postingDate = this.getCurrentDate();
    this.documentDate = this.getCurrentDate();
    this.populateLocalData();
    this.setupTaxRequest();
}

/* Private Helper Functions
   ========================================================================== */

/**
 * Gets the values from the custom attributes of the CustomerGroup whos ID was
 * specified as the parameter.
 *
 * @param {string} customerGroupId - The Id for the CustomerGroup to get the
 *      custom attributes from.
 * @returns {{classCodeId: string, classCode: string}} - Returns the classCode
 *      and classCodeId from the specified customer group. An empty string is
 *      is returned for each property of the result, if the custom attribute is
 *      not set.
 */
function getCustomAttributesFromGroup(customerGroupId) {
    var customer = session.getCustomer();
    var customerGroupsCollection = customer.getCustomerGroups();
    var customerGroupsArray = customerGroupsCollection.empty ?
        [] : customerGroupsCollection.toArray();
    var result = { classCodeId: '', classCode: '' };

    customerGroupsArray.forEach(function (customerGroup) {
        // Find the CustomerGroup instance with the matching ID.
        if (customerGroup.ID.equals(customerGroupId) &&
            !empty(customerGroup.custom)
        ) {
            // Get the custom attribute values from the CustomerGroup.
            result.classCodeId = !empty(
                customerGroup.custom.customerClassCodeID) ?
                customerGroup.custom.customerClassCodeID : '';
            result.classCode = !empty(
                customerGroup.custom.customerClassCode) ?
                customerGroup.custom.customerClassCode : '';
        }
    });

    return result;
}

/**
 * Gets an object literal that can be stringified for creating a unique basket
 * hash from the object properties.
 *
 * @returns {Object} - Returns an object literal that can be strigified.
 */
function getBasketHashObject() {
    var BasketMgr = require('dw/order/BasketMgr');
    var PriceAdjustment = require('dw/order/PriceAdjustment');
    var basket = BasketMgr.getCurrentBasket();
    var hashObject = {
        s: [],
        bpa: [],
        valid: false
    };

    if (!empty(basket) && !basket.allLineItems.empty) {
        hashObject.valid = true;
        var shipmentsArray = !basket.shipments.empty ?
            basket.shipments.toArray() : [];
        var basketPAArray = !basket.priceAdjustments.empty ?
            basket.priceAdjustments.toArray() : [];

        // Loop through the shipments and add a shipment object to the array.
        if (shipmentsArray.length) {
            shipmentsArray.forEach(function (shipment) {
                var liArray = shipment.allLineItems.empty ? [] :
                    shipment.allLineItems.toArray();
                var address = shipment.shippingAddress;
                // Create the shipment object.
                var ship = {
                    u: shipment.getUUID(),
                    i: [],
                    a: {}
                };

                // Add LineItems to shipment object.
                if (liArray.length) {
                    liArray.forEach(function (li) {
                        if (li instanceof ProductLineItem) {
                            ship.i.push({
                                u: li.getUUID(),
                                q: !empty(li.getQuantityValue()) ?
                                    li.getQuantityValue() : 0
                            });
                        } else if (li instanceof PriceAdjustment) {
                            ship.i.push({
                                u: li.getUUID(),
                                q: li.getQuantity()
                            });
                        } else {
                            ship.i.push({ uuid: li.getUUID() });
                        }
                    });
                }

                // Add shipment address to shipment object.
                if (!empty(address)) {
                    ship.a.address1 = !empty(address.address1) ?
                        address.address1.trim().toLowerCase() : '';
                    ship.a.address2 = !empty(address.address2) ?
                        address.address2.trim().toLowerCase() : '';
                    ship.a.city = !empty(address.city) ?
                        address.city.trim().toLowerCase() : '';
                    ship.a.postalCode = !empty(address.postalCode) ?
                        address.postalCode.trim().toLowerCase() : '';
                    ship.a.stateCode = !empty(address.stateCode) ?
                        address.stateCode : '';
                    ship.a.countryCode = !empty(address.countryCode) ?
                        address.countryCode : '';
                }

                hashObject.s.push(ship);
            });
        }

        // Loop throught basket level PriceAdjustments and add to hash object.
        if (basketPAArray.length) {
            basketPAArray.forEach(function (pa) {
                var basketPAObject = {
                    u: pa.getUUID(),
                    q: !empty(pa.quantity) ? pa.quantity : 0
                };

                hashObject.bpa.push(basketPAObject);
            });
        }
    }

    return hashObject;
}


/* Public Member Functions
   ========================================================================== */

/**
 * Gets the current date and formats it to the required format for Vertex API
 * calls (yyyy-mm-dd).
 *
 * @returns {string} - Returns the current date as a string with the
 *      standardized ISO 8601 format and the time removed from the end.
 * @memberof VertexRequest
 */
VertexRequest.prototype.getCurrentDate = function () {
    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');
    var currentDate = new Calendar();

    return StringUtils.formatCalendar(currentDate, 'yyyy-MM-dd');
};

/**
 * Populates the tax request data that is needed for a Vertex calculation and
 * can be reused for all of the different types of line items.
 *
 * @memberof VertexRequest
 */
VertexRequest.prototype.populateLocalData = function () {
    var shipmentCollection = this.lineItemCtnr.getShipments();
    this.shipmentArray = !shipmentCollection.empty ?
        shipmentCollection.toArray() : [];
    var hasLineItems = !empty(this.lineItemCtnr.productLineItems) ||
        !empty(this.lineItemCtnr.giftCertificateLineItems);

    // Get the ship-from address. This is stored in a Store system object.
    var distCenter = StoreMgr.getStore('vertexDistCenter');
    this.shipFromAddress = !empty(distCenter) ?
        new VertexAddress(distCenter) : {};

    // Check that the basket has line items & shipments, the company code site
    // pref value was found, and the store with the ship-from address was found.
    this.valid = hasLineItems && this.shipmentArray.length &&
        this.companyCode !== '' && this.shipFromAddress !== {};

    if (!this.valid) {
        var dbgMsg = 'VertexRequest is not valid:\n';
        dbgMsg += 'Basket has valid line items: ' + hasLineItems + '\n';
        dbgMsg += 'Basket has shipments: ' + this.shipmentArray.length + '\n';
        dbgMsg += 'Company Code found: ' + this.companyCode + '\n';
        dbgMsg += 'Ship-from address found: ' + JSON.stringify(this.shipFromAddress) + '\n';

        vLog.info(dbgMsg);
    }
};

/**
 * Returns a murmur hash representation of the request. This is stored in the
 * session and is used to determine if a call to the service needs to be made to
 * update the taxes on the basket.
 *
 * @returns {{hash: number, valid: boolean}} - Returns a JS object literal with
 *      2 properties:
 *          - hash {string}: hash number representation of the VertexRequest instance
 *              for identifying if a new tax lookup call should be made to the
 *              vertex.http service.
 *          - valid {boolean}: is the hash valid.
 *
 * @memberof VertexRequest
 */
VertexRequest.prototype.getBasketHash = function () {
    var BasketHashHelpers = require(
        '*/cartridge/scripts/helpers/basketHashHelpers');
    var basketHashObj = getBasketHashObject();
    var valid = basketHashObj.valid;
    delete basketHashObj.valid;

    var requestString = JSON.stringify(basketHashObj);
    var hash = BasketHashHelpers.hashBytes(
        requestString, requestString.length, 523);

    return {
        hash: hash,
        valid: valid
    };
};

/**
 * Gets any price adjustments that have been applied to the specified LineItem
 * instance, and returns them along with an information object holding tax class
 * information about the original line item so that it can also be applied to
 * the VertexLineItem instance created from the PriceAdjustment.
 *
 * @param {dw.orderLineItem} lineItem - The LineItem instance to check for
 *      applied price adjustments, and create line-item data objects from. This
 *      should be ONLY one of 3 types of line item:
 *          - ProductLineItem
 *          - ShippingLineItem
 *          - ProductShippingLineItem
 *      If a different type is passed, it will throw an exception.
 *
 * @returns {{priceAdjustment: dw.order.PriceAdjustment, associatedData: Object}[]} -
 *      Retruns an array Objects containing two properties:
 *        - priceAdjustment: PriceAdjustment instanes.
 *        - associatedData: An object literal containing key value pairs for
 *            any data from the original line item that is needed to setup the
 *            PriceAdjustment line item for the XML request.
 *
 * @throws {Error} - Throws an error if the parameter is not one of the 3
 *      expected dw.order.LineItem sub-classes.
 * @memberof VertexRequest
 */
VertexRequest.prototype.getLineItemPAs = function (lineItem) {
    var isSLI = lineItem instanceof ShippingLineItem;
    var isPLI = lineItem instanceof ProductLineItem;
    var isPSLI = lineItem instanceof ProductShippingLineItem;
    var paCollection = isSLI ? lineItem.getShippingPriceAdjustments() :
        lineItem.getPriceAdjustments();
    var productClass = 'None';
    var strId = '';

    // If there are not any price adjustments applied to this line-item.
    if (paCollection.empty) {
        return [];
    }

    // ProductLineItem
    if (isPLI) {
        var product = lineItem.product;
        strId = product.ID + '_P';

        // Try go get the product class from the original (variant) product.
        productClass = !empty(product.custom) &&
            Object.prototype.hasOwnProperty.call(product.custom,
                'productClassID') ? product.custom.productClassID : '';

        // If the product is a variant and doesn't have a product class assigned,
        // check the master product for a product class.
        if (!productClass && !empty(product.master)) {
            productClass = !empty(product.master.custom) &&
                Object.prototype.hasOwnProperty.call(product.master.custom,
                    'productClassID') ? product.custom.productClassID :
                'None';
        } else if (!productClass) {
            productClass = 'None';
        }

        // ShippingLineItem
    } else if (isSLI) {
        strId = lineItem.ID + '_S';
        productClass = 'Shipping';

        // ProductShippingLineItem
    } else if (isPSLI) {
        strId = lineItem.productLineItem.productID + '_PS';

        // Throw an exception if it is not an expected LineItem sub-type.
    } else {
        var errMsg = 'ERROR: in VertexRequest.js at getLineItemPAs(): \n';
        if (!empty(lineItem.constructor)) {
            errMsg += 'Type passed: ' + lineItem.constructor.name;
        }

        throw new Error(errMsg);
    }

    // Loop through the applied PriceAdjustments.
    var paObjArray = paCollection.toArray().map(function (pa, i) {
        var paIndex = i + 1;

        // Create the Associated Data object.
        var dataObject = {
            paID: (strId + '_PA_' + paIndex),
            productClass: isSLI ? 'Shipping' : productClass
        };

        // Return each price adjustment along with it's associated data object.
        return {
            priceAdjustment: pa,
            associatedData: dataObject
        };
    });

    return paObjArray;
};

/**
 * Gets all of the price adjustments applied at the order level including
 * order-level shipping price adjustments, and returns an array of Object
 * literals containing the PriceAdjustment instance and an object with data
 * properties from the container that can be used to help identify each
 * adjustment within the logging.
 *
 * @returns {dw.value.Money} -
 *      Retruns an array Objects containing two properties:
 *        - priceAdjustment: PriceAdjustment instanes.
 *        - associatedData: An object literal containing key value pairs for
 *            any data from the original line item that is needed to setup the
 *            PriceAdjustment line item for the XML request.
 */
VertexRequest.prototype.getOrderDiscount = function () {
    var ctnr = this.lineItemCtnr;
    var orderDiscount = new Money(0.0, session.getCurrency());
    var ctnrShippingPAs = ctnr.getShippingPriceAdjustments();
    var ctnrShippingPAArray = !ctnrShippingPAs.empty ?
        ctnrShippingPAs.toArray() : [];
    var ctnrPAs = ctnr.getPriceAdjustments();
    var ctnrPAArray = !ctnrPAs.empty ? ctnrPAs.toArray() : [];
    var combinedArray = ctnrPAArray.concat(ctnrShippingPAArray);

    // Loop through all of the order level PriceAdjustments.
    combinedArray.forEach(function (pa) {
        if (pa.getPrice().available) {
            orderDiscount = orderDiscount.add(pa.getPrice());
        }
    });

    return orderDiscount;
};

/**
 * Checks which customer groups the customer is a member of and checks for the
 * custom attribute 'customerClassCodeID'. If the custom attribute has a value,
 * and that value matches with one of the values in the site pref
 * vertexCustomerClasses (set of strings), then we assign that value to a local
 * member variable. If the custom attribute doesn't match, or is missing, then
 * the method assigns default codes from the vertex site preferences.
 *
 * @memberof VertexRequest
 */
VertexRequest.prototype.checkCustomerClass = function () {
    var customer = session.getCustomer();
    var site = Site.getCurrent();
    var i = 0;

    // Default values from site preferences
    var classCodeId = site.getCustomPreferenceValue(
        'vertexCustomerClassCodeDefaultID');
    var classCode = site.getCustomPreferenceValue(
        'vertexCustomerClassCodeDefault');

    if (customer.getProfile() !== null && !empty(customer.getProfile().custom.jde_customer_no)) {
        classCode = customer.getProfile().custom.jde_customer_no;
    }

    // Get the configured customer classes
    var customerClassList = site.getCustomPreferenceValue(
        'vertexCustomerClasses');


    if (!empty(customerClassList)) {
        // Loop through the customer classes.
        while (i < customerClassList.length) {
            var customerClass = customerClassList[i];

            // Check if there is a customer group with the specified Id AND if
            // the user is a member of this customer group.
            if (customer.isMemberOfCustomerGroup(customerClass)) {
                var attrVals = getCustomAttributesFromGroup(customerClass);
                if (!empty(attrVals)) {
                    if (!empty(attrVals.classCode)) {
                        classCode = attrVals.classCode;
                    }

                    if (!empty(attrVals.classCodeId)) {
                        classCodeId = attrVals.classCodeId;
                    }
                }
            }

            i++;
        }
    }

    this.customerClassCode = classCode;
    this.customerClassCodeID = classCodeId;
};

/**
 * Sets up a tax request that employs a Gross or Net taxation policy depending
 * on the site setting for the Taxation Policy.
 *
 * @memberof VertexRequest
 */
VertexRequest.prototype.setupTaxRequest = function () {
    var instance = this;
    var shipmentIndex = 0;
    var customer;

    // Create the seller object - same for line-items, all shipments. // eslint-disable-line
    var seller = {
        physicalOrigin: this.shipFromAddress,
        company: this.companyCode
    };

    // Set the sum of any order level PriceAdjustments as the discount field.
    var orderDiscount = this.getOrderDiscount();
    this.discount = !empty(orderDiscount) ? orderDiscount.getDecimalValue() :
        0.0;

    // Shipments Loop
    while (this.valid && shipmentIndex < this.shipmentArray.length) {
        var shipment = this.shipmentArray[shipmentIndex];
        var paArray = [];

        if (empty(shipment.shippingAddress)) {
            this.valid = false;
            // eslint-disable-next-line no-continue
            continue;
        }

        // Get a ship-to address in the correct format for the Vertex call.
        var shippingAddress = shipment.shippingAddress;
        var shipToAddress = new VertexAddress(shippingAddress);

        // Get each type of LineItem excluding PriceAdjustments.
        var sliArray = !empty(shipment.getShippingLineItems()) ?
            shipment.getShippingLineItems().toArray() : [];
        var pliArray = !empty(shipment.getProductLineItems()) ?
            shipment.getProductLineItems().toArray() : [];
        var gcliArray = !empty(shipment.getGiftCertificateLineItems()) ?
            shipment.getGiftCertificateLineItems().toArray() : [];
        var liArray = sliArray.concat(pliArray).concat(gcliArray);

        // Get any price adjustments applied to the shipping line-items.
        // eslint-disable-next-line no-loop-func
        sliArray.forEach(function (sli) {
            var lineItemPAs = instance.getLineItemPAs(sli);
            paArray = paArray.concat(lineItemPAs);
        });

        // Get any price adjustments applied to the product line-items.
        // eslint-disable-next-line no-loop-func
        pliArray.forEach(function (pli) {
            var pliPAs = instance.getLineItemPAs(pli);
            paArray = paArray.concat(pliPAs);
        });

        // Create the customer object - same for all line-items per shipment.
        customer = {
            customerCode: {
                classCode: this.customerClassCodeID,
                value: this.customerClassCode
            },
            destination: shipToAddress
        };

        // LineItems Loop
        // eslint-disable-next-line no-loop-func
        liArray.forEach(function (lineItem, itemNumber) {
            // Create the VertexLineItem instance and push to lineItems Array.
            var vItem = new VertexLineItem(lineItem, customer, seller);
            vItem.itemNumber = itemNumber + 1;
            instance.lineItems.push(vItem);
        });

        // PriceAdjustments Loop
        // eslint-disable-next-line
        paArray.forEach(function (paObj) {
            var vAdjustment = new VertexLineItem(
                paObj.priceAdjustment, customer, seller, paObj.associatedData);
            vAdjustment.itemNumber = instance.lineItems.length + 1;
            instance.lineItems.push(vAdjustment);
        });

        shipmentIndex++;
    }
};

/**
 * Gets the XML class that gets passed to the web service call using the
 * generated classes from the WSDL call definitions, provided by the SFCC
 * Service Framework.
 *
 * @param {dw.svc.ServiceCredential} svcCredential - The ServiceCredential
 *      Object instance: vertex.http.credential.
 * @param {Object} wsRef - The webreferences2 base class for the vertex calls.
 * @returns {dw.ws.WebReference2} - Retunrs an instance of the generated
 *      VertexEnvelope class that is the base XML request object for all
 *      calls to the Vertex service.
 * @memberof VertexRequest
 */
VertexRequest.prototype.toXml = function (svcCredential, wsRef) {
    // Create the type instances which can be reused for each line item.
    var vEnvelope = new wsRef.VertexEnvelope();
    var vLogin = new wsRef.LoginType();
    var vQuotationRequest = new wsRef.QuotationRequestType();
    var wsFactory = new wsRef.ObjectFactory();
    var discount = wsFactory.createDiscountDiscountAmount(this.discount);

    var vDiscount = new wsRef.Discount();
    vDiscount.setDiscountPercentOrDiscountAmount(discount);
    vQuotationRequest.setDiscount(vDiscount);

    // Loop through the line items and get the XML class instances.
    this.lineItems.forEach(function (li) {
        vQuotationRequest.getLineItem().add(li.toXml(wsRef));
    });

    vQuotationRequest.setTransactionType(wsRef.SaleTransactionType.valueOf(
        'SALE'));

    // Get the trustedId from the credential Object's password property.
    vLogin.setTrustedId(svcCredential.password);

    // Assign the WSDL class object instances to the request object.
    vEnvelope.setLogin(vLogin);
    vEnvelope.setAccrualRequestOrAccrualResponseOrAccrualSyncRequest(
        vQuotationRequest);

    return vEnvelope;
};

module.exports = VertexRequest;
