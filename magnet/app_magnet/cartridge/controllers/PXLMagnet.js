'use strict';

/**
 * Controller that allows agent users to access built-in and custom site metrics
 *
 */

/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var ProductListMgr = require('dw/customer/ProductListMgr');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var AgentUserMgr = require("dw/customer/AgentUserMgr");
var AgentUserStatusCodes = require("dw/customer/AgentUserStatusCodes");

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/* metrics */
var OrderTotalsMetrics = require("~/cartridge/scripts/compass/metrics/orders/OrderTotalsMetrics");

function unauthorized() {
	var error = {
			"error" : "Unauthorized"
	}
	response.setStatus(401);
	response.writer.write(JSON.stringify(error));
	return false;
}

function authorize() {
	if (request.httpHeaders.containsKey("x-magnet-auth")) {
		var authorization = request.httpHeaders["x-magnet-auth"];
		var authParts = authorization.split(":");
		if (authParts.length != 2) { return unauthorized(); }
		
		var agentLoginStatus = AgentUserMgr.loginAgentUser(authParts[0], authParts[1]);
		if (agentLoginStatus.code != AgentUserStatusCodes.LOGIN_SUCCESSFUL) {
			return unauthorized();
		}
	} else {
		return unauthorized();
	}
	
	return true;
}


function Orders() {
	if (!authorize()) {
		return;
	}

	response.setContentType("application/json");
	var query = request.httpQueryString;
	var metrics = {};
	
	// add metadata to response
	metrics["_meta"] = {
	}

	response.writer.write(JSON.stringify(metrics));
}

/*
* Exposed methods.
*/
exports.Orders = guard.ensure(['get', 'https'], Orders);
