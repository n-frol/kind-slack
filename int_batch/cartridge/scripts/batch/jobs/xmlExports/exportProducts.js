'use strict';

/**
 * xmlExports/exportProducts.js
 *
 * Exports the functions for a chunk type job step to be used in processing the product feed data
 * for the Impact & Adlucent product feed.
 */

// SFCC API imports
var FileWriter = require('dw/io/FileWriter');
var Logger = require('dw/system/Logger');
var ProductMgr = require('dw/catalog/ProductMgr');
var Status = require('dw/system/Status');
var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');

// Module imports
var ExportHelpers = require('*/cartridge/scripts/batch/jobs/xmlExports/exportHelpers');
var ProductRecordModel;

var log = Logger.getLogger('int_batch', 'int_batch');
var products;
var fileWriter;
var xmlWriter;
var xmlFile;

/* Exported Job-Step Functions
   ========================================================================== */

/**
 * Initializes resources and sets the base elements of the XML export file.
 *
 * @param {Object} args - An arguments object that contains any parameters that
 *      have been configured in BM for this Job Step.
 * @param {boolean} args.addTimeStampToFileName - A flag indicating if a
 *      date should be added to the end of the name of the export file.
 * @param {string} args.directory - The directory within the IMPEX folder of the
 *      SFCC instance where the export file will be created.
 * @param {string} args.fileName - The name that will be used to create the XML
 *      export file within the specified directory.
 * @param {string} args.jobName - The name of the feed that is being created
 *      (i.e. 'impact' or 'adlucent'). This should correspond to the name of the
 *      directory that the override of the productRecord.js data class is
 *      located in. This class defines any attributes of the product record that
 *      are not the same as the base model.
 * @returns {Status} - Returns a status that indicates the success or failure of
 *      the job step.
 */
exports.beforeStep = function (args) {
    xmlFile = ExportHelpers.getExportFile(args);
    ProductRecordModel = ExportHelpers.getProductClass(args);

    // If unable to get the file then return an error.
    if (empty(xmlFile)) {
        return new Status(Status.ERROR);
    }

    // Create the FileWriter & XMLStreamWriter instances.
    fileWriter = new FileWriter(xmlFile);
    xmlWriter = new XMLIndentingStreamWriter(fileWriter);
    xmlWriter.setIndent('\t');

    // Write the XML version & encoding as 1.0 & utf-8
    xmlWriter.writeStartDocument();

    // Get the site products.
    products = ProductMgr.queryAllSiteProducts();

    // Create the base XML start node to add the products to.
    xmlWriter.writeStartElement('rss');
    xmlWriter.writeNamespace('g', 'http://base.google.com/ns/1.0');
    xmlWriter.writeAttribute('version', '2.0');

    // Create the <channel> element to hold the product (<item>) tags.
    xmlWriter.writeStartElement('channel');
};

/**
 * Gets the total count of products that match the criteria specified.
 *
 * @returns {number} - Returns the count of products in the products
 *      SeekableIterator instance.
 */
exports.getTotalCount = function () {
    return products.count;
};

/**
 * Reads the next product in the stream.
 *
 * @returns {dw.catalog.Product|undefined} - Returns the next product from the
 *      Iterator object, or undefined if not product is found.
 */
exports.read = function () {
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
exports.process = function (product) {
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
exports.write = function (chunk) {
    var i = 0;
    while (i < chunk.size()) {
        var j = 0;
        var chunklet = chunk.get(i);
        while (j < chunklet.length) {
            var productRecord = chunklet[j];
            productRecord.writeAsXml(xmlWriter);
            j++;
        }
        i++;
    }
};

/**
 * Completes the writing of any data still in the write queue.
 */
exports.afterChunk = function () {
    xmlWriter.flush();
    fileWriter.flush();
};

exports.afterStep = function () {
    // </channel>
    xmlWriter.writeEndElement();

    // </rss>
    xmlWriter.writeEndElement();

    // Finish any unclosed tags.
    xmlWriter.writeEndDocument();

    // Close resources.
    xmlWriter.flush();
    fileWriter.flush();
    xmlWriter.close();
    fileWriter.close();
};


