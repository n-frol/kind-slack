'use strict';

module.exports = function (object, lineItem) {
    let gtmItemListName = "";

    if (lineItem.custom.gtmItemListName && lineItem.custom.gtmItemListName !== "") {
        gtmItemListName = lineItem.custom.gtmItemListName;
    }

    Object.defineProperty(object, 'gtmItemListName', {
        enumerable: true,
        value: gtmItemListName
    });
};
