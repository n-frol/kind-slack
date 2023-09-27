'use strict';

var formatMoney = require('dw/util/StringUtils').formatMoney;

module.exports = function (object, lineItem) {

    var proratedPrice = lineItem.proratedPrice.divide(lineItem.quantityValue);

	var result = {};
	result.decimal = proratedPrice.value;
	result.formatted = formatMoney(proratedPrice);

    Object.defineProperty(object, 'proratedPrice', {
        value: result
    });
};

