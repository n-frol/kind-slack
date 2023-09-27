'use strict';

/**
 * xmlExports/productRecord.js
 *
 * Exports a data model function that can be used to create instances of a product data model in the
 * format that is needed for creating product records for the Impact product feed.
 * @module ProductRecord
 */

var ShippingMgr = require('dw/order/ShippingMgr');
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

/**
 * @constructor
 * @param {dw.order.Product} product - The product record to write to the export.
 */
function ProductRecord(product) {
    var site = Site.getCurrent();
    var pCustom = product.getCustom();
    var pcType = !empty(pCustom.productType) ? pCustom.productType : '';
    var availabilityModel = product.getAvailabilityModel();
    var availabilityStatus = '';
    var inventoryLevel = 0;
    var psModel = ShippingMgr.getProductShippingModel(product);
    var defaultShipMethod = ShippingMgr.getDefaultShippingMethod();
    var shipCost = !empty(psModel) && !empty(defaultShipMethod) ?
        psModel.getShippingCost(defaultShipMethod) : null;
    var sm = {scaleMode: 'fit'};

    var priceModel = product.getPriceModel();
    var ogPrice = priceModel.getPriceBookPrice('kind-snacks-snack-club-prices').getValueOrNull();
    var price;

    if (!empty(ogPrice) && Site.current.getCustomPreferenceValue('useSnackclubPricingInFeed')) {
        price = ogPrice;
    } else {
        price = !empty(priceModel) && priceModel.price.available ?
            priceModel.price.value : '';
        // If the price is empty, attempt to get the
        if ((empty(price) || price === 0) && priceModel.price.available) {
            price = priceModel.price.value;
        }
    }

    if (empty(shipCost) && !empty(defaultShipMethod) && !empty(price)) {
        shipCost = ShippingMgr.getShippingCost(defaultShipMethod,
            priceModel.getPrice());
    }

    //Forcing shipping to right value
    var forcedship;
    if (price >= 40) {
        forcedship = 0;
    } else {
        forcedship = 7;
    }

    // Get product availability data
    if (!empty(availabilityModel)) {
        availabilityStatus = availabilityModel.getAvailabilityStatus();
        inventoryLevel = availabilityModel.getInventoryRecord();
    }

    // Set the fallback image to the first product image.
    var image = product.getImages('large').toArray()[0];
    var imgUrl = !empty(image) ? image.getAbsImageURL(sm) : '';

    this.title = !empty(pCustom.productFeedTitle) ? pCustom.productFeedTitle :
        (product.name + ' ' + pcType + '|' + site.name);
    this.description = !empty(pCustom.productFeedDescription) ?
        pCustom.productFeedDescription :
        (!empty(product.pageDescription) ? product.pageDescription :
        product.shortDescription);
    this.condition = 'new';
    this.link = URLUtils.https('Product-Show', 'pid', product.ID);
    this.category_hierarchy = this.getProductCategoryHierarchy(product);
    this.image_link = !empty(pCustom.productFeedImage) ?
        (pCustom.productFeedImage.getAbsImageURL(sm).toString()) :
        (!empty(imgUrl) ? imgUrl.toString() : '');
    this.brand = !empty(product.brand) ? product.brand : 'KIND';
    this.gtin = !empty(product.UPC) ? product.UPC.trim() : '';
    this.availability = !empty(availabilityStatus) ? availabilityStatus : '';
    this.invetory_level = inventoryLevel;
    this.is_bundle = product.bundle ? 'yes' : 'no';
    this.advertised_price = price;
    this.shipping_price = forcedship;
    this.shipping_weight = !empty(pCustom.weight) ? pCustom.weight : '';
    this.custom_label_0 = !empty(pCustom.productFeedLabel) ?
        pCustom.productFeedLabel : '';
    this.custom_label_1 = !empty(pCustom.productFeedLabel1) ?
        pCustom.productFeedLabel1 : '';
    this.custom_label_2 = !empty(pCustom.productFeedLabel2) ?
        pCustom.productFeedLabel2 : '';
    this.unit_base_pricing_measure = !empty(pCustom.unitBaseMeasure) ?
        pCustom.unitBaseMeasure : '';
    this.unit_pricing_measure = !empty(pCustom.unitMeasure) ?
        pCustom.unitMeasure : '';
    this.google_product_category = !empty(pCustom.googleProductCategory) &&
        !empty(pCustom.googleProductCategory[0]) ?
        pCustom.googleProductCategory[0] : '';

    // Empty Tags in XML export
    this.npm = '';                          // Empty tag
    this.sale_price = '';                   // Empty tag
    this.sale_price_effective_date = '';    // Empty tag
    this.google_merchant_id = '';           // Empty tag

    this.setClassFields(product);
}

