/* global empty */
'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var OrderModel = require('*/cartridge/models/order');
var Locale = require('dw/util/Locale');
var URLUtils = require('dw/web/URLUtils');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

// SFRA Includes
var server = require('server');

server.get('ShippingDetails',
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

        var exitLinkUrl =
                URLUtils.https('Order-Details', 'orderID', req.querystring.orderID, 'orderFilter', req.querystring.orderFilter);

        res.render('account/shippingDetails', {
            exitLinkUrl: exitLinkUrl,
            order: order,
            showByobLineItems: true
        });

        next();
    }
);

server.extend(module.superModule);

module.exports = server.exports();
