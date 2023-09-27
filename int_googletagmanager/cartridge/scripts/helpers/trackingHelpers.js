/* global empty */

'use strict';

var Site = require('dw/system/Site');

/**
 * trackingHelpers.js
 *
 * A module that exports helper functions for GTM tracking
 *
 * @module trackingHelpers
 */

/**
 * Checks for the Order Groove cookies to determine if Snack Club is present
 *
 * @returns {boolean}
 */
function isSnackClub() {
    var cookies = request.getHttpCookies();
    var subscriptionDataString = '';
    var subscriptionData = {};

    if (empty(cookies)) {
        return false;
    }

    var i = 0;

    while (i < cookies.getCookieCount()) {
        var cookie = cookies[i];
        var cookieName = cookie.getName();
        if (cookieName === 'og_cart_autoship') {
            subscriptionDataString = decodeURIComponent(cookie.getValue());
            break;
        }
        i++;
    }

    if (subscriptionDataString) {
        subscriptionData = JSON.parse(subscriptionDataString);

        if (subscriptionData && subscriptionData.length) {
            return true;
        }
    }

    return false;
}

/**
 * Checks the customer group to see if customer is employee
 *
 * @returns {boolean}
 */
function isEmployee() {
    var kindEmployeeGroupID = Site.getCurrent().getCustomPreferenceValue('kindEmployeeGroupID');

    if (!empty(kindEmployeeGroupID)) {
        var customerGroups = session.customer.customerGroups;

        var customerGroupIterator = customerGroups.iterator();

        while (customerGroupIterator.hasNext()) {
            var customerGroup = customerGroupIterator.next();
            
            if (customerGroup.ID === kindEmployeeGroupID) {
                return true;
            }
        }
    }

    return false;
}

module.exports = {
    isSnackClub: isSnackClub,
    isEmployee: isEmployee
};
