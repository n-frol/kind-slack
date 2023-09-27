'use strict';

module.exports = function (object, lineItem) {
    Object.defineProperty(object, 'subscriptionType', {
        enumerable: true,
        writable: true,
        value: lineItem.custom.subscriptionType
    });
};
