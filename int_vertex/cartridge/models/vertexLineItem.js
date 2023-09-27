/* global empty */

'use strict';

/**
 * vertexLineItem.js
 *
 * Exports a single data model class that represents a line item for a call to
 * the Vertex tax calculation web service.
 *
 * @module VertexLineItem
 */

// SFCC system class imports.
var GiftCertificateLineItem = require('dw/order/GiftCertificateLineItem');
var PriceAdjustment = require('dw/order/PriceAdjustment');
var ProductLineItem = require('dw/order/ProductLineItem');
var ProductShippingLineItem = require('dw/order/ProductShippingLineItem');
var ShippingLineItem = require('dw/order/ShippingLineItem');

/**
 * A data model class which is used for easily formatting information from the
 * SFCC LineItemCtnr instance into the correct format for the Vertex tax
 * calculation service.
 *
 * @class
 * @constructor
 * @param {dw.order.LineItem} lineItem - A line item to include in the tax
 *      calculation lookup.
 * @param {Object} customer - A customer object in the format of the
 *      CustomerType webreferences2 generated class.
 * @param {VertexAddress} customer.destination - The ship-to address instance.
 * @param {Object} seller - A seller object in the format of the SellerType
 *      webreferences2 generated class.
 * @param {Object} [associatedData] - An optional argument used to pass data
 *      for the associated item along with a PriceAdjustment in order to keep
 *      the productClass correct.
 */
function VertexLineItem(lineItem, customer, seller, associatedData) {
    var productCost = lineItem.getPriceValue();
    var productClass = '';
    this.customer = customer;
    this.seller = seller;
    this.product = {};
    this.amount = {};
    this.lineItemId = lineItem.getUUID();
    this.quantity = 1;

    // =====   ProductLineItem   ===== //
    if (lineItem instanceof ProductLineItem) {
        var product = lineItem.product;
        var quantity = lineItem.getQuantityValue();

        // Get the product cost from the ProductLineItem if available.
        if (!empty(lineItem.getPrice()) && lineItem.getPrice().available) {
            productCost = lineItem.getPrice().getValue();
        }

        // If the cost is empty then get it from the ProductPriceModel.
        if (empty(productCost)) {
            productCost = this.getPriceFromModel(lineItem);
        }

        // Try go get the product class from the original (variant) product.
        productClass = !empty(product.custom) &&
        Object.prototype.hasOwnProperty.call(product.custom,
            'productClassID') ? product.custom.productClassID : '';

        // If the product is a variant and doesn't have a product class assigned,
        // check the master product for a product class.
        if (!productClass && !empty(product.master)) {
            productClass = !empty(product.master.custom) &&
            Object.prototype.hasOwnProperty.call(product.master.custom,
                'productClassID') ? product.custom.productClassID : 'None';
        } else if (!productClass) {
            productClass = 'None';
        }

        /**
         * Vertex flavor related code block. Fallowing code used the assign flavor code from
         * product custom field, so we can use it in the vertex line item model.
         *
         * Since we have master product we also need to check master product value if the single item
         * does not exist flavor code.
         *
         */
        var vertexFlavorCode = !empty(product.custom) &&
        Object.prototype.hasOwnProperty.call(product.custom, 'vertexFlavorCode') ? product.custom.vertexFlavorCode : '';

        if (!productClass && !empty(product.master)) {
            vertexFlavorCode = !empty(product.custom) &&
            Object.prototype.hasOwnProperty.call(product.custom, 'vertexFlavorCode') ? product.custom.vertexFlavorCode : '';
        }


        this.product.productClass = productClass;
        this.product.value = lineItem.productID;
        this.quantity = quantity;
        this.flavorCode = vertexFlavorCode;


        // =====   GiftCertificateLineItem   ===== //
    } else if (lineItem instanceof GiftCertificateLineItem) {
        this.product.value = lineItem.giftCertificateID;
        this.product.productClass = 'None';

        // =====   ShippingLineItem  &  ProductShippingLineItem   ===== //
    } else if (lineItem instanceof ShippingLineItem ||
        lineItem instanceof ProductShippingLineItem
    ) {
        if (empty(productCost)) {
            productCost = lineItem.getPrice().getValue();
        }
        this.product.value = lineItem.ID;
        this.product.productClass = 'Shipping';

        // =====   PriceAdjustment   ===== //
    } else if (lineItem instanceof PriceAdjustment) {
        /** @see VertexRequest.getLineItemPAs() for assignemnt */
        this.product.value = !empty(associatedData) &&
        !empty(associatedData.paID) ? associatedData.paID :
            'PRICE_ADJUSTMENT';
        this.product.productClass = !empty(associatedData) &&
        !empty(associatedData.productClass) ?
            associatedData.productClass : 'None';
    }

    // Fallowing code allow to business to exclude from vertex tax.
    // notax code rests the vertex response and updates the line item tax with zero.
    // This code implemented with changeup code. It is required to exclude from tax service.
    this.amount.value = productClass === 'notax' ? 0.0 : productCost;
}

