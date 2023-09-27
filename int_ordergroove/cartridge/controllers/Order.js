'use strict';

var server = require('server');
server.extend(module.superModule);

var assets = require('*/cartridge/scripts/assets');
var Site = require('dw/system/Site');

server.append('Confirm', function (req, res, next) {
    var viewData = res.getViewData();
	var settings : Object = new Object();
	settings['page_type'] = "4";
	viewData.productSettings = JSON.stringify(settings);
	viewData.isConfirmStage = true;
    res.setViewData(viewData);
    next();
});

module.exports = server.exports();