/**
 * A recursive method for getting all the parent categories of a catalog
 * category.
 *
 * @memberof ProductRecord
 * @param {dw.catalog.Category} category - The SFCC Category class instance.
 * @returns {string} - Returns the string to use for reporting the specified
 *      category with the seperator.
 */
ProductRecord.prototype.getCategoryParents = function(category) {
    var catString = !empty(category.displayName) ? category.displayName : category.ID;

    if (empty(category.parent) || category.topLevel) {
        return ' > ' + catString;
    } else {
        return this.getCategoryParents(category.parent) + ' > ' + catString;
    }
};

/**
 * Sets the class constants in an overridable method so the main constructor
 * doesn't need to be overriden.
 *
 * @memberof ProductRecord
 */
ProductRecord.prototype.setClassFields = function() {
    // Define class constants

    /**
     * @member {string[]} CDATA_FIELDS - Class constant defining the fields that
     *      need to be endoded as CDATA type XML tags.
     */
    this.CDATA_FIELDS = [
        'title',
        'description',
        'category_hierarchy',
        'custom_label_0',
        'custom_label_1',
        'custom_label_2',
        'google_product_category'
    ];
};

/**
 * Gets a string representing the Product instance's hierarchy for reporting in the product feed.
 *
 * @memberof ProductRecord
 * @param {dw.catalog.Product} product - The SFCC product record.
 * @returns {string} - Returns a string representing the Product's category assignment.
 */
ProductRecord.prototype.getProductCategoryHierarchy = function(product) {
    var hierarchy = 'Products';
    var primary = product.primaryCategory;
    var classification = product.classificationCategory;

    // Build the category array.
    if (!empty(classification)) {
        hierarchy += this.getCategoryParents(classification);
    } else if (!empty(primary)) {
        hierarchy += this.getCategoryParents(primary);
    }

    return hierarchy;
};

/**
 * Writes the model object to the specified XMLIndentingStreamWriter isntance.
 *
 * @param {dw.io.XMLIndentingStreamWriter} xmlWriter - The XML writer instance
 *      that can be used to write the product attributes in the data model to an
 *      XML export file.
 * @memberof ProductRecord
 */
ProductRecord.prototype.writeAsXml = function (xmlWriter) {
    var instance = this;
    var keys = Object.keys(instance);


    xmlWriter.writeStartElement('item');

    keys.forEach(function (key) {
        if (instance.CDATA_FIELDS.indexOf(key) > -1) {
            xmlWriter.writeStartElement(key);

            // Add value as a CData tag if not empty.
            if (!empty(instance[key])) {
                xmlWriter.writeCData(instance[key]);
            }

            xmlWriter.writeEndElement();
        } else if (typeof instance[key] === 'string' ||
            typeof instance[key] === 'number' ||
            typeof instance[key] === 'boolean'
        ) {
            xmlWriter.writeStartElement(key);
            xmlWriter.writeCharacters(instance[key]);
            xmlWriter.writeEndElement();
        }
    });

    xmlWriter.writeEndElement();
};

module.exports = ProductRecord;
