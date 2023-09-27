'use strict';

/**
 * OrderGroove Write Feeds
 * Used to send product and category feeds to the OrderGroove SFTP location.
 */

/* API Includes */
var Logger = require('dw/system/Logger');
var File = require('dw/io/File');
var Site = require('dw/system/Site');
var CatalogMgr = require('dw/catalog/CatalogMgr');
var Iterator = require('dw/util/Iterator');
var FileWriter = require('dw/io/FileWriter');
var XMLIndentingStreamWriter = require('dw/io/XMLIndentingStreamWriter');
var Category = require('dw/catalog/Category');
var Status = require('dw/system/Status');
var Service = require('dw/svc/Service');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var FTPService = require('dw/svc/FTPService'); // also represents SFTP
var Result = require('dw/svc/Result');
var ProductMgr = require('dw/catalog/ProductMgr');
var SeekableIterator = require('dw/util/SeekableIterator');
var Product = require('dw/catalog/Product');
var MediaFile = require('dw/content/MediaFile');
var StringUtils = require('dw/util/StringUtils')

/* Service function to upload file in the SFTP location */
function uploadFeed(filePath, remoteName) {
	var localFile = new File(filePath);
	var service = LocalServiceRegistry.createService("OrderGroove.UploadFeed", {
		createRequest: function(svc) {
			svc.setAutoDisconnect(true);
			var remotePath = "/incoming/" + Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantID') + "." + remoteName + ".xml";
			svc.setOperation("putBinary", remotePath, localFile);
		},
	    parseResponse : function(svc, response) {
	    	return response;
	    }
	});
	var result = service.call();
	return result;
}

/* Recursion function for gathering sub-categories of every parent category */
function writeSubCategories(categories, xisw) {
	while(categories.hasNext()) {
		var category = categories.next();
		if(!empty(category) && !empty(category.getID())) {
			xisw.writeStartElement("Category");
				xisw.writeStartElement("ID");
					xisw.writeCharacters(category.getID());
				xisw.writeEndElement();
				xisw.writeStartElement("Name");
					xisw.writeCData(!empty(category.getDisplayName()) ? category.getDisplayName() : '');
				xisw.writeEndElement();
				var subCategories = category.getOnlineSubCategories().iterator();
				writeSubCategories(subCategories, xisw);
			xisw.writeEndElement();
		}
	}
	return;
}

