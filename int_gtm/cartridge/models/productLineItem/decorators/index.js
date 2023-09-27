'use strict';

const assign = require('server/assign');

module.exports = assign(module.superModule, {
    gtmItemVariant: require('*/cartridge/models/productLineItem/decorators/gtmItemVariant'),
    gtmItemListName: require('*/cartridge/models/productLineItem/decorators/gtmItemListName')
});