/**
 * Returns the LineItemQSIType instance that can be added to the request object
 * that is passed to the service call.
 *
 * @param {Object} wsRef - An instance of the webreference2 namespaced object
 *      containing all of the generated class definitions from the WSDL.
 * @returns {Object} - Returns the lineItem instance to add to the
 *      lineItems collection for the service request.
 * @memberof VertexLineItem
 */
VertexLineItem.prototype.toXml = function (wsRef) {
    // eslint-disable-next-line
    var that = this;

    // Create and set the Customer.
    var vCustomer = new wsRef.CustomerType();
    var vCustomerCode = new wsRef.CustomerCodeType();
    var vDestination = this.customer.destination.toXml(wsRef);
    vCustomerCode.setClassCode(this.customer.customerCode.classCode);
    vCustomerCode.setValue(this.customer.customerCode.value);
    vCustomer.setCustomerCode(vCustomerCode);
    vCustomer.setDestination(vDestination);

    // Create & set the Seller.
    var vSeller = new wsRef.SellerType(); // eslint-disable-line
    var vPhysicalOrigin = this.seller.physicalOrigin.toXml(wsRef);
    vSeller.setCompany(this.seller.company);
    vSeller.setPhysicalOrigin(vPhysicalOrigin);

    // Create the product and set it's attributes.
    var vProduct = new wsRef.Product();
    vProduct.setProductClass(this.product.productClass);
    vProduct.setValue(this.product.value);

    // Create the line item and assign attribute values.
    var vLineItem = new wsRef.LineItemQSIType();
    var cost = this.amount.value;
    vLineItem.setLineItemId(this.lineItemId);
    vLineItem.setLineItemNumber(this.itemNumber);
    vLineItem.setProduct(vProduct);
    vLineItem.setSeller(vSeller);
    vLineItem.setCustomer(vCustomer);
    vLineItem.setExtendedPrice(cost);

    // Set quantity.
    var vQuantity = new wsRef.MeasureType();
    vQuantity.setValue(this.quantity);
    vLineItem.setQuantity(vQuantity);

    if (Object.prototype.hasOwnProperty.call(this, 'flavorCode') && !empty(this.flavorCode)) {
        // Set FlexibleFields
        var wsFactory = new wsRef.ObjectFactory();
        var fCodeField = wsFactory.createFlexibleFieldsFlexibleCodeField();
        fCodeField.setFieldId(10);
        fCodeField.setValue(this.flavorCode);
        var vFlexibleFields = new wsRef.FlexibleFields();
        vFlexibleFields.flexibleCodeField.push(fCodeField);
        vLineItem.setFlexibleFields(vFlexibleFields);
    }
    return vLineItem;
};

/**
 * Gets the price from the ProductPriceModel of the product. This is necessary
 * if SFCC doesn't have a valid total for a ProductLineItem.
 *
 * @param {dw.order.ProductLineItem} pli - The ProductPriceModel for
 *      the line item's product.
 * @returns {number} - Returns the cost of the item as a number.
 */
VertexLineItem.prototype.getPriceFromModel = function (pli) {
    var product = pli.product;
    var priceModel = product.getPriceModel();
    var quantity = pli.getQuantity();
    var liCost;

    if (empty(priceModel) || empty(quantity)) {
        return 0;
    }

    liCost = priceModel.getPrice(quantity);
    var unitCost = !empty(liCost) && liCost.isAvailable() ?
        liCost.decimalValue : 0.0;

    return (unitCost * quantity.value);
};

module.exports = VertexLineItem;
