'use strict';

var Bytes = require('dw/util/Bytes');
var Encoding = require('dw/crypto/Encoding');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var HTTPService = require('dw/svc/HTTPService');
var Mac = require('dw/crypto/Mac');
var Result = require('dw/svc/Result');
var Site = require('dw/system/Site');

function changeProduct(customerID, list, productID) {
	var service : Service = LocalServiceRegistry.createService("OrderGroove.ChangeProduct", {
		createRequest: function(svc : HTTPService) {
			// HTTPS GET protocol with headers
			svc.setRequestMethod("PATCH");
			svc.addHeader("Content-Type", "application/json");

			// Set auth 
			var auth : Object = new Object();
			auth["public_id"] = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantID");
			var epoch : String = (Date.now() / 1000.0).toPrecision(10).toString();
			auth["ts"] = epoch;
			auth["sig_field"] = customerID;

			var encryptor : Mac = new Mac(Mac.HMAC_SHA_256);
			var hashInput : String = customerID + "|" + epoch;
			var hashKey : String = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantHashKey");
			var hashBytes : Bytes = encryptor.digest(hashInput, hashKey);
			var hash : String = Encoding.toBase64(hashBytes);

			auth["sig"] = hash;
			auth = JSON.stringify(auth);

			svc.addHeader("Authorization", auth);

			svc.URL = svc.URL + list.custom.ogPublicID + '/change_product/';

			return JSON.stringify({
				"product": productID
			});;
	    },
		// Mock function expects an object with particular properties but it is not documented in the API
		mockCall: function(svc : HTTPService, request){
			var response : Object = new Object();
			response["statusCode"] = 201;
			response["statusMessage"] = "Success";
			return response;
		},
		// Parse function only called for a status code in the 200s
		parseResponse : function(svc : HTTPService, response) {
			return response;
		}
    });

    var response : Result = service.call();
    return response;
};

/* Module exports for controllers and jobs */
module.exports = {
	changeProduct : changeProduct
}

