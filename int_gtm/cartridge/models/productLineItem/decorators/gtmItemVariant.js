'use strict';

module.exports = function (object, lineItem) {
    let gtmItemVariant = "";

    if (lineItem.custom.gtmItemVariant && lineItem.custom.gtmItemVariant !== "") {
        gtmItemVariant = lineItem.custom.gtmItemVariant;
    }

    Object.defineProperty(object, 'gtmItemVariant', {
        enumerable: true,
        value: gtmItemVariant
    });
};

