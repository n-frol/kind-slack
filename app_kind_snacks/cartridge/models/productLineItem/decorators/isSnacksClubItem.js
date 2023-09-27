/* global empty, request */
'use strict';

module.exports = function (object, apiProduct) {
    var ArrayList = require("dw/util/ArrayList");
    var cookies = request.getHttpCookies();
    var value = false;
    var autoShipJSON = null;
    var productID = apiProduct.ID;

    if (!empty(cookies)) {
        for (var i = 0; i < cookies.getCookieCount(); i++) {
            var cookie = cookies[i];
            var cookieName = cookie.getName();
            if (cookieName === "og_cart_autoship") {
                autoShipJSON = decodeURIComponent(cookie.getValue());
            }
        }
        var autoShipCart = JSON.parse(autoShipJSON);
        var items = new ArrayList();
        if (!empty(autoShipCart)) {
            for (var j = 0; j < autoShipCart.length; j++) {
                var item = autoShipCart[j];
                items.add(item.id.toString());
            }
        }
        value = items.contains(productID);
    }


    Object.defineProperty(object, 'isSnacksClubItem', {
        enumerable: true,
        writable: true,
        value: value
    });
};
