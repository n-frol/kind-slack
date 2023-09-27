'use strict';

var componentHelpers = require('*/cartridge/scripts/helpers/componentHelper');

module.exports = function (object, apiProduct) {
    Object.defineProperty(object, 'components', {
        enumerable: true,
        writable: true,
        value: componentHelpers.getComponents(apiProduct)
    });
};
