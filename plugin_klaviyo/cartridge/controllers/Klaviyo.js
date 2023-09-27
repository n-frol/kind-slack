'use strict';

var server = require('server');
//Use the following for CSRF protection: add middleware in routes and hidden field on form
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

/* API Includes */
var klaviyoToken = require('dw/system/Site').getCurrent().getCustomPreferenceValue('klaviyo_account');
var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');

var HookMgr = require('dw/system/HookMgr');

/**
 * You have to add the values for Klaviyo Account, Klaviyo API Key in
 * Merchant Tools -> Site Preferences -> Custom Site Preference -> Klaviyo
 * Change the value of Klaviyo Enabled as Yes
 */

server.get(
    'RenderKlaviyo',
    server.middleware.https,
    function (req, res, next) {
    	if(!dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')){
    		return;
    	}
    	var klaviyoDataLayer = KlaviyoUtils.buildDataLayer();
        res.render('/klaviyo/klaviyo_tag', {
        	klaviyoData : klaviyoDataLayer
        });
        next();
    }
);

server.get(
    'FooterSubscribe',
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {

    	res.render('klaviyo/footer_subscribe');

        next();
    }
);

server.post(
    'Subscribe',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
    	var email = req.form.emailsignup;
    	var source = req.form.source;
    	var statusMessage = null;
    	var KlaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
    	if(KlaviyoSubscriptionUtils.newSubscribeToList({action:"footer", email:email, source:source})) {
    		statusMessage = 'Thank you for subscribing.';
            if(HookMgr.hasHook('app.kind.yotpo.loyalty.newsletter')) {
                HookMgr.callHook('app.kind.yotpo.loyalty.newsletter', 'newsletter', email);
            }

    	} else {
    		statusMessage = 'You are already subscribed, thank you.';
    	}
    	res.render('klaviyo/subscription_status', {
			statusMessage : statusMessage,
			email :  email
	    });
    	next();
    }
);

server.post(
    'SubscribeAjax',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
    	var email = req.form.emailsignup;
    	var source = req.form.source;
    	var statusMessage = null;
        var error = true;
    	var KlaviyoSubscriptionUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoSubscriptionUtils');
    	if(KlaviyoSubscriptionUtils.newSubscribeToList({action:"footer", email:email, source:source})) {
    		statusMessage = 'Thank you for subscribing.';
            error = false;
            if(HookMgr.hasHook('app.kind.yotpo.loyalty.newsletter')) {
                HookMgr.callHook('app.kind.yotpo.loyalty.newsletter', 'newsletter', email);
            }

    	} else {
    		statusMessage = 'You are already subscribed, thank you.';
    	}
    	res.json({
			statusMessage : statusMessage,
			email :  email,
            error: error
	    });
    	next();
    }
);

server.get(
    'ShipmentConfirmation',
    server.middleware.https,
    function (req, res, next) {
    	if(!dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')){
    		return;
    	}

    	var orderID = req.querystring.orderID;
    	if(!empty(orderID)){
	    	var KlaviyoUtils = require('*/cartridge/scripts/utils/klaviyo/KlaviyoUtils');
	    	if(KlaviyoUtils.sendShipmentConfirmation(orderID)){
	    		res.json({
	    			status: 'success'
		    	});
	    	} else {
	    		res.json({
	    			status: 'failed sending email'
		    	});
	    	}
	    }

        next();
    }
);

module.exports = server.exports();
