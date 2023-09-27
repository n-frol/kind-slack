'use strict';

var orderController = module.superModule;
var server = require('server');

server.extend(orderController);

/**
 * Create a order in linc after order confirmation
 */
server.append(
    'Confirm',
    server.middleware.https,
    function (req, res, next) {
        var orderMgr = require('dw/order/OrderMgr');
        var order = orderMgr.getOrder(req.querystring.ID);
        var HookMgr = require('dw/system/HookMgr');
        // order create hook
        if (HookMgr.hasHook('app.kind.linc.order')) {
            HookMgr.callHook('app.kind.linc.order', 'createOrder', order);
        }

        return next();
    }
);

server.append(
    'Track',
    server.middleware.https,
    function (req, res, next) {
        var OrderMgr = require('dw/order/OrderMgr');
        var OrderModel = require('*/cartridge/models/order');
        var Locale = require('dw/util/Locale');
        var order;
        var validForm = true;
        var profileForm = server.forms.getForm('profile');
        profileForm.clear();

        var LincService = require('*/cartridge/scripts/service/lincService');
        var Linc = require('*/cartridge/models/linc');
        var linc = new Linc();

        var checkExistingOrder = LincService.getOrder(req.form.trackOrderNumber);

        const isExist = Object.hasOwnProperty.call(checkExistingOrder, 'error_message');
        if (isExist) {
            return next();
        }

        if (req.form.trackOrderEmail
            && req.form.trackOrderPostal
            && req.form.trackOrderNumber) {
            order = OrderMgr.getOrder(req.form.trackOrderNumber);
        } else {
            validForm = false;
        }

        if (!order) {
            return next();
        }
        var config = {
            numberOfLineItems: '*'
        };

        var currentLocale = Locale.getLocale(req.locale.id);

        var orderModel = new OrderModel(
                order,
                { config: config, countryCode: currentLocale.country, containerView: 'order' }
            );

            // check the email and postal code of the form
        if (req.form.trackOrderEmail.toLowerCase()
                !== orderModel.orderEmail.toLowerCase()) {
            validForm = false;
        }

        if (req.form.trackOrderPostal
                !== orderModel.billing.billingAddress.address.postalCode) {
            validForm = false;
        }

        if (validForm) {
            res.render('account/orderTracking', {
                isDevActive: linc.isDevEnable,
                shopId: linc.publicId,
                orderId: req.form.trackOrderNumber,
                email: req.form.trackOrderEmail
            });
        } else {
            return next();
        }

        return next();
    }
);

module.exports = server.exports();
