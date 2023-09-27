/* global empty */

'use strict';

/**
 * PaymentInstruments.js
 * @extends app_storefront_base
 *
 * Provides overrides and extensions to the base PaymentInstrument endpoints.
 */


// SFRA Includes
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
var server = require('server');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var CustomerMgr = require('dw/customer/CustomerMgr');

server.extend(module.superModule);

/**
 * Creates a list of expiration years from the current year
 * @returns {List} a plain list of expiration years from current year
 */
function getExpirationYears() {
    var currentYear = new Date().getFullYear();
    var creditCardExpirationYears = [];

    for (var i = 0; i < 10; i++) {
        creditCardExpirationYears.push((currentYear + i).toString());
    }

    return creditCardExpirationYears;
}


// eslint-disable-next-line valid-jsdoc
/**
 * Returns selected payment instrument
 * @param UUID string
 * @param wallet dw.customer.Wallet
 * @return {dw.customer.CustomerPaymentInstrument}
 */
function getPaymentInstrumentByUuid(UUID, wallet) {
    var collections = require('*/cartridge/scripts/util/collections');
    var paymentInstrument = collections.find(wallet.getPaymentInstruments(), function (instrument) {
        return instrument.UUID === UUID;
    });
    return paymentInstrument;
}

server.append(
    'AddPayment',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var URLUtils = require('dw/web/URLUtils');
        var Resource = require('dw/web/Resource');

        var creditCardExpirationYears = getExpirationYears();
        var paymentForm = server.forms.getForm('creditCard');
        paymentForm.clear();
        var months = paymentForm.expirationMonth.options;
        for (var j = 0, k = months.length; j < k; j++) {
            months[j].selected = false;
        }
        res.render('account/payment/editAddPayment', {
            paymentForm: paymentForm,
            expirationYears: creditCardExpirationYears,
            breadcrumbs: [
                {
                    htmlValue: Resource.msg('global.home', 'common', null),
                    url: URLUtils.home().toString()
                },
                {
                    htmlValue: Resource.msg('page.title.myaccount', 'account', null),
                    url: URLUtils.url('Account-Show').toString()
                },
                {
                    htmlValue: Resource.msg('page.heading.payments', 'payment', null),
                    url: URLUtils.url('PaymentInstruments-List').toString()
                }
            ]
        });

        next();
    }
);

/**
 * @extends PaymentInstruments-List
 */
server.append('List', function (req, res, next) {
    var ContentMgr = require('dw/content/ContentMgr');

    var contentAsset = ContentMgr.getContent('myaccount-paymentsettings');

    var viewData = res.getViewData();

    var customer = CustomerMgr.getCustomerByCustomerNumber(
        req.currentCustomer.profile.customerNo
    );

    viewData.defaultPaymentInstrument = customer.profile.custom.defaultPaymentInstrument;

    res.setViewData(viewData);

    if (!empty(contentAsset)) {
        pageMetaHelper.setPageMetaData(req.pageMetaData, contentAsset);
    }

    next();
}, pageMetaData.computedPageMetaData);

server.append('SavePayment', function (req, res, next) {
    var f = req.form;
    var RecaptchaService = require('~/cartridge/scripts/recaptcha/RecaptchaService');
    var Site = require('dw/system/Site');
    var svc = RecaptchaService.get();
    var site = require('dw/system/Site').getCurrent();
    var secret = site.getCustomPreferenceValue('recaptcha3_secret');
    var resp = svc.call({
        secret: secret,
        response: f.recpatcharesponse,
        remoteip: request.httpRemoteAddress
    });

    var score = resp.object.score;
    var isSuccess = false;
    if (score > Site.current.getCustomPreferenceValue("recaptcha3_score")) {
        isSuccess = true;
    } else {
        isSuccess = false;
    }
    if (isSuccess) {
        this.on('route:Complete', function (req, res) { // eslint-disable-line no-shadow
            var formInfo = res.getViewData();
            if (!empty(res.viewData.success) && res.viewData.success) {
                var Calendar = require('dw/util/Calendar');
                var Transaction = require('dw/system/Transaction');
                var customer = CustomerMgr.getCustomerByCustomerNumber(
                    req.currentCustomer.profile.customerNo
                );
                var wallet = customer.getProfile().getWallet();
                var paymentInstruments = wallet.getPaymentInstruments('CREDIT_CARD');
                var ppPaymentInstruments = wallet.getPaymentInstruments('PayPal');
                if (!ppPaymentInstruments.empty) {
                    paymentInstruments.addAll(ppPaymentInstruments);
                }
                var paymentInstrumentIterator = paymentInstruments.iterator();
                var mostRecentPaymentInstrument = null;
                // because SFRA does not pass back the newly added payment instrument's
                // UUID in the view, we'll need to iterate through and find the most
                // recently modified one.
                Transaction.wrap(function () {
                    var currentPaymentInstrument = null;
                    while (paymentInstrumentIterator.hasNext()) {
                        currentPaymentInstrument = paymentInstrumentIterator.next();
                        if (empty(mostRecentPaymentInstrument)) {
                            // if empty, initialize to first payment method
                            mostRecentPaymentInstrument = currentPaymentInstrument;
                        } else {
                            // if the current payment instrument is newer, update most recent
                            var currentPaymentInstrumentCalendar = new Calendar(currentPaymentInstrument.getLastModified());
                            var mostRecentPaymentInstrumentCalendar = new Calendar(mostRecentPaymentInstrument.getLastModified());
                            if (currentPaymentInstrumentCalendar.compareTo(mostRecentPaymentInstrumentCalendar) > 0) {
                                mostRecentPaymentInstrument = currentPaymentInstrument;
                            }
                        }
                    }
                    if (!empty(mostRecentPaymentInstrument)) {
                        // save billing address to payment instrument
                        mostRecentPaymentInstrument.custom.address1 = formInfo.paymentForm.address1.htmlValue;
                        mostRecentPaymentInstrument.custom.address2 = formInfo.paymentForm.address2.htmlValue;
                        mostRecentPaymentInstrument.custom.city = formInfo.paymentForm.city.htmlValue;
                        mostRecentPaymentInstrument.custom.stateCode = formInfo.paymentForm.states.stateCode.htmlValue;
                        mostRecentPaymentInstrument.custom.postalCode = formInfo.paymentForm.postalCode.htmlValue;
                        mostRecentPaymentInstrument.custom.phone = !empty(formInfo.paymentForm.phone) ? formInfo.paymentForm.phone.htmlValue : null;
                        // save default payment instrument UUID if checked (or only payment instrument)
                        if (formInfo.paymentForm.makeDefaultPayment.checked || (paymentInstruments.length === 1)) {
                            // iterate through payment instruments and unset preferred
                            paymentInstrumentIterator = paymentInstruments.iterator();
                            while (paymentInstrumentIterator.hasNext()) {
                                currentPaymentInstrument = paymentInstrumentIterator.next();
                                currentPaymentInstrument.custom.preferred = false;
                            }
                            // set the preferred flag and the default payment UUID
                            mostRecentPaymentInstrument.custom.preferred = true;
                            customer.profile.custom.defaultPaymentInstrument = mostRecentPaymentInstrument.UUID;
                        }
                    }
                });
            }
        });
    } else {
        var Logger = require('dw/system/Logger');
        res.json({
            success: false,
            recpatcha: false,
            error: ['Please fill out recaptcha field']
        });
        var customerNo = req.currentCustomer.profile.customerNo;
        Logger.error('Server side recaptcha faild. Customer Id is {0}', customerNo);
    }
    next();
});

