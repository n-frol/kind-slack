'use strict';

var server = require('server');
server.extend(module.superModule);

var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var sessionFlash = require('*/cartridge/scripts/util/sessionFlash');

server.get(
	    'MSI',
	    server.middleware.https,
	    userLoggedIn.validateLoggedIn,
	    consentTracking.consent,
	    function (req, res, next) {
	        var Resource = require('dw/web/Resource');
	        var URLUtils = require('dw/web/URLUtils');
	        var reportingUrlsHelper = require('*/cartridge/scripts/reportingUrls');
	        var reportingURLs;

	        res.render('account/mySubscriptionInterface', {
	            breadcrumbs: [
	                {
	                    htmlValue: Resource.msg('global.home', 'common', null),
	                    url: URLUtils.home().toString()
	                },
	                {
	                    htmlValue: Resource.msg('page.title.msi', 'account', null),
	                    url: URLUtils.url('Account-MSI').toString()
	                }
	            ],
	            reportingURLs: reportingURLs,
	            flash: sessionFlash.getFlashMessage('subscriptionUpdated')
	        });
	        next();
	    }
	);

server.append('SaveProfile', function (req, res, next) {
	this.on('route:Complete', function (req, res) { // eslint-disable-line no-shadow
		var viewData = res.getViewData();
		if(viewData.success !== false) {
			var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
			var service = LocalServiceRegistry.createService("OrderGroove.CustomerUpdate", {
				createRequest: function(svc) {
					var email = customer.getProfile().getEmail();
					var customerNo = customer.getProfile().getCustomerNo();
					var epoch = (Date.now() / 1000.0).toPrecision(10).toString();
					var Mac = require('dw/crypto/Mac');
				    var encryptor = new Mac(Mac.HMAC_SHA_256);
				    var hashInput = customerNo + "|" + epoch;
				    var Site = require('dw/system/Site');
				    var hashKey = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantHashKey');
				    var hashBytes = encryptor.digest(hashInput, hashKey);
				    var Encoding = require('dw/crypto/Encoding');
					var hash = Encoding.toURI(Encoding.toBase64(hashBytes));
					var request : Object = new Object();
					request['merchant_id'] = Site.getCurrent().getCustomPreferenceValue('OrderGrooveMerchantID');
					var userRequest : Object = new Object();
					userRequest['user_id'] = customerNo;
					userRequest['ts'] = epoch;
					userRequest['sig'] = hash;
					userRequest['new_email'] = email;
					request['user'] = userRequest;
					var payload : String = "update_request=" + JSON.stringify(request, null, 5);
					return payload;
				},
			    parseResponse : function(svc, response) {
			    	return response;
			    }
			});
			var Result = require('dw/svc/Result');
			var result = service.call();
			var response = new String();
			if(result.getStatus() == Result.OK) {
				response = result.getObject().getText();
			} else {
				response = result.getErrorMessage();
			}
		}
	});
    next();
});

module.exports = server.exports();
