'use strict';

/**
 * impact/productRecord.js
 *
 * Exports a data model function that can be used to create instances of a product data model in the
 * format that is needed for creating product records for the Impact product feed.
 * @module ProductRecord
 */

// Imports
var ProductAvailabilityModel = require('dw/catalog/ProductAvailabilityModel');
var URLUtils = require('dw/web/URLUtils');
var ProductRecord = require('*/cartridge/scripts/batch/jobs/xmlExports/productRecord');

/**
 * Sets the class constants and overrides.
 * @param {dw.catalog.Product} product - The SFCC product instance to write to
 *      the XML export file.
 */
ProductRecord.prototype.setClassFields = function(product) {
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

    // Impact specific field value overrides.
    var pCustom = product.getCustom();
    var pcType = !empty(pCustom.productType) ? pCustom.productType : '';
    this.id = !empty(product.ID) ? product.ID : '';
    this.link = URLUtils.https('Product-Show', 'pid', product.ID).toString();
    this.product_type = pcType;

    if (this.availability === ProductAvailabilityModel.AVAILABILITY_STATUS_IN_STOCK) {
        this.availability = 'In Stock';
    }
};

module.exports = ProductRecord;
