'use strict';

/**
 * Controller that provides functions Business Manager Sessions.
 * @module controllers/BrowseRemote
 */
var Logger 		: dw.system.Logger 	= require('dw/system/Logger');
var HTTPClient 	: dw.net.HTTPClient = require('dw/net/HTTPClient');
var Status 		: dw.system.Status 	= require('dw/system/Status');
var HashMap 	: dw.util.HashMap 	= require('dw/util/HashMap');


/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Requests a given URL and returns it.
 */
function httpRequest() {

	var pdict = {
			    	"mainmenuname"		: request.httpParameterMap.mainmenuname.value,
			    	"CurrentMenuItemId"	: request.httpParameterMap.CurrentMenuItemId.value
	    		};

	var requestURL = app.getForm('browseremote.http.url').value();
	if ( !empty(requestURL) ) {
		pdict.RequestResult = performHttpRequest( requestURL );
	}

	app.getView( pdict ).render('browseremote/geturi');
}

/**
 * Calls submits a request to the given URL.
 *
 * @param {string} requestURL - The URL to call
 *
 * @returns {Object} 			requestResult					- The pipeline dictionary object
 * @returns {dw.system.Status} 	requestResult.Status 			- The request status
 * @returns {string} 			requestResult.RawData			- The returned contents of the URL
 * @returns {Object} 			requestResult.ResponseHeaders	- The response headers
 */
function performHttpRequest( requestURL : String ) {
	
	if ( empty(requestURL) ) {
		Logger.debug('ExecuteURL.ds: feedURI job parameter is missing.');
		return;
	}

	var message 		: String			= null;
	var requestResult 	: Object			= {};
	var httpClient 		: dw.net.HTTPClient = new HTTPClient();
	var status 			: dw.system.Status 	= new Status( Status.OK );

	httpClient.setTimeout(25000);

	try {
		httpClient.open('GET', requestURL);
		httpClient.send();

		if ( httpClient.statusCode == 200 ) {
			message = httpClient.text;
		} else {
			// error handling
			status = new Status(Status.ERROR, httpClient.statusCode, 'Code: ' + httpClient.statusCode + ' Message: ' + httpClient.statusMessage);
		}
		var responseHeaders : dw.util.Map = new HashMap();
		
		for each ( var key : String in httpClient.allResponseHeaders.keySet() ) {
			var value = httpClient.getResponseHeader(key);
			responseHeaders.put(key,value);
		}
		requestResult.ResponseHeaders = responseHeaders;
	}
	catch(e) 
	{
		var exception = e;
		message = "An error occured with status code " + e;
		status = new Status(Status.ERROR, httpClient.statusCode, e );
	}
	requestResult.RawData = message;
	requestResult.Status = status;

	return requestResult;
}

/** Keeps a session alive.
 * @see {@link module:controllers/BrowseRemote~httpRequest} */
exports.Http = guard.ensure(['https'], httpRequest);