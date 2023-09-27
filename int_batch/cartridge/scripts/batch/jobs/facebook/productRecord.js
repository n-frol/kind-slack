'use strict';

/**
 * facebook/productRecord.js
 *
 * Exports data model class for a product record in the Facebook product feed.
 * @module ProductRecord
 */

// SFCC API includes
var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');

/**
 * A constructor function for initializing new instances of a prouct record for
 * the Facebook product feed export job.
 *
 * @constructor
 * @param {dw.catalog.Product} product - The product used to generate the class
 *      property values of this ProductRecord instance.
 */
function ProductRecord(product) {
    var site = Site.getCurrent();
    var pCustom = product.getCustom();
    var pcType = !empty(pCustom.productType) ? pCustom.productType : '';
    var availabilityModel = product.getAvailabilityModel();
    var availabilityStatus = '';
    var priceModel = product.getPriceModel();

    var description = !empty(pCustom.productFeedDescription)
        ? pCustom.productFeedDescription
        : !empty(product.pageDescription)
        ? product.pageDescription
        : product.shortDescription;
    
    var replaceDescription = !empty(description) ? description.replace(/%26/gm, '&amp;') : description;
    var tittle = !empty(pCustom.productFeedTitle) ? pCustom.productFeedTitle : product.name + ' ' + pcType + '|' + site.name;
    var replaceTittle = !empty(tittle) ? tittle.replace(/%26/gm, '&'):tittle;
    var productName = !empty(product.name) ? product.name.replace(/%26/gm, '&amp;') : product.name;

    var price = !empty(priceModel) && priceModel.getMinPrice().available ?
        priceModel.getMinPrice().value : '';

    if ((empty(price) || price === 0) && priceModel.price.available) {
        price = priceModel.price.value;
    }

    // Get product availability data
    if (!empty(availabilityModel)) {
        availabilityStatus = availabilityModel.getAvailabilityStatus();
    }

    // Set the fallback image to the first product image.
    var image = product.getImages('large').toArray()[0];
    var imgUrl = !empty(image)
        ? image.getAbsImageURL({scaleMode: 'fit'})
        : '';

    this.id = product.ID;
    this.title = replaceTittle;
    this.description = !empty(replaceDescription) ? replaceDescription : productName;
    this.condition = !empty(pCustom.productCondition)
        ? pCustom.productCondition
        : 'new';
    this.link = URLUtils.https('Product-Show', 'pid', product.ID);
    this.image_link = !empty(pCustom.productFeedImage)
        ? pCustom.productFeedImage.getAbsImageURL({scaleMode: 'fit'})
        : !empty(imgUrl)
        ? imgUrl.toString()
        : '';
    this.brand = !empty(product.brand) ? product.brand : 'KIND';
    this.availability = !empty(availabilityStatus) ? availabilityStatus : '';
    this.price = price;
}

/**
 * Writes the model object to the specified XMLIndentingStreamWriter isntance.
 *
 * @param {dw.io.CSVStreamWriter} csvWriter - The XML writer instance
 *      that can be used to write the product attributes in the data model to an
 *      XML export file.
 * @param {string[]} exportColumns - A string array containing the titles of attribute of the
 *      instance that should be written to the feed.
 * @memberof ProductRecord
 */
ProductRecord.prototype.writeProductRow = function(csvWriter, exportColumns) {
    var instance = this;
    var writeVals = exportColumns.map(function(colName) {
        if (colName in instance && !empty(instance[colName])) {
            return instance[colName];
        } else {
            return '';
        }
    });

    csvWriter.writeNext(writeVals);
};

module.exports = ProductRecord;
