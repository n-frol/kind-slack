'use strict';

/**
 * @module util/helpers
 */

/**
 * Checks if submitted value type is an Object (and not an Array)
 * @param {*} obj Object to be checked
 * @returns {boolean}
 * @static
 */
function isObject(obj) {
    return typeof obj === 'object' && !Array.isArray(obj);
}

/**
 * Uppercases first char of string
 * @param {string} str String to uppercase
 * @returns {string}
 * @static
 */
function ucfirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns an object's preferred value, based on what DW object type it represents
 * @param {*} obj Object to use for value return
 * @returns {*}
 * @static
 */
function dwValue(obj) {
    if (empty(obj) || !isObject(obj)) {
        return obj;
    }

    if (obj instanceof Date) {
        // convert Date to Calendar in current instance timezone
        obj = new (require('dw/util/Calendar'))(obj);
        obj.setTimeZone(require('dw/system/Site').getCurrent().getTimezone());
    }

    if (obj instanceof (require('dw/web/FormField'))) {
        return obj.value;
    } else if (obj instanceof (require('dw/value/EnumValue'))) {
        return obj.displayValue;
    } else if (obj instanceof (require('dw/value/Money'))) {
        return require('dw/util/StringUtils').formatMoney(obj);
    } else if (obj instanceof (require('dw/util/Decimal'))) {
        return obj.valueOf();
    } else if (obj instanceof (require('dw/util/Calendar'))) {
        return require('dw/util/StringUtils').formatCalendar(obj, 'MM/dd/y hh:mm:ss a');
    } else if (obj instanceof (require('dw/util/Collection'))) {
        return obj.toArray();
    } else if (obj instanceof (require('dw/content/MarkupText'))) {
        return obj.markup;
    } else if (obj instanceof (require('dw/web/URL'))) {
        return obj.toString();
    }

    return obj;
}

/**
 * Expands JSON attributes
 * @param {string} attrJSON
 * @returns {Object}
 */
function expandAttributes(attrJSON) {
    var attributes;
    try {
        attributes = attrJSON ? JSON.parse(attrJSON) : {};
    } catch(e) {
        // Catch exception from invalid JSON
        require('dw/system/Logger').error('Error parsing JSON attributes: {0}', e);
        attributes = {};
    }
    return attributes;
}

/**
 * Fetches object definition from Custom Object, creating it if not exists
 * @param {string} customObjectName
 * @param {string} objectID
 * @param {boolean} [createIfNotExists]
 * @returns {dw.object.CustomAttributes}
 */
function getCustomObject(customObjectName, objectID, createIfNotExists) {
    var com = require('dw/object/CustomObjectMgr'),
        objectDefinition = com.getCustomObject(customObjectName, objectID);
    if (empty(objectDefinition) && createIfNotExists === true) {
        require('dw/system/Transaction').wrap(function(){
            objectDefinition = com.createCustomObject(customObjectName, objectID);
        });
    }
    if (!empty(objectDefinition)) {
        return objectDefinition.getCustom();
    }
}

/**
 * Merges attribute JS objects in place, preserving old values
 * @param {Object} newAttributes
 * @param {Object} oldAttributes
 */
function mergeAttributes(newAttributes, oldAttributes) {
    if (oldAttributes) {
        for (var attribute in oldAttributes) {
            if (oldAttributes.hasOwnProperty(attribute)) {
                newAttributes[attribute] = oldAttributes[attribute];
            }
        }
    }
}

/**
 * Returns parameter value from data (uses recursion)
 * @param {string} attr Period-delimited path to a parameter
 * @param {Array|Object} data
 * @returns {*}
 */
function getParamValue(attr, data) {
    var value;
    var attrs = attr.split('.');
    var obj;
    if (!Array.isArray(data)) {
        data = [data];
    }
    for (var di=0; di<data.length; di++) {
        obj = data[di];
        attrs.forEach(function objectMapper(k, i, arr){
            if (empty(obj) || !isObject(obj)) {
                value = obj;
                return;
            }

            if (i === 0) {
                if (k !== 'params' && k in obj) {
                    obj = obj[k];
                } else if ('params' in obj && obj.params.hasOwnProperty(k)) {
                    obj = obj.params[k];
                }
            } else {
                if (k in obj) {
                    obj = obj[k];
                }
            }
            if (i === arr.length-1) { // last param in path
                if (obj !== data[di]) { // only map obj to value, if not same as starting obj
                    value = obj;
                }
            }
        });

        if (!empty(value)) {
            break;
        }
    }

    return value;
}

