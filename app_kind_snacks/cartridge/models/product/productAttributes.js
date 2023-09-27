'use strict';

var urlHelper = require('*/cartridge/scripts/helpers/urlHelpers');
var ImageModel = require('*/cartridge/models/product/productImages');
var variationHelpers = require('*/cartridge/scripts/helpers/variationHelpers');
var collections = require('*/cartridge/scripts/util/collections');

/**
 * Determines whether a product attribute has image swatches.  Currently, the only attribute that
 *     does is Color.
 * @param {string} dwAttributeId - Id of the attribute to check
 * @returns {boolean} flag that specifies if the current attribute should be displayed as a swatch
 */
function isSwatchable(dwAttributeId) {
    // Currently no "swatchable" attributes
    var imageableAttrs = [];
    return imageableAttrs.indexOf(dwAttributeId) > -1;
}

/**
 * Gets Processed Value Object
 *
 * @param {dw.catalog.ProductVariationAttributeValue} value - A attribute value
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {dw.catalog.ProductVariationAttributeValue} selectedValue - Selected attribute value
 * @param {dw.catalog.ProductVariationAttribute} attr - Attribute value'
 * @param {string} endPoint - The end point to use in the Product Controller
 * @param {string} selectedOptionsQueryParams - Selected options query params
 * @param {string} quantity - Quantity selected
 * @returns {Object[]} - List of attribute value objects for template context
 */
function getProcessedValueObject(
    value,
    variationModel,
    selectedValue,
    attr,
    endPoint,
    selectedOptionsQueryParams,
    quantity
) {
    var actionEndpoint = 'Product-' + endPoint;
    var isSelected = (selectedValue && selectedValue.equals(value)) || false;
    var valueUrl = '';

    var processedValue = {
        id: value.ID,
        description: value.description,
        displayValue: value.displayValue,
        value: value.value,
        selected: isSelected,
        selectable: variationModel.hasOrderableVariants(attr, value)
    };

    if (processedValue.selectable) {
        var unselectedURL = variationModel.urlUnselectVariationValue(actionEndpoint, attr);
        var selectedURL = variationModel.urlSelectVariationValue(actionEndpoint, attr, value);
        valueUrl = (isSelected && endPoint !== 'Show') ? unselectedURL : selectedURL;
        processedValue.url = urlHelper.appendQueryParams(valueUrl, [selectedOptionsQueryParams,
            'quantity=' + quantity]);
    }

    if (isSwatchable(attr.attributeID)) {
        processedValue.images = new ImageModel(value, { types: ['swatch'], quantity: 'all' });
    }

    return processedValue;
}

/**
 * Retrieve all filtered attribute values
 *
 * @param {Object} attrValues - filtered attribute values
 * @param {dw.catalog.ProductVariationModel} variationModel - A product's variation model
 * @param {dw.catalog.ProductVariationAttributeValue} selectedValue - Selected attribute value
 * @param {dw.catalog.ProductVariationAttribute} attr - Attribute value'
 * @param {string} endPoint - The end point to use in the Product Controller
 * @param {string} selectedOptionsQueryParams - Selected options query params
 * @param {string} quantity - Quantity selected
 * @returns {Object[]} - List of attribute value objects for template context
 */
function getAllFilteredAttrValues(
    attrValues,
    variationModel,
    selectedValue,
    attr,
    endPoint,
    selectedOptionsQueryParams,
    quantity
) {
    var filteredAttrValues = [];

    collections.forEach(attrValues, function (value, index) {
        var getValueObject = getProcessedValueObject(
            value,
            variationModel,
            selectedValue,
            attr,
            endPoint,
            selectedOptionsQueryParams,
            quantity
        );

        filteredAttrValues.push(getValueObject);
    });

    return filteredAttrValues;
}

/**
 * Gets the Url needed to relax the given attribute selection, this will not return
 * anything for attributes represented as swatches.
 *
 * @param {Array} values - Attribute values
 * @param {string} attrID - id of the attribute
 * @returns {string} -the Url that will remove the selected attribute.
 */
function getAttrResetUrl(values, attrID) {
    var urlReturned;
    var value;

    for (var i = 0; i < values.length; i++) {
        value = values[i];
        if (!value.images) {
            if (value.selected) {
                urlReturned = value.url;
                break;
            }

            if (value.selectable) {
                urlReturned = value.url.replace(attrID + '=' + value.value, attrID + '=');
                break;
            }
        }
    }

    return urlReturned;
}

/**
 * @constructor
 * @classdesc Get a list of available attributes that matches provided config
 *
 * @param {dw.catalog.ProductVariationModel} variationModel - current product variation
 * @param {Object} attrConfig - attributes to select
 * @param {Array} attrConfig.attributes - an array of strings,representing the
 *                                        id's of product attributes.
 * @param {string} attrConfig.attributes - If this is a string and equal to '*' it signifies
 *                                         that all attributes should be returned.
 *                                         If the string is 'selected', then this is comming
 *                                         from something like a product line item, in that
 *                                         all the attributes have been selected.
 *
 * @param {string} attrConfig.endPoint - the endpoint to use when generating urls for
 *                                       product attributes
 * @param {string} selectedOptionsQueryParams - Selected options query params
 * @param {string} quantity - Quantity selected
 */
function VariationAttributesModel(
    variationModel,
    attrConfig,
    selectedOptionsQueryParams,
    quantity
) {
    var result = [];

    variationHelpers.collectFilteredVariants(variationModel,
        function (productVariationModel, visibleVariants, selectedValue, attr, filteredValues) {
            var values = getAllFilteredAttrValues(
                filteredValues,
                productVariationModel,
                selectedValue,
                attr,
                attrConfig.endPoint,
                selectedOptionsQueryParams,
                quantity
            );

            var resetUrl = getAttrResetUrl(values, attr.ID);
            var isVisible = true;

            if (filteredValues.length === 1) {
                isVisible = false;
            }

            result.push({
                attributeId: attr.attributeID,
                displayName: attr.displayName,
                displayValue: selectedValue && selectedValue.displayValue ? selectedValue.displayValue : '',
                id: attr.ID,
                swatchable: isSwatchable(attr.attributeID),
                values: values,
                resetUrl: resetUrl,
                isVisible: isVisible
            });
        }
    );

    result.forEach(function (item) {
        this.push(item);
    }, this);
}

VariationAttributesModel.prototype = [];

module.exports = VariationAttributesModel;
