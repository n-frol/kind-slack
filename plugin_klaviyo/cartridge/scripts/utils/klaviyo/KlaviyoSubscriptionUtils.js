'use strict';

/* Script Modules */
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');
var ServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Transaction = require('dw/system/Transaction');
var apiKey = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');
// Fred added site level configuration
var newsLetterId = Site.getCurrent().getCustomPreferenceValue('klaviyo_subscribelist');


/**
 * ===================================== Dev Note ============================================
 * Dont use any more this service file, maintain the klavioService.js file
 * ===========================================================================================
 */


/**
 * Uses the post subscribe list API call per
 * https://www.klaviyo.com/docs/api/v2/lists#post-subscribe
 * to subscribe an email to a subscription list.
 *
 * @param email
 * @returns
 */
function subscribeToList (email, source) {

	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - subscribeToList()');

	try {
		var subscriptionStatus = false;

		if(checkSubscription(email, source)) {
			return false;
		}
		var jsonData = prepareSubscribePayload(email, source);
		var result = KlaviyoSubscriptionService.call(jsonData);
		var resultObj = JSON.parse(result.object);
		if(!empty(resultObj)) {
			var response = resultObj[0];
			if (!empty(response) && response.email == email) {
				subscriptionStatus = true;
			} else {
				logger.error('subscribeToList() failed for ' + email + '. Error from Klaviyo. Response: ' + resultObj);
				return;
			}
		}

		return subscriptionStatus;
	} catch(e) {
		logger.error('subscribeToList() failed for ' + email + 'at source ' + source + ' .Error: ' +  e.message);
		return;
	}

}

/**
 * Prepares subscribe payload per https://www.klaviyo.com/docs/api/v2/lists#post-subscribe
 * @param email
 * @returns
 */
function prepareSubscribePayload (email, source) {

	var jsonData = {};
	var profiles = [];

	jsonData.api_key = apiKey;
	jsonData.profiles = profiles;
	var profileData = {};
	profileData.email = email;
	if (!empty(source)) {
		profileData.source = source;
	}
	jsonData.profiles.push(profileData);

	return JSON.stringify(jsonData);

}

function optOutWholesale(args)
{
    var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - optOutWholesale()');
    var jsonData = {};
    jsonData.api_key = apiKey;
    jsonData.profiles = [];
    var profileData = {};
    profileData.email = args.email;
    profileData.source = args.source;
    profileData.optout_wholesale = true;
    profileData.event = "Opted Out of Wholesale";
    jsonData.profiles.push(profileData);
    var result = KlaviyoSubscriptionService.call(JSON.stringify(jsonData));
    var resultObj = JSON.parse(result.object);
    if(!empty(resultObj)) {
        var response = resultObj[0];
        if (!empty(response) && response.email == args.email) {
            return true;
        } else {
            logger.error('optOutWholesale() failed for ' + args.email + '. Error from Klaviyo. Response: ' + resultObj);
            return;
        }
    }
}

function newSubscribeToList(args){
    const logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - subscribeToList()');
    try {
        let isEmailExist = checkSubscription(args.email);
        if(isEmailExist) return false;

        var requestBody = {}
        switch (args.action) {
            case "footer":
                 requestBody = {
                     profiles: [
                         {email: args.email, source: args.source, event:"Subscribed to List"}
                     ]
                 }
                 break;
            case "accountCreate":
                requestBody = {
                    profiles: [
                        {
                            email: args.email,
                            first_name: args.first_name,
                            last_name: args.last_name,
                            $source: args.source,
                            event:"Subscribed to List"
                        }
                    ]
                }
                break;
            case "checkout":
                requestBody = {
                    profiles: [
                        {
                            email: args.email,
                            $source: args.source,
                            $first_name: args.first_name,
                            $last_name: args.last_name,
                            $address1: args.address1,
                            $address2: args.address2,
                            $city: args.city,
                            $region: args.state,
                            $zip: args.zip,
                            $organization: args.organization,
                            event:"Subscribed to Newsletter"
                        }
                    ]
                }
                break;
        }
        requestBody.api_key = apiKey;
        const result = KlaviyoSubscriptionService.call(JSON.stringify(requestBody));
        const responseToJSON = JSON.parse(result.object);
        if(!empty(responseToJSON)) {
            let response = responseToJSON[0];
            let email = args.email;
            if (!empty(response) && response.email == email) {
                return true;
            } else {
                logger.error('subscribeToList() failed for ' + args.email + '. Error from Klaviyo. Response: ' + result);
            }
        }
    } catch (e) {
        logger.error('subscribeToList() failed for ' + args.email + 'at source ' + source + ' .Error: ' +  e.message);
    }
}


