/* globals session */

'use strict';

var checkout = module.superModule;
var server = require('server');

server.extend(checkout);

/**
 * Append paymentoperator data to view data
 */
server.append(
    'Begin',
    server.middleware.https,
    function (req, res, next) {
        var paymentOperatorData = {};
        var viewData = res.getViewData();
        var BasketMgr = require('dw/order/BasketMgr');
        var CustomerMgr = require('dw/customer/CustomerMgr');
        var Money = require('dw/value/Money');
        var currentBasket = BasketMgr.getCurrentBasket();
        var isRefTransaction = req.querystring.ppRefTrans;

        if (currentBasket) {
            var paymentMethodID;
            var paymentInstruments = currentBasket.paymentInstruments.iterator();
            while (paymentInstruments.hasNext()) {
                var instrument = paymentInstruments.next();
                if (instrument.getPaymentMethod().indexOf('PAYMENTOPERATOR', 0) > -1) {
                    paymentMethodID = instrument.getPaymentMethod();
                }
                if ('PAYMENTOPERATOR_EASYCREDIT'.equals(paymentMethodID)
                    && instrument.custom.paymentOperatorECInterestAmount
                ) {
                    paymentOperatorData.ecInterestAmount = new Money(
                        instrument.custom.paymentOperatorECInterestAmount,
                        instrument.paymentTransaction.amount.currencyCode
                    );
                }
            }

            // retrieve data from session
            var sessionHelper = require('~/cartridge/scripts/computop/util/SessionDataConversion');
            var sessionData = sessionHelper.getPaymentDataFromSession(paymentMethodID);
            Object.keys(sessionData).forEach(function (key) {
                paymentOperatorData[key] = sessionData[key];
            });

            // remove payment methods except express methods - maybe required as easycredit interests remain in order
            // payment instrument even when basket totalGrossPrice changes
            var isExpressCheckout = req.session.privacyCache.get('PaypalExpressData') || req.session.privacyCache.get('MasterPassQuickCheckoutData');
            if (!isExpressCheckout) {
                // FIXME check with computop if easycredit method needs to be removed
                // require('*/cartridge/scripts/computop/util/Checkout').removePaymentOperatorInstrumentsFromBasket();
            }
        }
        // unset creditdirect svc
        req.session.privacyCache.set('PaymentOperatorCCSecurityCode', false);
        req.session.privacyCache.set('PaymentOperatorCCUUID', false);

        // paymentoperator errors - from failure redirects
        if (req.session.privacyCache.get('paymentOperatorError')) {
            paymentOperatorData.error = req.session.privacyCache.get('paymentOperatorError');
            req.session.privacyCache.set('paymentOperatorError', false);
        }

        viewData.paymentOperator = paymentOperatorData;
        if (!empty(req.currentCustomer.profile)) {
            var customer = CustomerMgr.getCustomerByCustomerNumber(req.currentCustomer.profile.customerNo);
            var wallet = customer.getProfile().getWallet();
            var instruments = wallet.getPaymentInstruments().iterator();
            var defaultPaymentInstrumentUUID = customer.profile.custom.defaultPaymentInstrument;
            while (instruments.hasNext()) {
                var instrument = instruments.next();
                if(instrument.getUUID() == defaultPaymentInstrumentUUID && instrument.getPaymentMethod() != instrument.METHOD_DW_APPLE_PAY){
                    viewData.defaultPaymentInstrument = customer.profile.custom.defaultPaymentInstrument;
                }
            }
        }

        viewData.isRefTransaction = isRefTransaction;
        res.setViewData(viewData);

        return next();
    }
);

module.exports = server.exports();
