'use strict';

/**
 * adlucent/productRecord.js
 *
 * Exports a data model function that can be used to create instances of a product data model in the
 * format that is needed for creating product records for the Impact product feed.
 * @module ProductRecord
 */

// Imports
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

    // Adlucent overrides
    this.sku = !empty(product.ID) ? product.ID : '';
    this.product_url = URLUtils.https('Product-Show', 'pid', product.ID).toString();

    // Self closing tag
    this.product_type = '';
};

module.exports = ProductRecord;