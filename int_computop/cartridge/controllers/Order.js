'use strict';

var orderController = module.superModule;
var server = require('server');

var URLUtils = require('dw/web/URLUtils');
var LoginRadius = require('*/cartridge/models/loginRadius');

server.extend(orderController);

/**
 * Clear payment operator session data after order confirmation
 */
server.append(
    'Confirm',
    server.middleware.https,
    function (req, res, next) {
        var paymentOperatorData = {};
        var viewData = res.getViewData();

        var Locale = require('dw/util/Locale');
        var OrderModel = require('*/cartridge/models/order');
        var orderMgr = require('dw/order/OrderMgr');
        var order = orderMgr.getOrder(req.querystring.ID);

        if (order) {
            var currentLocale = Locale.getLocale(req.locale.id);

            var orderModel = new OrderModel(
                order,
                { countryCode: currentLocale.country, containerView: 'order' }
            );

            viewData.order = orderModel;

            var paymentMethodID;
            var paymentInstruments = orderModel.billing.payment.selectedPaymentInstruments;
            for (var i = 0; i < paymentInstruments.length; i++) {
                var instrument = paymentInstruments[i];
                if (instrument.paymentMethod.indexOf('PAYMENTOPERATOR', 0) > -1) {
                    paymentMethodID = instrument.paymentMethod;
                }
                if ('PAYMENTOPERATOR_EASYCREDIT'.equals(paymentMethodID)) {
                    paymentOperatorData.ecInterestAmount = instrument.easycreditInterestAmount;
                }
            }

            // get data from session
            var sessionHelper = require('~/cartridge/scripts/computop/util/SessionDataConversion');
            var sessionData = sessionHelper.getPaymentDataFromSession(paymentMethodID, true);
            Object.keys(sessionData).forEach(function (key) {
                paymentOperatorData[key] = sessionData[key];
            });

            viewData.paymentOperator = paymentOperatorData;

            if (!req.currentCustomer.profile) {
                viewData.loginRadius = new LoginRadius();
                viewData.loginRadiusForwardingURL = URLUtils.url('Account-Show');
            }

            res.setViewData(viewData);
        }
        // unset formerly set creditdirect svc
        req.session.privacyCache.set('PaymentOperatorCCSecurityCode', false);
        req.session.privacyCache.set('PaymentOperatorCCUUID', false);

        return next();
    }
);

module.exports = server.exports();