/**
 * Handles object key/value mapping, writes to callback that accepts key and value as params
 * @param {Object} obj Keys serve as the value path, Values serve as the key to be written to
 * @param {Array|Object} data Source of data that should provide values to be mapped. Should be an object, or an array of objects
 * @param {Function} outputCallback Callback that is executed with resulting key and value. Signature: function(key, value)
 */
function mapValues(obj, data, outputCallback) {
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr) && !empty(obj[attr])) {
            if (Array.isArray(obj[attr])) {
                obj[attr].forEach(function(a){
                    outputCallback(a, getParamValue(attr, data));
                });
            } else {
                outputCallback(obj[attr], getParamValue(attr, data));
            }
        }
    }
}

/**
 * Return object values as an array
 * @param {Object} obj
 * @returns {Array}
 */
function objValues(obj) {
    var arr = [];
    for (var k in obj) {
        if (obj.hasOwnProperty(k) && obj[k]) {
            arr.push(obj[k]);
        }
    }
    return arr;
}

/**
 * Build a simple array of values from a collection
 * @param {string} valueKey The key to be fetched from each item in collection
 * @param {Array|dw.util.List} iterable Array or List to iterate
 * @param {Object} fallbackData Fallback data object
 * @returns {Array}
 */
function buildSimpleArrayFromIterable(valueKey, iterable, fallbackData) {
    var arrOut = [];
    var val;
    for (var i = 0; i < iterable.length; i++) {
        val = mappingFilter(valueKey, getParamValue(valueKey, fallbackData ? [iterable[i], fallbackData] : iterable[i]), iterable[i]);
        arrOut.push(val);
    }
    return arrOut;
}

/**
 * Build an array of objects from a collection
 * @param {Object} objMap Keys serve as the value path, Values serve as the key to be written to
 * @param {Array|dw.util.List} iterable Array or List to iterate
 * @param {Object} fallbackData Fallback data object
 * @returns {Array}
 */
function buildMappedArrayFromIterable(objMap, iterable, fallbackData) {
    var arrOut = [];
    var val;
    for (var i = 0; i < iterable.length; i++) {
        val = {};
        mapValues(objMap, fallbackData ? [iterable[i], fallbackData] : iterable[i], function mapObj(k, v){
            val[k] = mappingFilter(k, v, iterable[i]);
        });
        arrOut.push(val);
    }
    return arrOut;
}


/**
 * Build a custom output from user defined hook
 * @param {Object} key The key containing the hook method and label needed to transform
 * @param {Object} data The complex object to be transformed by custom hook to output
 * @returns {string}
 */
function initiateTransform(hookID, key, data){
	let output;
	let transformData = [data];
	try{
		let hook = hookID.slice(0,hookID.lastIndexOf('.')+1) + key.method;
		if(!require('dw/system/HookMgr').hasHook(hook)){
			throw new Error('Custom transformation hook not registered!');
		}
		output = require('dw/system/HookMgr').callHook(hook, key.method, transformData);
	}catch(e){
		require('dw/system/Logger').error('Error in custom transform {0} : {1}', hookID, e);
		output = e.message;
	}
	return output;
}

/**
 * Mapping callback, called by helpers.mapValues()
 * @param {string|Object} key The data map definition. Object = complex definition
 * @param {*} val The value mapped by helpers.getParamValue()
 * @param {Object} data Source of data, used when mapped value is a callback itself
 * @throws {RequiredAttributeException}
 */
