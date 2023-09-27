'use strict';

var Logger = require('dw/system/Logger').getLogger('zmags-creator');
var Site = require('dw/system/Site');
var StringUtils = require('dw/util/StringUtils');
var URLUtils = require('dw/web/URLUtils');

/**
 * Identifier for the Zmags Creator cartridge.
 *
 * Used to differentiate between Zmags Publicator and Creator cartridges
 * in case both are installed at the same time.
 */
var ZMAGSSOURCE = 'creator';


/**
 * Remove leading and trailing white space
 *
 * @param {string} s input
 * @returns {string} trimmed output
 */
function trim(s) {
    return StringUtils.trim(s);
}


/**
 * @typedef {Object} GetSnippetPartsResult
 *
 * @property {Array.<string>} attributeNames
 * @property {Array.<string>} attributeValues
 */

/**
 * Parse the snippet site preference into lists of attribute names and attribute values.
 *
 * @param {string} zmagsSnippetPrefValue Zmags creator snippet. If empty then it is read from site preference.
 * @returns {GetSnippetPartsResult} Parsed snippet parts
 */
function getSnippetParts(zmagsSnippetPrefValue) {
    var zmagsSnippet;
    var lines;
    var packageJson = require('~/package.json');
    var result = {
        attributeNames: [],
        attributeValues: [],
        cartridgeVersion: packageJson.cartridgeVersion,
        cartridgeArchitecture: packageJson.cartridgeArchitecture
    };

    try {
        zmagsSnippet = zmagsSnippetPrefValue || Site.current.getCustomPreferenceValue('zmagsCreatorChannelSnippet');
        if (zmagsSnippet) {
            lines = zmagsSnippet.split('\n').map(trim);

            lines.forEach(function processLine(line) {
                if (line === '') {
                    return;
                }

                var strings = line.split('=').map(trim);
                var attrName = strings.shift();
                var attrValue = '';
                if (strings.length > 0) {
                    attrValue = strings.join('=');
                    // make sure there are no quotes around the attribute value
                    if (attrValue.length >= 2 && attrValue[0] === '"' && attrValue[attrValue.length - 1] === '"') {
                        attrValue = attrValue.slice(1, attrValue.length - 1);
                    }
                }
                result.attributeNames.push(attrName);
                result.attributeValues.push(attrValue);
            });
        } else {
            result = null;
        }
    } catch (e) {
        Logger.error('getSnippetParts: error while parsing site pref \'zmagsCreatorChannelSnippet\'. Exception: ' + JSON.stringify(e));
        result = null;
    }

    return result;
}


/**
 * Get product line items added from Zmags context
 *
 * @param {string} pid Product ID
 * @returns {Array.<dw.order.ProductLineItem>} product line items
 */
function getItems(pid) {
    var result = [];
    if (pid) {
        var basket = require('dw/order/BasketMgr').currentBasket;
        result = basket.getProductLineItems(pid).toArray();
    }
    return result;
}

/**
 * This function tags product line items added from Zmags context
 *
 * @param {Array.<dw.order.ProductLineItem>} items product line items
 * @param {string} zmagsSource Zmags cartridge identifier
 */
function tagItems(items, zmagsSource) {
    var Transaction = require('dw/system/Transaction');
    Transaction.wrap(function tagZmagsProducts() {
        items.forEach(function tagZmagsProduct(/** @type dw.order.ProductLineItem */ pli) {
            if (typeof pli.custom.zmagsSource === 'undefined' || pli.custom.zmagsSource === null || pli.custom.zmagsSource === '') {
                pli.custom.zmagsSource = zmagsSource; // eslint-disable-line no-param-reassign
            }
        });
    });
}


/**
 * Retrieves Zmags custom site preferences
 *
 * @returns {Object} Analytics settings and data
 */
function getSettings() {
    var result = {
        googleAnalyticsEnabled: Site.current.getCustomPreferenceValue('zmagsCreatorGoogleAnalyticsEnabled'),
        googleAnalyticsId: Site.current.getCustomPreferenceValue('zmagsCreatorGoogleAnalyticsId'),
        adobeAnalyticsEnabled: Site.current.getCustomPreferenceValue('zmagsCreatorAdobeAnalyticsEnabled'),
        adobeAnalyticsRsid: Site.current.getCustomPreferenceValue('zmagsCreatorAdobeAnalyticsRsid'),
        adobeAnalyticsTrackingServer: Site.current.getCustomPreferenceValue('zmagsCreatorAdobeAnalyticsTrackingServer'),
        quickViewUrl: URLUtils.https('Product-ShowQuickView').toString()
    };

    if (result.adobeAnalyticsEnabled && !result.adobeAnalyticsRsid) {
        Logger.error('Zmags Creator Adobe Analytics RSID is empty, please configure in Site Preferences.');
    }

    if (result.googleAnalyticsEnabled && !result.googleAnalyticsId) {
        Logger.error('Zmags Creator Google Analytics Id (UA-XXXX-Y) is empty, please configure in Site Preferences.');
    }

    return result;
}


/**
 * Get the current order or the current basket if no order number is given.
 *
 * @param {string} orderNumber Order number, optional.
 * @returns {dw.order.LineItemCtnr} Container or null
 */
function getCurrentLineItemCtnr(orderNumber) {
    var result;

    if (typeof orderNumber === 'string') {
        var OrderMgr = require('dw/order/OrderMgr');
        result = OrderMgr.getOrder(orderNumber);
    } else {
        var BasketMgr = require('dw/order/BasketMgr');
        result = BasketMgr.currentBasket;
    }

    return result;
}


/**
 * Determine if current basket or order holds a product added from Quickview openend by Zmags publication.
 *
 * @param {dw.order.LineItemCtnr} lineItemCtnr Basket or order
 * @returns {boolean} True if relevant product was found
 */
function containerHasZmagsProducts(lineItemCtnr) {
    var result = false;
    if (lineItemCtnr) {
        var pliIterator = lineItemCtnr.getProductLineItems().iterator();
        while (pliIterator.hasNext()) {
            if (pliIterator.next().custom.zmagsSource === ZMAGSSOURCE) {
                result = true;
                break;
            }
        }
    }
    return result;
}


/**
 * Get Zmags analytics data for the current line item container.
 *
 * @param {Object} settings Analytics site preferences
 * @param {string} orderNumber Order number, optional.
 * @returns {Object} Analytics data
 */
function getAnalyticsData(settings, orderNumber) {
    var result = {};
    var lineItemCtnr;

    if (settings.googleAnalyticsEnabled || settings.adobeAnalyticsEnabled) {
        lineItemCtnr = getCurrentLineItemCtnr(orderNumber);
        if (lineItemCtnr && containerHasZmagsProducts(lineItemCtnr)) {
            result.zmagsSource = ZMAGSSOURCE;
            result.qty = lineItemCtnr.productQuantityTotal;
        }
    }

    return result;
}


exports.getSnippetParts = getSnippetParts;
exports.getItems = getItems;
exports.tagItems = tagItems;
exports.getSettings = getSettings;
exports.getAnalyticsData = getAnalyticsData;

/* exports for unit tests */
exports.getCurrentLineItemCtnr = getCurrentLineItemCtnr;
exports.containerHasZmagsProducts = containerHasZmagsProducts;
exports.trim = trim;
