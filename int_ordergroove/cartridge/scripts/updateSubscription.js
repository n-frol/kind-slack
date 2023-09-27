'use strict';

var Bytes = require('dw/util/Bytes');
var Encoding = require('dw/crypto/Encoding');
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var HTTPService = require('dw/svc/HTTPService');
var Mac = require('dw/crypto/Mac');
var Result = require('dw/svc/Result');
var Site = require('dw/system/Site');

function updateSubscription(customerID, list) {
	var service : Service = LocalServiceRegistry.createService("OrderGroove.UpdateSubscription", {
		createRequest: function(svc : HTTPService, order, retry) {
			// HTTPS GET protocol with headers
			svc.setRequestMethod("PATCH");
			svc.addHeader("Content-Type", "application/json");
			var auth : Object = new Object();
			auth["public_id"] = Site.getCurrent().getCustomPreferenceValue("OrderGrooveMerchantID");
			var epoch : String = (Date.now() / 1000.0).toPrecision(10).toString();
            auth["ts"] = epoch;
			auth["sig_field"] = Site.getCurrent().getCustomPreferenceValue("OrderGrooveAPIUserID");

		    var encryptor : Mac = new Mac(Mac.HMAC_SHA_256);
		    var hashInput : String = Site.getCurrent().getCustomPreferenceValue("OrderGrooveAPIUserID") + "|" + epoch;
		    var hashKey : String = Site.getCurrent().getCustomPreferenceValue("OrderGrooveAPIUserHashKey");
		    var hashBytes : Bytes = encryptor.digest(hashInput, hashKey);
			var hash : String = Encoding.toBase64(hashBytes);
			auth["sig"] = hash;
            auth = JSON.stringify(auth);
            svc.addHeader("Authorization", auth);
            svc.addHeader("OG-Authorization", "True");

            svc.URL = svc.URL + list.custom.ogPublicID + '/update/'

            var payload = {
                components: []
            };

            var itemIterator = list.items.iterator();

            while (itemIterator.hasNext()) {
                var item = itemIterator.next();

                for (var i = 0; i < item.quantity; i++) {
                    payload.components.push({ product: item.productID });
                }
            }

            return JSON.stringify(payload);
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
	updateSubscription : updateSubscription
}