server.get('SetDefaultPayment', userLoggedIn.validateLoggedInAjax, function (req, res, next) {
    var UUID = req.querystring.UUID;

    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        var Transaction = require('dw/system/Transaction');

        Transaction.wrap(function () {
            var customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );

            var wallet = customer.getProfile().getWallet();
            var paymentInstruments = wallet.getPaymentInstruments('CREDIT_CARD');
            var ppPaymentInstruments = wallet.getPaymentInstruments('PayPal');
            var applePayPaymentInstuments = wallet.getPaymentInstruments('DW_APPLE_PAY');

            if (!ppPaymentInstruments.empty) {
                paymentInstruments.addAll(ppPaymentInstruments);
            }

            if (!applePayPaymentInstuments.empty) {
                paymentInstruments.addAll(applePayPaymentInstuments);
            }

            var paymentInstrumentIterator = paymentInstruments.iterator();

            // loop through payment methods and unset the preferred flags
            while (paymentInstrumentIterator.hasNext()) {
                var currentPaymentInstrument = paymentInstrumentIterator.next();

                if (currentPaymentInstrument.UUID === UUID) {
                    // set the preferred flag on the current preferred
                    currentPaymentInstrument.custom.preferred = true;
                    customer.profile.custom.defaultPaymentInstrument = UUID;
                } else {
                    currentPaymentInstrument.custom.preferred = false;
                }
            }
        });

        res.json({ UUID: UUID });
    });

    return next();
});

server.get('EditPayment',
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedIn,
    function (req, res, next) {
        var customerNumber = req.currentCustomer.profile.customerNo;
        var customer = CustomerMgr.getCustomerByCustomerNumber(customerNumber);
        var wallet = customer.getProfile().getWallet();
        var UUID = req.querystring.UUID;
        var paymentInstrument = getPaymentInstrumentByUuid(UUID, wallet);
        var paymentForm = server.forms.getForm('creditCard');
        paymentForm.clear();

        paymentForm.cardOwner.value = Object.prototype.hasOwnProperty.call(paymentInstrument, "creditCardHolder") ?
            paymentInstrument.creditCardHolder : '';
        paymentForm.editNumber.value = Object.prototype.hasOwnProperty.call(paymentInstrument, "maskedCreditCardNumber") ?
            '***************' + paymentInstrument.maskedCreditCardNumber : '';

        var expirationMonth = Object.prototype.hasOwnProperty.call(paymentInstrument, "creditCardExpirationMonth") ?
            paymentInstrument.creditCardExpirationMonth : 0;
        var months = paymentForm.expirationMonth.options;
        for (var j = 0, k = months.length; j < k; j++) {
            /* eslint-disable no-unused-expressions */
            months[j].value === expirationMonth ? months[j].selected = true : months[j].selected = false;
        }

        paymentForm.expirationYear.value = Object.prototype.hasOwnProperty.call(paymentInstrument, "creditCardExpirationYear") ?
            paymentInstrument.creditCardExpirationYear : '';

        paymentForm.address1.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "address1") ?
            paymentInstrument.custom.address1 : '';
        paymentForm.address2.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "address1") ?
            paymentInstrument.custom.address2 : '';
        paymentForm.city.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "city") ?
            paymentInstrument.custom.city : '';
        paymentForm.postalCode.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "postalCode") ?
            paymentInstrument.custom.postalCode : '';
        paymentForm.states.stateCode.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "stateCode") ?
            paymentInstrument.custom.stateCode : '';
        paymentForm.phone.value = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "phone") ?
            paymentInstrument.custom.phone : '';
        paymentForm.makeDefaultPayment.htmlValue = Object.prototype.hasOwnProperty.call(paymentInstrument.custom, "preferred") ?
            paymentInstrument.custom.preferred : '';

        res.render('account/payment/editPayment', {
            UUID: UUID,
            paymentForm: paymentForm,
            expirationYears: getExpirationYears()
        });
        next();
    });

module.exports = server.exports();
