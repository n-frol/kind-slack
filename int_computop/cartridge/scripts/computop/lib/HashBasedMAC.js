'use strict';
/**
 * HMAC calculation functions
 *
 */

(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    var Mac = require('dw/crypto/Mac');

    /**
     * Basic HMAC encoding
     *
     * @param {string} data - text for which hmac will be calculated
     * @param {string} key - hmac key from preferences
     * @returns {string} - calculated hmac
     */
    function calculateHMAC(data, key) {
        var result = '';
        try {
            var hmac = new Mac(Mac.HMAC_SHA_256);
            var mvalue = hmac.digest(data, key);
            result = require('dw/crypto/Encoding').toHex(mvalue);
        } catch (e) {
            var eString = logPrefix + '\tERROR at calculateHMAC:\n';
            eString += '\tFunction calculateHMAC throws exception!\n';
            eString += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            cdpmLogger.error(eString);
        }
        return result;
    }

    /**
     * Calculates hmac with given array data
     *
     * @param {Array} data - containing values for orderNo, PayID, TransID etc
     * @param {string} key - hmac key from preferences
     * @returns {string} - calculated hmac
     */
    function getHMAC(data, key) {
        var result = '';
        if (data && data.length > 0) {
            var dataStr = data.join('*');
            // if data comes without PayID
            if (5 > data.length) {
                dataStr = '*' + dataStr;
            }
            result = calculateHMAC(dataStr, key);
        }
        return result;
    }

    exports.getHMAC = getHMAC; // eslint-disable-line no-param-reassign
}(module.exports));
