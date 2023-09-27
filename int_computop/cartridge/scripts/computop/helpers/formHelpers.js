'use strict';

var BasketMgr = require('dw/order/BasketMgr');
var Resource = require('dw/web/Resource');

var formErrors = require('*/cartridge/scripts/formErrors');

/**
 * @var {Object} methodsWithForms - payment operator methods that come with form fields
 */
var methodsWithForms = {
    PAYMENTOPERATOR_BANCONTACT:         'bancontact',
    PAYMENTOPERATOR_CREDIT:             'paymentoperatorcreditcard',
    PAYMENTOPERATOR_CREDIT_DIRECT:      'creditdirect',
    PAYMENTOPERATOR_DIRECT_DEBIT_SEPA:  'directdebitsepa',
    PAYMENTOPERATOR_EPS:                'eps',
    PAYMENTOPERATOR_GIROPAY:            'giropay',
    PAYMENTOPERATOR_IDEAL:              'ideal',
    PAYMENTOPERATOR_KLARNA:             'klarna',
    PAYMENTOPERATOR_PAYGATE_CHINA:      'paygatechina',
    PAYMENTOPERATOR_PAYMORROW_INVOICE:  'paymorrowbml',
    PAYMENTOPERATOR_PAYMORROW_SDD:      'paymorrowsdd',
    PAYMENTOPERATOR_QIWI:               'qiwi'
};

/**
 * Validate payment form for selected payment method
 * @param {dw.web.Form} paymentForm - billing form containing payment form fields
 * @returns {Object} - with form errors
 */
function validatePaymentForms(paymentForm) {
    var result = {};
    var selectedPaymentMethod = paymentForm.paymentMethod.value;

    var currentBasket = BasketMgr.getCurrentBasket();

    if (!selectedPaymentMethod) {
        if (currentBasket.totalGrossPrice.value > 0) {
            result[paymentForm.paymentMethod.htmlName] =
                Resource.msg('error.no.selected.payment.method', 'paymentoperator', null);
        }

        return result;
    }

    var methodFormName = getPaymentForm(selectedPaymentMethod); // eslint-disable-line no-use-before-define
    if (methodFormName) {
        var methodForm = paymentForm[methodFormName];
        result = formErrors.getFormErrors(methodForm);

        // check mandatory checkboxes
        Object.keys(methodForm).forEach(function (key) {
            if (methodForm[key]) {
                var methodFormField = methodForm[key];
                if (methodFormField.formType === 'formField'
                    && methodFormField.mandatory
                    && Object.prototype.hasOwnProperty.call(methodFormField, 'checked')
                    && !methodFormField.checked
                ) {
                    // use general error: required field
                    result[methodForm[key].htmlName] = Resource.msg('checkbox.mandatory.missing', 'paymentoperator', 'This is a required field!');
                }
            }
        });
    }
    return result;
}

/**
 * Get payment method form if it has any otherwise return false
 * @param {string} methodName - payment operator method name
 * @returns {boolean|string} - form name for payment method
 */
function getPaymentForm(methodName) {
    if (Object.prototype.hasOwnProperty.call(methodsWithForms, methodName)) {
        return methodsWithForms[methodName];
    }
    return false;
}

/**
 *
 * @param {dw.order.PaymentInstrument} customerPaymentInstruments - collection of the user payment instruments
 * @return {dw.order.PaymentInstrument}  - filtered collection of the user payment instruments
 */
function filterApplePayPaymentInstrument(customerPaymentInstruments) {
    if (customerPaymentInstruments !== null) {
        var paymentMethods = customerPaymentInstruments.filter(function(method) {
            return method.paymentMethod !== 'DW_APPLE_PAY';
        });
        return paymentMethods;
    }
    return null;
}

module.exports = {
    validatePaymentForms: validatePaymentForms,
    getPaymentForm: getPaymentForm,
    filterApplePayPaymentInstrument: filterApplePayPaymentInstrument
};
