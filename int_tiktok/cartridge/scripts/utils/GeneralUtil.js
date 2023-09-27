'use strict';

function getCookie(name) {
    // eslint-disable-next-line
    let i = request.httpCookies.cookieCount;
    while (i > 0) {
        // eslint-disable-next-line
        if (request.httpCookies[--i].name === name) {
            // eslint-disable-next-line
            return request.httpCookies[i];
        }
    }
    return null;
}

function setCookie(name, value, maxAge, path) {
    const Cookie = require('dw/web/Cookie');
    const cookie = new Cookie(name, value);
    // eslint-disable-next-line
    if (!empty(maxAge)) {
        cookie.setMaxAge(maxAge);
    }

    if (path) {
        cookie.setPath(path);
    }
    // eslint-disable-next-line
    response.addHttpCookie(cookie);
}

function findInArray(array, condition) {
    let finding = null;

    array.some(function (item, index) {
        if (condition(item, index)) {
            finding = item;
            return true;
        }
        return false;
    });

    return finding;
}

module.exports = {
    find: findInArray,
    getCookie: getCookie,
    setCookie: setCookie
};