function mappingFilter(key, val, data) {
    // The mapped value may be a function defined by trigger or feed
    // Function should have signature of `function(key, data){}`
    if (typeof(val) === 'function') {
        val = val(key, data);
    }
    if (isObject(key)) {
        if ('fallback' in key && empty(val)) {
            //require('dw/system/Logger').debug('Querying fallback value from "{0}"', key.fallback);
            val = getParamValue(key.fallback, data);
            if (typeof(val) === 'function') {
                val = val(key, data);
            }
        }
        if ('format' in key) {
            val = require('dw/util/StringUtils').format(key.format, val);
        } else {
            val = dwValue(val);
        }
        if ('required' in key && key.required && empty(val)) {
            throw new RequiredAttributeException(key.label);
        }
        if ('type' in key) {
            switch (key.type) {
                case 'bool':
                    val = val ? 'Y' : 'N';
                    break;
                case 'array':
                    // mappedValue can be a string or an object
                    // if an object, it's similar to the standard attribute mapping definition
                    var mapDef = key.mappedValue;
                    var concat = 'concat' in key && key.concat;
                    if (!empty(mapDef)) {
                        if (typeof(mapDef) === 'string') {
                            val = buildSimpleArrayFromIterable(mapDef, val, data);
                        } else {
                            val = buildMappedArrayFromIterable(mapDef, val, data);
                        }
                    }
                    if (concat === true && Array.isArray(val)) {
                        val = val.join(',');
                    }
                    break;
                default:
                    // no change
                    break;
            }
        }
    } else {
        val = dwValue(val);
    }

    if (typeof(val) === 'string') {
        // remove line breaks, otherwise MC complains, despite correct quoting.
        val = val.replace(/(\r\n|\n|\r)/gm, ' ');
    } else if (Array.isArray(val)) {
        val = JSON.stringify(val);
    }

    if (empty(val)) {
        // ensure empty string, rather than empty array, undefined, null, etc
        val = '';
    }
    return val;
}

/**
 * @param {*} str
 * @returns {boolean}
 */
function isNonEmptyString(str) {
    return typeof(str) === 'string' && str !== '';
}

/**
 * Strip XML namespace (interferes with MC xml parser otherwise)
 * @param xmlStr
 * @returns {string}
 */
function stripXmlNS(xmlStr) {
    return xmlStr.replace(/\s+xmlns="[^"]+"/g, '');
}

/**
 * Appends XML nodes for price adjustment information which is not included in
 * the default XML output for the `getOrderExportXML()` call. These additional
 * data fields are needed for order confirmation email sends in Marketing Cloud.
 *
 * @param {string} xmlStr - The XML as a string.
 * @returns {string} - The modified XML string.
 */
