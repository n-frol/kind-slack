/* global empty */
'use strict';
var OrderMgr = require('dw/order/OrderMgr');
var OrderModel = require('*/cartridge/models/order');
var Locale = require('dw/util/Locale');
var URLUtils = require('dw/web/URLUtils');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

var accountController = module.superModule;
var server = require('server');

server.extend(accountController);


server.append(
    'ShippingDetails',
    consentTracking.consent,
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var params = req.querystring;
        var orderCustomerNo = req.currentCustomer.profile.customerNo;
        var orderNumber = params.orderID;
        var orderObj;
        var order;

        if (!empty(orderNumber)) {
            orderObj = OrderMgr.getOrder(orderNumber);

            if (orderObj && orderCustomerNo === orderObj.customer.profile.customerNo) {
                var currentLocale = Locale.getLocale(req.locale.id);

                var config = {
                    numberOfLineItems: '*'
                };

                order = new OrderModel(orderObj, {
                    config: config,
                    countryCode: currentLocale.country,
                    containerView: 'order'
                });
            } else {
                res.redirect(URLUtils.url('Account-Show'));
            }
        } else {
            res.redirect(URLUtils.url('Account-Show'));
        }

        var LincService = require('*/cartridge/scripts/service/lincService');
        var Linc = require('*/cartridge/models/linc');
        var linc = new Linc();

        var checkExistingOrder = LincService.getOrder(orderNumber);

        const isExist = Object.hasOwnProperty.call(checkExistingOrder, 'error_message');
        if (isExist) {
            return next();
        }

        res.render('account/orderTracking', {
            isDevActive: linc.isDevEnable,
            shopId: linc.publicId,
            orderId: orderNumber,
            email: order.orderEmail
        });

        return next();
    }
);

module.exports = server.exports();