/**
 *
 * @param email
 * @returns
 */
function checkSubscription (email) {

	var logger = Logger.getLogger('Klaviyo', 'KlaviyoSubscriptionUtils - checkSubscription()');

	try {
		KlaviyoCheckSubscriptionService.addParam('emails', email);
		var klaviyo_key = Site.getCurrent().getCustomPreferenceValue('klaviyo_api_key');
		var requestObj = {};
		var result = KlaviyoCheckSubscriptionService.call(requestObj);
 		var profileId = null;
		var resultObj = JSON.parse(result.object);

		if(!empty(resultObj)) {
			var response = resultObj[0];
			if (!empty(response) && response.email == email) {
				profileId = response.id;
			} else {
				logger.error('checkSubscription() failed for ' + email + '. Error from Klaviyo. Response: ' + resultObj);
				return;
			}
		} else {
			logger.error('checkSubscription() failed for ' + email + '. Error from Klaviyo. Empty Response');
			return;
		}
		return profileId;
	} catch (e) {
		logger.error('checkSubscription() failed for ' + email + '. Error: ' +  e.message);
		return;
	}
}


/**
 *
 * @param customerId
 * @returns
 */


/**
 * Checks for an empty js object
 * @param obj
 * @returns
 */
function isEmpty(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }

    return JSON.stringify(obj) === JSON.stringify({});
}

module.exports = {
    subscribeToList: subscribeToList,
    checkSubscription: checkSubscription,
    newSubscribeToList:newSubscribeToList,
    optOutWholesale:optOutWholesale
};

//HTTP Services

var KlaviyoSubscriptionService = ServiceRegistry.createService('KlaviyoSubscriptionService', {
	/**
     * Create the service request
     * - Set request method to be the HTTP POST method
     * - Construct request URL
     * - Append the request HTTP query string as a URL parameter
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {Object} params - Additional paramaters
     * @returns {void}
     */
	createRequest: function(svc, params) {
		//Set HTTP Method
		svc = svc.setRequestMethod("POST");
		svc = svc.addHeader('Content-Type','application/json');
		return params;

	},
	/**
     * JSON parse the response tex`t and return it in configured retData object
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} retData - Service response object
     */
	parseResponse: function(svc, client) {
		return client.text;
	}

});
// Fred initialize the service with the site level list
// https://a.klaviyo.com/api/v2/list/NZcTRu/members

KlaviyoSubscriptionService = KlaviyoSubscriptionService.setURL(KlaviyoSubscriptionService.getURL().replace('{listid}',newsLetterId));

var KlaviyoCheckSubscriptionService = ServiceRegistry.createService('KlaviyoCheckSubscriptionService', {
	/**
     * Create the service request
     * - Set request method to be the HTTP POST method
     * - Construct request URL
     * - Append the request HTTP query string as a URL parameter
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {Object} params - Additional paramaters
     * @returns {void}
    */
	createRequest: function(svc, params) {
		//Set HTTP Method
		svc = svc.setRequestMethod("GET");
		svc = svc.addHeader('api-key', apiKey)

	},
	/**
     * JSON parse the response text and return it in configured retData object
     *
     * @param {dw.svc.HTTPService} svc - HTTP Service instance
     * @param {dw.net.HTTPClient} client - HTTPClient class instance of the current service
     * @returns {Object} retData - Service response object
     */
	parseResponse: function(svc, client) {
		return client.text;
	}

});

// Fred initialize the service with the site level list
KlaviyoCheckSubscriptionService = KlaviyoCheckSubscriptionService.setURL(KlaviyoCheckSubscriptionService.getURL().replace('{listid}',newsLetterId));
