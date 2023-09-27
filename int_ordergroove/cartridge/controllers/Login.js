'use strict';

var server = require('server');
server.extend(module.superModule);

server.prepend('Logout', function (req, res, next) {
	var Site = require('dw/system/Site');
	if(!empty(Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable")) && Site.getCurrent().getCustomPreferenceValue("OrderGrooveEnable") == true) {
		var Cookie = require('dw/web/Cookie');
		var content : String = new String("");
		var cookie : Cookie = Cookie("og_auth", content);
		cookie.setSecure(true); // secure cookie
		cookie.setMaxAge(0); // 0 will delete cookie
		cookie.setPath("/"); // base path
		response.addHttpCookie(cookie); // response is an implicit variable according to the API
	}
    next();
});

module.exports = server.exports();