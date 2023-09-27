'use strict';

var server = require('server');
server.extend(module.superModule);

function isAutoShip(cookies) {
    if(empty(cookies)) {
        return false;
    }
    var autoShip = 0;
    for (var i = 0; i < cookies.getCookieCount(); i++) {
        var cookie = cookies[i];
        var cookieName = cookie.getName();
        if(cookieName == 'og_autoship') {
            autoShip = Number(cookie.getValue());
            break;
        }
    }
    return Boolean(autoShip);
}

/**
 * @param {dw.web.Cookies} cookies - The cookies object instance from the
 *      current request.
 * @returns {boolean} - Returns true if the cookie is found.
 */
function isSMS(cookies) {
    var autoShip = 0;

    if (!empty(cookies)) {
        for (var i = 0; i < cookies.getCookieCount(); i++) {
            var cookie = cookies[i];
            var cookieName = cookie.getName();

            if(cookieName === 'og_reorder') {
                autoShip = Number(cookie.getValue());
                break;
            }
        }
    }

    return Boolean(autoShip);
}

server.append('ExpressButtons', function (req, res, next) {
    var viewData = res.getViewData();
    var autoShip = false;
    var cookies = request.getHttpCookies();
    autoShip = isAutoShip(cookies);
    viewData.autoShip = autoShip;
    res.setViewData(viewData);
    return next();
});

/**
 * Checks if the order contains any subscription products by checking the
 * OrderGroove auto-ship cookie. If there is a subscription product and the
 * customer is not authenticated, then they will be redirected to the Checkout
 * Login endpoint.
 *
 * @extends PaymentOperator-PaypalExpress
 */
server.prepend('PaypalExpress', function (req, res, next) {
    var Site = require('dw/system/Site');
    var URLUtils = require('dw/web/URLUtils');
    var viewData = res.getViewData();
    var site = Site.getCurrent();
    var orderGrooveEnabled = site.getCustomPreferenceValue('OrderGrooveEnable');
    var autoShip = false;
    var forceSave = false;

    if (!empty(orderGrooveEnabled) && orderGrooveEnabled) {
        var cookies = request.getHttpCookies();
        autoShip = isAutoShip(cookies);
        forceSave = isSMS(cookies);

        if (autoShip && !customer.authenticated) {
            res.redirect(URLUtils.url('Checkout-Login', 'ppexpress', true));
            return next();
        }
    }
    viewData.autoShip = autoShip;
    viewData.forceSave = forceSave;
    res.setViewData(viewData);
    return next();
});

module.exports = server.exports();