function getModXML(xmlStr) {
    var Logger = require('dw/system/Logger');
    var Money = require('dw/value/Money');
    var OrderMgr = require('dw/order/OrderMgr');
    var comLogger = Logger.getLogger('email', 'communication');
    var logPrefix = 'Communication Log :: int_marketing_cloud - helpers.js:';

    try {
        // Create an XML class instance from the XML string.
        var xml = new XML(xmlStr);

        // Get the XML line items.
        var plisXML = !empty(xml['product-lineitems']) ? xml['product-lineitems'] : [];
        var pliXmlList = !empty(plisXML) ? plisXML.children() : {};

        // Get the order number from the XML & lookup the order.
        var orderNo = xml.@['order-no'];
        var order = !empty(orderNo) ? OrderMgr.getOrder(orderNo) : null;
        var productAdjustmentsArray = [];
        var merchNetTotal = order.getMerchandizeTotalNetPrice();
        var merchAdjustedNetTotal = order.getAdjustedMerchandizeTotalNetPrice();
        var pliAdjustmentsTotal = new Money(0.0, order.currencyCode);

        // If the order can't be found then log the error and reutrn the
        // original xml string.
        if (empty(order) || order.productLineItems.empty) {
            comLogger.error(logPrefix + '\n\tUnable to add adjustemnts to the ' +
            'Order Confirmation Email for order #: {0}', orderNo);
            return xmlStr;
        }

        // Create a record for each line-item that has an adjusted net price that
        // does not match the original net price.
        order.productLineItems.toArray().forEach(function (lineItem) {
            if (lineItem.adjustedNetPrice.decimalValue !== lineItem.netPrice.decimalValue) {
                productAdjustmentsArray.push({
                    adjustedGrossPrice: lineItem.adjustedGrossPrice.decimalValue,
                    adjustedNetPrice: lineItem.adjustedNetPrice.decimalValue,
                    quantity: lineItem.quantityValue,
                    productId: lineItem.productID,
                    shipmentNo: lineItem.shipment.shipmentNo
                });

                // Get the total of the product-level price adjustments.
                var itemAdjustmentTotal = lineItem.netPrice.subtract(lineItem.adjustedNetPrice);

                // Add the adjustment to the total for all product level adjustments.
                pliAdjustmentsTotal = pliAdjustmentsTotal.add(itemAdjustmentTotal);
            }
        });

        // Calculate the order-level discount total.
        var orderDiscountTotal = merchNetTotal.subtract(merchAdjustedNetTotal)
            .subtract(pliAdjustmentsTotal);

        // If there are order level adjustments create the XML for an order-level
        // discount total, and a pre-discount order sub-total.
        if (orderDiscountTotal !== 0 && !empty(xml['totals'])) {
            var preDiscountTotal = merchAdjustedNetTotal.add(orderDiscountTotal).decimalValue;
            var orderTotals = xml['totals'];
            var orderDiscountXML = new XML('<order-discount-total>' +
                orderDiscountTotal.decimalValue + '</order-discount-total>');
            var preDiscountXML = new XML('<pre-discount-total>' +
                preDiscountTotal + '</pre-discount-total>')

            orderTotals.appendChild(orderDiscountXML);
            orderTotals.appendChild(preDiscountXML);
        }

        // If there are line items in the XML then find the items with the
        // same position in the LineItemCtnr as each adjustment in the array
        // and append the adjusted prices.
        if (!empty(pliXmlList) && !empty(productAdjustmentsArray)) {
            var i = 0;
            var len = pliXmlList.length();

            while (i < len) {
                var pli = pliXmlList[i];
                var adjs = null;

                // Read necessary fields from product XML.
                var productId = pli['product-id'].toString();
                var quantity = Number(pli['quantity']);
                var shipmentId = pli['shipment-id'].toString();
                var lineItemPAs = 'price-adjustments' in pli ?
                    pli['price-adjustments'] : [];

                /*
                 * Find the ProductLineItem from the XML to append the adjusted
                 * net & gross price XML nodes to.
                 *
                 * NOTE: In the SFCC API the Shipment.shipmentNo is mapped to
                 * the <shipment-id></shipment-id> XML tag when calling the
                 * Order.getOrderExportXML() method.
                 */
                productAdjustmentsArray.forEach(function (productAdjs) {
                    if (productAdjs.productId === productId &&
                        productAdjs.quantity === quantity &&
                        productAdjs.shipmentNo === shipmentId &&
                        !empty(lineItemPAs) &&
                        !empty(lineItemPAs.children())
                    ) {
                        adjs = productAdjs;
                    }
                });

                if (!empty(adjs)) {
                    var adjustedNetPrice = new XML('<adjusted-net-price>' +
                        adjs.adjustedNetPrice + '</adjusted-net-price>');
                    var adjustedGrossPrice = new XML('<adjusted-gross-price>' +
                        adjs.adjustedGrossPrice + '</adjusted-gross-price>');
                    pli.appendChild(adjustedNetPrice);
                    pli.appendChild(adjustedGrossPrice);
                }

                i++;
            };
        }
    } catch (e) {
        var logMsg = logPrefix + '\n\tERROR at getModXML():';
        logMsg += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        comLogger.error(logMsg);

        // In case of an error, return the original XML string.
        return xmlStr;
    }

    return xml.toString();
}

/**
 * Custom error, thrown when required attribute is missing.
 * @param {string} attribute Attribute that is missing
 * @param {string} [message] Optional custom message
 * @constructor
 */
function RequiredAttributeException(attribute, message) {
    this.name = 'RequiredAttributeException';
    this.attribute = attribute;
    this.message = message || 'Required attribute "'+ attribute +'" is missing.';
    this.stack = (new Error()).stack;
}

RequiredAttributeException.prototype = Object.create(Error.prototype);
RequiredAttributeException.prototype.constructor = RequiredAttributeException;

exports.isObject = isObject;
exports.ucfirst = ucfirst;
exports.dwValue = dwValue;
exports.expandAttributes = expandAttributes;
exports.getCustomObject = getCustomObject;
exports.mergeAttributes = mergeAttributes;
exports.getParamValue = getParamValue;
exports.getModXML = getModXML;
exports.mapValues = mapValues;
exports.objValues = objValues;
exports.buildSimpleArrayFromIterable = buildSimpleArrayFromIterable;
exports.buildMappedArrayFromIterable = buildMappedArrayFromIterable;
exports.mappingFilter = mappingFilter;
exports.isNonEmptyString = isNonEmptyString;
exports.stripXmlNS = stripXmlNS;
exports.RequiredAttributeException = RequiredAttributeException;
exports.initiateTransform = initiateTransform;