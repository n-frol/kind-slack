'use strict';
/**
 * Script for Blowfish encryption / decryption.
 * To include this script use:
 * require("int_computop/cartridge/scripts/computop/lib/Blowfish");
 */

(function (exports) {
    /* API includes */
    var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
    // var Cipher = require('dw/crypto/Cipher');
    var Cipher = require('dw/crypto/WeakCipher');
    var Encoding = require('dw/crypto/Encoding');

    var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - Blowfish.js:\n';


    /**
     * convert String to ByteArray
     *
     * @param {string} str - string that will be transformed into byte array
     * @returns {Array} - transformed string
     */
    function toByteArray(str) {
        var byteArray = [];

        for (var i = 0; i < str.length; i++) {
            if (str.charCodeAt(i) <= 0x7F) {
                byteArray.push(str.charCodeAt(i));
            } else {
                var h = encodeURIComponent(str.charAt(i)).substr(1).split('%');
                for (var j = 0; j < h.length; j++) {
                    byteArray.push(parseInt(h[j], 16));
                }
            }
        }
        return byteArray;
    }

    /**
     * convert ByteArray to String
     *
     * @param {Array} byteArray - string as byte array
     * @returns {string} - transformed byte array
     */
    function parse(byteArray) {
        var str = '';

        for (var i = 0; i < byteArray.length; i++) {
            str +=  byteArray[i] <= 0x7F ?
                byteArray[i] === 0x25 ? '%25' : // %
                    String.fromCharCode(byteArray[i]) :
                    '%' + byteArray[i].toString(16).toUpperCase();
        }
        return decodeURIComponent(str);
    }

    /**
     * fill data up to a multiple of 8
     *
     * @param {string} data
     * @returns {string}
     */
    function whitespacePadding(data){
        var dataBytes = toByteArray(data);

        while ((dataBytes.length % 8) != 0) {
            dataBytes.push(0x20);  // not null bytes, to use 0x20 is a requirement
        }
        return parse(dataBytes);
    }

    /**
     * encrypt String with Blowfish algorithm
     *
     * @param {string} data - text that will be encrypted
     * @param {string} key - encryption key
     * @returns {string} - encrypted text
     */
    function encryptBlowfish(data, key) {
        var result = null;
        try {
            var key64 = require('dw/util/StringUtils').encodeBase64(key);
            var cipher = new Cipher();
            var dataP = whitespacePadding(data);

            var encryptedData = cipher.encrypt(
                dataP, key64, 'Blowfish/ECB/NOPADDING', null, 1
            );

            var encryptedDataBytes = Encoding.fromBase64(encryptedData);
            result = Encoding.toHex(encryptedDataBytes);
        } catch (e) {
            var eString = logPrefix + '\tERROR at encryptBlowfish:\n' +
            '\tFunction encryptBlowfish throws exception!:';
            eString += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            cdpmLogger.error(eString);
        }
        return result;
    }


    /**
     * decrypt String with Blowfish algorithm
     *
     * @param {string} data - encrypted text
     * @param {string} key - encryption key
     * @returns {string} - decrypted text
     */
    function decryptBlowfish(data, key) {
        var result = null;
        try {
            var key64 = require('dw/util/StringUtils').encodeBase64(key);
            var cipher = new Cipher();
            var secret = Encoding.fromHex(data);

            secret = Encoding.toBase64(secret);
            result = cipher.decrypt(secret, key64, 'Blowfish/ECB/NOPADDING', null, 1);
        } catch (e) {
            var eString = logPrefix + '\tERROR at decryptBlowfish:';
            eString += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            cdpmLogger.error(eString);
        }
        return result;
    }

    /**
     * decrypt String with Blowfish algorithm for different encoding (other than UTF-8)
     *
     * @param {string} data - encrypted text
     * @param {string} key - encryption key
     * @param {string} encoding - text encoding
     * @returns String
     */
    function decryptBlowfishWithEncoding(data, key, encoding) {
        var result = null;
        var resultBytes;
        try {
            var key64 = require('dw/util/StringUtils').encodeBase64(key);
            var cipher = new Cipher();
            var secret = Encoding.fromHex(data);

            resultBytes = cipher.decryptBytes(secret, key64, 'Blowfish/ECB/NOPADDING', null, 1);
            if (encoding != null) {
                result = resultBytes.toString(encoding);
            } else { // UTF-8
                result = resultBytes.toString();
            }
        } catch (err) {
            var eString = logPrefix + '\tERROR at decryptBlowfishWithEncoding:';
            eString += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            cdpmLogger.error(eString);
        }
        return result;
    }

    exports.decryptBlowfish = decryptBlowfish; // eslint-disable-line no-param-reassign
    exports.encryptBlowfish = encryptBlowfish; // eslint-disable-line no-param-reassign
}(module.exports));