/* Job process function */
function writeCategories() {
	var log = Logger.getLogger("order-groove", "OG");
	try {
		var dir = new File(File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "catalog-feeds");
		if(!dir.isDirectory()) {
			dir.mkdir();
		}
		var output = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantID') + ".ProductCategories.xml";
		var file = new File(dir, output);
		var categories = CatalogMgr.getSiteCatalog().getRoot().getOnlineSubCategories().iterator();
		var writer = new FileWriter(file);
		var xisw = new XMLIndentingStreamWriter(writer);
		xisw.setIndent("\t");
		xisw.writeStartElement("Categories");
			xisw.writeStartElement("MerchantPublicID");
				xisw.writeCharacters(Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantID'));
			xisw.writeEndElement();
			writeSubCategories(categories, xisw);
		xisw.writeEndElement();
		xisw.flush();
		xisw.close();
		writer.flush();
		writer.close();
		var exportPath = file.getFullPath();
		var result = uploadFeed(exportPath, "ProductCategories");
		if(result.status == 'OK') {
			return new Status(Status.OK);
		} else {
			return new Status(Status.ERROR, "ERROR", result.getErrorMessage());
		}
	} catch(e) {
		var error = e;
		log.error(error.toString());
		return new Status(Status.ERROR, "ERROR", error.toString());
	}
}

/**
 *
 * @param { dw.catalog.Product} product
 * @return {string} Subscription Name
 */
function namingConvention(product) {
    var name = product.getName();
    var classificationCategory = ''
    if(!empty(product.getClassificationCategory())) {
        classificationCategory = StringUtils.format(' - {0}', product.getClassificationCategory().getDisplayName());
    }
    var size = Object.hasOwnProperty.call(product.custom, 'totalItemQuantity') ?
        StringUtils.format(' - {0} count',product.custom.totalItemQuantity) : '';

   return StringUtils.format('{0}{1}{2}', name, classificationCategory, size);
}

/* Job process function */
function writeProducts() {
	var log = Logger.getLogger("order-groove", "OG");
	try {
		var dir = new File(File.IMPEX + File.SEPARATOR + "src" + File.SEPARATOR + "catalog-feeds");
		if(!dir.isDirectory())
			dir.mkdir();
		var output = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantID') + ".Products.xml";
		var file = new File(dir, output);
		var products = ProductMgr.queryAllSiteProductsSorted();
		var writer = new FileWriter(file);
		var xisw = new XMLIndentingStreamWriter(writer);
		xisw.setIndent("\t");
		xisw.writeStartElement("products");
		while(products.hasNext()) {
			var product = products.next();
			var productName = namingConvention(product);
	        if(!empty(product) && product.isOnline() && !product.isMaster()) {
				xisw.writeStartElement("product");
					xisw.writeStartElement("name");
						xisw.writeCData(productName);
					xisw.writeEndElement();
					xisw.writeStartElement("product_id");
						xisw.writeCharacters(product.getID());
					xisw.writeEndElement();
					xisw.writeStartElement("sku");
						xisw.writeCharacters(product.getID());
					xisw.writeEndElement();
					xisw.writeStartElement("groups");
					var salePrice = product.getPriceModel().getPriceBookPrice("kind-snacks-list-prices").getValue().toFixed(2);
					if (salePrice > 0 && product.custom.eligibility) {
						xisw.writeStartElement("group");
						xisw.writeAttribute("type", "eligibility");
						xisw.writeCData("reorder");
						xisw.writeEndElement();
					}
					if(product.isAssignedToSiteCatalog() && !product.custom.disableSkuSwap) {
						var primaryCategory = '';

						if (!empty(product.getPrimaryCategory())) {
							primaryCategory = product.getPrimaryCategory().getDisplayName();
						} else if (product.isVariant() && !empty(product.getVariationModel()) && !empty(product.getVariationModel().getMaster()) && !empty(product.getVariationModel().getMaster().getPrimaryCategory())) {
							primaryCategory = product.getVariationModel().getMaster().getPrimaryCategory().getDisplayName();
						}

						if (!empty(primaryCategory)) {
							xisw.writeStartElement("group");
								xisw.writeAttribute("type", "sku_swap");
									xisw.writeCData(primaryCategory);
							xisw.writeEndElement();
						}
					}
					if(!empty(product.describe().getCustomAttributeDefinition('autoShipDiscount')) && !empty(product.getCustom().autoShipDiscount)) {
						var percentage = product.getCustom().autoShipDiscount;
						xisw.writeStartElement("group");
						xisw.writeAttribute("type", "incentive");
							xisw.writeCharacters(percentage);
						xisw.writeEndElement();
					}
					xisw.writeEndElement();
					var salePrice = product.getPriceModel().getPriceBookPrice("kind-snacks-list-prices").getValue().toFixed(2);
					xisw.writeStartElement("price");
						xisw.writeCharacters(salePrice);
					xisw.writeEndElement();
					var productURL = dw.web.URLUtils.https("Product-Show", "pid", product.getID()).toString();
					xisw.writeStartElement("details_url");
						xisw.writeCharacters(productURL);
					xisw.writeEndElement();
					// Image can possibly be unset
					var imageURL = '';
					if (!empty(product.getImage("large"))) {
						imageURL = product.getImage("large").getHttpsURL().toString();
					}
					xisw.writeStartElement("image_url");
						xisw.writeCharacters(imageURL);
					xisw.writeEndElement();
				if(!empty(product.describe().getCustomAttributeDefinition('autoShipEligible'))) {
					var autoShipEligible = Boolean(product.getCustom().autoShipEligible);
					var eligible = autoShipEligible ? "1" : "0";
					xisw.writeStartElement("autoship_eligible");
						xisw.writeCharacters(eligible);
					xisw.writeEndElement();
				}
					var inStock = product.getAvailabilityModel().isOrderable() ? "1" : "0";
					xisw.writeStartElement("in_stock");
						xisw.writeCharacters(inStock);
					xisw.writeEndElement();
				if(!empty(product.describe().getCustomAttributeDefinition('discontinued'))) {
					var discontinued = Boolean(product.getCustom().discontinued);
					var deprecated = discontinued ? "1" : "0";
					xisw.writeStartElement("discontinued");
						xisw.writeCharacters(deprecated);
					xisw.writeEndElement();
				}
					var categories = product.isVariant() ? product.getVariationModel().getMaster().getOnlineCategories().iterator() : product.getOnlineCategories().iterator();
					xisw.writeStartElement("categories");
					while(categories.hasNext()) {
						var category = categories.next();
				        if(!empty(category)) {
							xisw.writeStartElement("category");
								xisw.writeCData(category.getID());
							xisw.writeEndElement();
				        }
					}
					xisw.writeEndElement();
				xisw.writeEndElement();
	        }
		}
		xisw.writeEndElement();
		xisw.flush();
		xisw.close();
		writer.flush();
		writer.close();
		var exportPath = file.getFullPath();
		var result = uploadFeed(exportPath, "Products");
		if(result.status == 'OK') {
			return new Status(Status.OK);
		} else {
			return new Status(Status.ERROR, "ERROR", result.getErrorMessage());
		}
	} catch(e) {
		var error = e;
		log.error(error.toString());
		return new Status(Status.ERROR, "ERROR", error.toString());
	}
}

/* Module exports for jobs */
module.exports = {
	writeCategoryFeed : writeCategories,
	writeProductFeed : writeProducts
}
