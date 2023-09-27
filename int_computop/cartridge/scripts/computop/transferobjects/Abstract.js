/* eslint-disable no-multi-spaces */
'use strict';
/**
 * Abstract transfer object class
 */

/* API includes */
var cdpmLogger  = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var HashMap     = require('dw/util/HashMap');
var Calendar    = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Site        = require('dw/system/Site').getCurrent();

/* Script includes */
/** @type {Class} */
var Class = require('int_computop/cartridge/scripts/object-handling/libInheritance').Class;

var verboseLogging = true;

var Abstract = Class.extend({
    init: function () {
        // methods MUST return a valid HashMap
        this.methods = [];
    },

    /**
     * Enable / disable logging to debug log
     *
     * @param {boolean} enableLogging - if true parameters will be logged
     * @returns Object
     */
    setLogging: function (enableLogging) {
        verboseLogging = !!enableLogging;
        return this;
    },

    /**
     * Returns data object for the remote call
     *
     * @returns {dw.util.HashMap} - builds hash map with all required parameters
     */
    getTransferObject: function () {
        var self = this;
        var map = new HashMap();

        for (var attribute in this) {
            var type = typeof this[attribute];
            if (type === 'function') {
                this[attribute] = (function (fn, obj) { return function () { return fn.apply(obj, arguments); }; })(this[attribute], this);
            }
        }

        try {
            this.methods.forEach(function (method) {
                if (typeof self[method] === 'function') {
                    map.putAll(self[method].call(self));
                }
            });

            // add IPAddr for each transferobject
            map.put('IPAddr', this.getIpAddress());

            if (verboseLogging) {
//                cdpmLogger.debug('Request data (unmasked): ' + this.getTransferObjectString(map, false));
                cdpmLogger.info('Request data: ' + this.getTransferObjectString(map, true));
            }
        } catch (err) {
            cdpmLogger.error('Error while creating transfer object: ' + err.fileName + ': ' + err.message + '\n' + err.stack);
        }
        return map;
    },

    /**
     * Retrieve order description from basket / order
     *
     * @param {dw.order.LineItemCtnr} ctnr - current basket / order
     * @param {number} optMaxLength - max length for order description
     * @param {boolean} [overrideTestMode] - An optional parameter that can be
     *      used to override test mode on a particular payment method. If not
     *      specified then default is false.
     * @returns {string} - Returns the order description.
     */
    getOrderDescription: function (ctnr, optMaxLength, overrideTestMode) {
        var _overrideTestMode = !empty(overrideTestMode) ?
            overrideTestMode : false;
        var result = '';
        var separator = ' ';
        var maxLength = 384;

        if (optMaxLength) {
            maxLength = optMaxLength;
        }

        // Test Setup - OrderDesc is getting filled with testString
        var isTestMode = this.getSitePreference('paymentOperatorTestFlag');
        var testString = this.getSitePreference('paymentOperatorTestString');

        if (isTestMode != null && isTestMode == true && !_overrideTestMode) {
            if (testString !== null) {
                result = testString;
            } else {
                result = 'Test:0000';
            }
            return result;
        }

        var productLineItems = ctnr.getAllProductLineItems().iterator();

        while (productLineItems.hasNext()) {
            var pli = productLineItems.next();
            result += 'PID: ' + pli.getProductID() + separator
                + pli.getProductName() + separator
                + 'Quantity: ' + pli.getQuantity() + separator
                + 'Price ' + pli.getPrice().toString() + ' ';
        }
        if (result.length > maxLength) {
            result = result.substr(0, maxLength - 1);
        }
        return result;
    },

    /**
     * Helper function to format a given date
     *
     * @param {string} - date as string
     * @returns {string} - formatted date
     */
    getDate: function (date) {
        var result = date // FIXME use new Date for validation
            ? StringUtils.formatCalendar(new Calendar(date), 'dd.MM.yyyy')
            : '';
        return result;
    },

    /**
     * Helper function to retrieve specific config value
     *
     * @param {string} key - custom site preference key
     * @returns {string} - custom site preference value
     */
    getSitePreference: function (key) {
        var result = Site.getCustomPreferenceValue(key);
        if (!result) {
            result = '';
        }
        return result;
    },

    /**
     * Fetch the ip address of the current storefront request
     *
     * @returns {string} - remote address of current request
     */
    getIpAddress: function () {
        return request.getHttpRemoteAddress();
    },

    /**
     * Convert transfer object to String for logging purposes
     *
     * @param {dw.utilHashMap} map - hash map with parameters
     * @param {boolean} applyFieldsMask - flag if sensitive fields should be obfuscated
     * @returns {string} - request string
     */
    getTransferObjectString: function (map, applyFieldsMask) {
        var result = '';
        if (map) {
            var resultArray = [];
            var attrValue;

            for (var attrID in map) {
                if (applyFieldsMask && this.getFieldNeedsToBeMasked(attrID)) {
                    attrValue = this.getMaskedFieldValue(map.get(attrID));
                } else {
                    attrValue = map.get(attrID);
                }
                resultArray.push([attrID, attrValue].join('='));
            }
            result = resultArray.join('&');
        }
        return result;
    },

    /**
     * Values will be partly or completely (if less than 4 chars in size) masked with *
     *
     * @param {string} value - parameter that needs to be masked
     * @return {string}
     */
    getMaskedFieldValue: function (value) {
        var tmpResult = '' + value;
        var result = '';
        var padding = tmpResult.length;

        if (tmpResult.length > 4) {
            result = tmpResult.substr(-4);
            padding = tmpResult.length - 4;
        }
        for (var i = 0; i < padding; i++) {
            result = '*' + result;
        }
        return result;
    },

    /**
     * Check if given field needs to become obfuscated for logging
     *
     * @param {string} name - parameter name
     * @returns {boolean} - true when field holds sensitive data
     */
    getFieldNeedsToBeMasked: function (name) {
        var maskedFieldsForLog = [
            'AccBank',
            'AccNr',
            'AccOwner',
            'AccIBAN',
            'BLZV',
            'IBAN',
            'BIC',
            'IssuerID',
            'CCNr',
            'CCCVC',
            'CCExpiry'
        ];
        return maskedFieldsForLog.indexOf(name) !== -1;
    },

    /**
     * Method that returns locale
     *
     * @returns {dw.util.Locale}
     */
    getLocale: function () {
        // assume that en_US is the default locale
        var Locale = require('dw/util/Locale');
        var result = Locale.getLocale('en_US');
        if (Site.getDefaultLocale() !== 'default') {
            result = Locale.getLocale(Site.getDefaultLocale());
        }
        return result;
    }
});
// Exports the function that can be extended by other transfer objects
module.exports = Abstract;
