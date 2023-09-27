'use strict';

var server = require('server');
server.extend(module.superModule);

var assets = require('*/cartridge/scripts/assets');
var BYOBHelpers = require('*/cartridge/scripts/helpers/byobHelpers');
var Site = require('dw/system/Site');
var ArrayList = require('dw/util/ArrayList');

server.append('Show', function (req, res, next) {
    var viewData = res.getViewData();
    var productList = new ArrayList(viewData.productSearch.productIds);
    var isByob = BYOBHelpers.isBYOBCategory(req.querystring.cgid);
	var settings = new Object();
	settings['page_type'] = isByob ? "1" : "6";
	settings['logged_in'] = customer.isAuthenticated();
	settings['impulse_upsell'] = !isByob;
	/*var frequencies : Object = new Object();
	var products = productList.iterator();
	while(products.hasNext()) {
		var lineItem = new Object();
		var product = products.next();
		var productID : String = product.productID;
		frequencies[productID] = "_";
	}
	settings['default_frequency'] = frequencies;*/
	viewData.productSettings = JSON.stringify(settings);

    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
