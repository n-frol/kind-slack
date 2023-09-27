'use strict';

var cart = require('app_storefront_base/cartridge/controllers/Cart');
var server = require('server');

server.extend(cart);

server.append('AddProduct', function (req, res, next) {
    if (req.form) {
        var pid = req.form.pid;
        var zmagsSource = req.form.zmagssrc;
        if (pid && zmagsSource) {
            var zmagsCreator = require('~/cartridge/scripts/ZmagsCreator');
            var items = zmagsCreator.getItems(pid);
            zmagsCreator.tagItems(items, zmagsSource);
        }
    }
    next();
});

module.exports = server.exports();
