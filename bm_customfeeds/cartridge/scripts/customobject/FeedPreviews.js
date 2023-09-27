'use strict';

/**
 * feeds preview module generates sample feed. It is used in UI
 */

function generatePreview() {
    
    var templateName = request.httpParameterMap.feed.stringValue;
    var previewId = request.httpParameterMap.pid.stringValue;
    var feedContext = request.httpParameterMap.feedContext.stringValue;
    var feedPreviewFormat = request.httpParameterMap.feedPreviewFormat.stringValue;
    
    if ('' === previewId) {
        getCSVExportHandler();
        return 'Please, select object id to preview!';
    }
    
    var CustomObjectMgr = require('dw/object/CustomObjectMgr');
    
    var co = CustomObjectMgr.getCustomObject('CustomFeedConfig', templateName);
    
    if (co == null) {
        return 'Configuration object for this feed is not found!';
    }
    
    var CSVExportHandler = require('int_customfeeds/cartridge/scripts/export/handlers/CSVExportHandler.ds').CSVExportHandler;
    var TemplateExportHandler = require('int_customfeeds/cartridge/scripts/export/handlers/TemplateExportHandler.ds').TemplateExportHandler;
    var StringWriter = require('dw/io/StringWriter');
    
    var writer = new StringWriter();
    var handler = null;
    
    switch (feedPreviewFormat) {
        case 'XML':
            handler = new TemplateExportHandler(writer, co.custom.configuration, feedContext);
            break;
        case 'CSV':
            var Reader = require('dw/io/Reader');
            var lines = new Reader(co.custom.configuration);
            var config = {
                separator : ','
            };
            var line;
            while ((line = lines.readLine()) != null) {
                if (0 === line.indexOf('separator ')) {
                    config.separator = line.substring(10);
                } else if (!config.fields) {
                    // use first line as fields
                    config.fields = line.split(config.separator);
                } else if (!config.header) {
                    // if there are more lines, we previously
                    // read the header
                    config.header = config.fields;
                    config.fields = line.split(config.separator);
                }
            }
            handler = new CSVExportHandler(writer, config.separator, config.fields, config.header, feedContext);
            break;
    }
    
    switch (feedContext) {
        case 'Catalog':
            var ProductMgr = require('dw/catalog/ProductMgr');
            var product = ProductMgr.getProduct(previewId);
            
            if (handler != null) {
                handler.beginExport();
                handler.exportProduct(product);
                handler.endExport();
                writer.close();
                
                return writer.toString();
            }
            
            return 'Unexpected error! Please check the logs.';
        case 'Order':
            var OrderMgr = require('dw/order/OrderMgr');
            var order = OrderMgr.getOrder(previewId);
            
            if (handler != null) {
                handler.beginExport();
                handler.exportOrder(order);
                handler.endExport();
                writer.close();
                
                return writer.toString();
            }
            
            return 'Unexpected error! Please check the logs.';
        case 'Customer':
            var CustomerMgr = require('dw/customer/CustomerMgr');
            var customer = CustomerMgr.getCustomerByCustomerNumber(previewId);
            
            if (handler != null) {
                handler.beginExport();
                handler.exportProfile(customer.profile);
                handler.endExport();
                writer.close();
                
                return writer.toString();
            }
            
            return 'Unexpected error! Please check the logs.';
    }
}

exports.GeneratePreview = generatePreview;
