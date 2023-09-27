'use strict';

var server = require('server');
server.extend(module.superModule);

function isSMS(cookies) {
	if(empty(cookies)) {
		return false;
	}
	var autoShip = 0;
	for (var i = 0; i < cookies.getCookieCount(); i++) {
		var cookie = cookies[i];
		var cookieName = cookie.getName();
		if(cookieName == "og_reorder") {
			autoShip = Number(cookie.getValue());
			break;
		}
	}
	return Boolean(autoShip);
}

server.append('SubmitShipping', function (req, res, next) {
	this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
		var viewData = res.getViewData();
		var forceSave = false;
		if (viewData.error !== true) {
			var cookies = request.getHttpCookies();
			forceSave = isSMS(cookies);
		}

        if (!empty(viewData.order) && !empty(viewData.order.billing)) {
            viewData.order.billing.payment.forceSave = forceSave;
        }

		res.setViewData(viewData);
	});
    return next();
});

module.exports = server.exports();
