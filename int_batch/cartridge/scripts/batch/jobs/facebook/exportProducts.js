/* global empty */

'use strict';

/**
 * exportProducts.js
 *
 * Process all orders with the custom attribute 'includeInProductFeed' set to
 * true, and export their data as an XML export file to the specified directory.
 */

// SFCC API imports
var CSVStreamWriter = require('dw/io/CSVStreamWriter');
var FileWriter = require('dw/io/FileWriter');
var Logger = require('dw/system/Logger');
var ProductMgr = require('dw/catalog/ProductMgr');
var Status = require('dw/system/Status');

// Module level declarations
var FacebookHelpers = require('*/cartridge/scripts/batch/jobs/facebook/facebookHelpers');
var ProductRecordModel = require('*/cartridge/scripts/batch/jobs/facebook/productRecord');
var log = Logger.getLogger('int_batch');
var products;
var fileWriter;
var csvWriter;
var csvFile;

/** @constant - The names of the columns to write in the export file. */
var EXPORT_COLUMNS = [
    'id',
    'title',
    'description',
    'condition',
    'link',
    'image_link',
    'brand',
    'availability',
    'price'
];

/* Exported Job-Step Functions
   ========================================================================== */

/**
 * Initializes resources and sets the base elements of the XML export file.
 *
 * @param {Object} args - An arguments object that contains any parameters that
 *      have been configured in BM for this Job Step.
 * @returns {Status} - Returns a status that indicates the success or failure of
 *      the job step.
 */
exports.beforeStep = function(args) {
    csvFile = FacebookHelpers.getExportFile(args);

    // If unable to get the file then return an error.
    if (empty(csvFile)) {
        return new Status(Status.ERROR);
    }

    // Create the FileWriter & XMLStreamWriter instances.
    fileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(fileWriter);

    // Get the site products.
    products = ProductMgr.queryAllSiteProducts();

    // Create the CSV files header row
    csvWriter.writeNext(EXPORT_COLUMNS);
};

/**
 * Gets the total count of products that match the criteria specified.
 *
 * @returns {number} - Returns the count of products in the products
 *      SeekableIterator instance.
 */
exports.getTotalCount = function() {
    return products.count;
};

/**
 * Reads the next product in the stream.
 *
 * @returns {dw.catalog.Product|undefined} - Returns the next product from the
 *      Iterator object, or undefined if not product is found.
 */
exports.read = function() {
    if (products.hasNext()) {
        var product = products.next();
        log.info('Reading Prodcut: {0}', product.ID);
        return product;
    } else {
        products.close();
    }
    return undefined;
};

/**
 * Gets the next product in the SeekableIterator and any variant products,
 * assigns all of the needed product attributes to an object literal, and pushes
 * the object instance to the list of products.
 *
 * @param {dw.catalog.Product} product - Product returned from the read setp.
 * @returns {ProductRecordModel[]|undefined} - Returns an array of
 *      ProductRecordModel instances.
 */
exports.process = function(product) {
    var productLines = [];

    if (product.isOnline() &&
        'includeInProductFeed' in product.custom &&
        product.custom.includeInProductFeed === true
    ) {
        productLines.push(new ProductRecordModel(product));
    }

    log.debug('Product Lines Processed: {0}', JSON.stringify(productLines));
    return productLines;
};

/**
 * Writes each product record to the XML file.
 *
 * @param {List<ProductRecordModel[]>} chunk - An array of productRecordModel
 *      class instances.
 */
exports.write = function(chunk) {
    var i = 0;
    while (i < chunk.size()) {
        var j = 0;
        var chunklet = chunk.get(i);
        while (j < chunklet.length) {
            var productRecord = chunklet[j];
            productRecord.writeProductRow(csvWriter, EXPORT_COLUMNS);
            j++;
        }
        i++;
    }
};

/**
 * Completes the writing of any data still in the write queue.
 */
exports.afterChunk = function() {
    fileWriter.flush();
};

/**
 * Life cycle event for the configured Job Step for cleanup of resources after executing the export
 * writing portion of the job.
 */
exports.afterStep = function() {
    // Clean-up resources
    fileWriter.flush();
    csvWriter.close();
    fileWriter.close();
};
