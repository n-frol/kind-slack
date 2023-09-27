'use strict';

/**
 * @namespace Product
 */

var server = require('server');
server.extend(module.superModule);

var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
server.append('Show',function (req, res, next) {
    var ProductMgr = require('dw/catalog/ProductMgr');
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var productHelper = require('*/cartridge/scripts/helpers/productHelpers');

    var showProductPageHelperResult = productHelper.showProductPage(req.querystring, req.pageMetaData);
    var productCat = ProductMgr.getProduct(showProductPageHelperResult.product.id);
    var showCategory = CatalogMgr.getCategory(productCat.primaryCategory ? productCat.primaryCategory.ID : productCat.getMasterProduct().getPrimaryCategory().ID);
    
    var config = require('~/cartridge/models/config').getConfig();
            res.render(showProductPageHelperResult.template, {
                changeup : config,
                productDonation : showCategory.custom.salesUpliftDonation
            });
    next();
}, pageMetaData.computedPageMetaData);
module.exports = server.exports();
