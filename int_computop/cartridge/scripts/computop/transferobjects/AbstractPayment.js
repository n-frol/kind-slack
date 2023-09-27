/* eslint-disable no-multi-spaces */
'use strict';
/**
* Specific abstract payment transfer object class
*/
/* API includes */
var HashMap = require('dw/util/HashMap');
var Money   = require('dw/value/Money');

/* Script includes */
var Abstract = require('./Abstract');

var AbstractPayment = Abstract.extend({
    /**
     * @var dw.order.LineItemCtnr
     */
    lineItemCtnr: null,

    /**
     * @var dw.order.PaymentInstrument
     */
    paymentInstrument: null,

    /**
     * Holds the mapping table for credit card brands.
     *
     * @var Object
     */
    creditCardBrandsMapping: {
        Visa                      : 'VISA',
        Master                    : 'MasterCard',
        'Master Card'             : 'MasterCard',
        MasterCard                : 'MasterCard',
        Maestro                   : 'Maestro',
        Amex                      : 'AMEX',
        DinersClub                : 'DINERS',
        Jcb                       : 'JCB',
        Cbn                       : 'CBN',
        Switch                    : 'SWITCH',
        Solo                      : 'SOLO',
        Elo                       : 'Elo',
        Aura                      : 'Aura',
        Hipercard                 : 'Hipercard',
        Bancontact                : 'Bancontact',
        Dankort                   : 'Dankort',
        'Carte helline'           : 'Carte helline',
        'Carte 4Etoiles'          : 'Carte 4Etoiles',
        'Carte helline 4Etoiles'  : 'Carte helline 4Etoiles'
    },

    init: function () {
        this.methods = [
            'getCustomerAddressParams',
            'getOrderParams',
            'getMACParams'
        ];

        this.requiredBankFields = [];
        this.paymentFormFields = {};
    },

    /**
     * Deprecated: use setLineItemCtnr
     *
     * Set order
     *
     * @param {dw.order.Order} order - set current order
     * @returns {Object}
     */
    setOrder: function (order) {
        this.order = order;
        return this;
    },

    /**
     * Get transfer object's order
     *
     * @returns {dw.order.LineItemCtnr}
     */
    getOrder: function () {
        if (null != this.lineItemCtnr) {
            return this.lineItemCtnr;
        }
        return this.order;
    },

    /**
     * Get current lineItemCtnr orderNo / UUID (basket)
     *
     * @returns {string}
     */
    getOrderNo: function () {
        var lineItemCtnr = this.getOrder();
        return Object.prototype.hasOwnProperty.call(lineItemCtnr, 'orderNo')
            ? lineItemCtnr.orderNo
            : lineItemCtnr.UUID;
    },

    /**
     * Set line item container: order / basket
     *
     * @param {dw.order.LineItemCtnr} lineItemCtnr - current order / basket
     * @returns {Object}
     */
    setLineItemCtnr: function (lineItemCtnr) {
        // FIXME check if "object" is still used
        if ('object' in lineItemCtnr) {
            lineItemCtnr = lineItemCtnr.object;
        }
        this.lineItemCtnr = lineItemCtnr;
        return this;
    },

    /**
     * Get transfer object's line item container: order / cart
     *
     * @returns {dw.order.LineItemCtnr} - current line item container
     */
    getLineItemCtnr: function () {
        return this.lineItemCtnr;
    },

    /**
     * Set customer
     *
     * @param {dw.customer.Customer} customer - current customer
     * @returns {Object} - this transfer object
     */
    setCustomer: function (customer) {
        this.customer = customer;
        return this;
    },

    /**
     * Retrieve customer object
     *
     * @returns {dw.customer.Customer} - current customer
     */
    getCustomer: function () {
        return this.customer;
    },

    /**
     * Set order payment instrument
     *
     * @param {dw.order.PaymentInstrument} paymentInstrument - current order payment instrument
     * @returns {Object} - this transfer object
     */
    setPaymentInstrument: function (paymentInstrument) {
        this.paymentInstrument = paymentInstrument;
        return this;
    },

    /**
     * Retrieve current order payment instrument
     *
     * @returns {dw.order.PaymentInstrument} - current order payment instrument
     */
    getPaymentInstrument: function () {
        return this.paymentInstrument;
    },

    /**
     * Set payment specific informations
     *
     * @param {Object} form - object with form data
     * @returns {Object} - this transfer object
     */
    setPaymentInformation: function (form) {
        var paymentFormFields = this.paymentFormFields || {};
        var methodFormName;
        var methodFormFields;

        if (Object.keys(paymentFormFields).length != 1) {
            return this;
        }
        methodFormName = Object.keys(paymentFormFields)[0];
        methodFormFields = paymentFormFields[methodFormName];

        if (Object.prototype.hasOwnProperty.call(form, methodFormName)) {
            var paymentForm = form[methodFormName];
            var paymentInformation = {};

            Object.keys(methodFormFields).forEach(function(i) {
                var field = methodFormFields[i];

                if (Object.prototype.hasOwnProperty.call(paymentForm, field)) {
                    // FIXME why does the value does not come with "value"
                    paymentInformation[field] = paymentForm[field].selectedOption ? paymentForm[field].selectedOption : paymentForm[field].htmlValue;
                }
            });
            this.paymentInformation = paymentInformation;
        }
        return this;
    },

    /**
     * Retrieve custom payment informations form / object
     *
     * @returns {Object}
     */
    getPaymentInformation: function () {
        return this.paymentInformation || {};
    },

    /**
     * Retrieve billing address from line item container
     *
     * @returns {dw.order.OrderAdress} - current lineItemCtnr billing address
     */
    getBillingAddress: function () {
        return this.getOrder().getBillingAddress();
    },

    /**
     * Retrieve shipping address from order
     *
     * @returns {dw.order.OrderAdress} - current lineItemCntr shipping address
     */
    getShippingAddress: function () {
        return this.getOrder().defaultShipment.shippingAddress;
    },

    /**
     * Fetch address values from order billing address
     *
     * @returns {dw.util.HashMap} - customer address parameters
     */
    getCustomerAddressParams: function () {
        var map = new HashMap();
        var billingAddress = this.getBillingAddress();

        map.put('Name', billingAddress.getLastName());
        map.put('Vorname', billingAddress.getFirstName());
        map.put('Strasse', billingAddress.getAddress1());
        map.put('PLZ', billingAddress.getPostalCode());
        map.put('Ort', billingAddress.getCity());
        return map;
    },

    /**
     * Fetch transaction params and create HMAC
     *
     * @returns {dw.util.HashMap} - merchant / order related parameters
     */
    getMACParams: function () {
        var includeHMAC = this.getSitePreference('paymentOperatorIncludeMAC');
        var map = new HashMap();
        map.put('TransID', this.getOrder().getUUID());
        map.put('MerchantID', this.getSitePreference('paymentOperatorMerchantID'));
        map.put('Amount', this.getAmountFractionValue());
        map.put('Currency', this.getCurrency());

        // If the site pref is enabled, include the MAC parameter.
        if (includeHMAC) {
            map.put(
                'MAC',
                require('int_computop/cartridge/scripts/computop/lib/HashBasedMAC').getHMAC(
                    [map.TransID, map.MerchantID, map.Amount, map.Currency],
                    this.getSitePreference('paymentOperatorHMACKey')
                )
            );
        }

        return map;
    },

    /**
    * Retrieve required order params
    *
    * @returns {dw.util.HashMap} - order related parameters
    */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        // FIXME orderNo only available in dw.order.Order
        map.put('RefNr', this.getOrderNo());
        return map;
    },

    /**
     * Fetch bank information from custom information object
     *
     * @returns {dw.util.HashMap} - HashMap with billing form parameters
     */
    getBankParams: function () {
        var map = new HashMap();

        var fields = this.requiredBankFields;
        if (fields.length < 1) {
            return map;
        }

        var info = this.getPaymentInformation();
        if (fields.indexOf('accnr')    > -1) map.AccNr       = info['accountnumber'];
        if (fields.indexOf('owner')    > -1) map.AccOwner    = info['accountholdername'];
        if (fields.indexOf('iban')     > -1) map.AccIBAN     = info['bankiban'];
        if (fields.indexOf('bank')     > -1) map.AccBank     = info['bankname'];
        if (fields.indexOf('blzv')     > -1) map.BLZV        = info['blzv'];
        if (fields.indexOf('city')     > -1) map.AccBankCity = info['bankcity'];
        if (fields.indexOf('realiban') > -1) map.IBAN        = info['iban'];
        if (fields.indexOf('bic')      > -1) map.BIC         = info['bic'];
        if (fields.indexOf('issuerid') > -1) map.IssuerID    = info['issuerid'];
        if (fields.indexOf('ccnr')     > -1) map.CCNr        = info['cardNumber'];
        if (fields.indexOf('cccvc')    > -1) map.CCCVC       = info['securityCode'];
        if (fields.indexOf('ccexpiry') > -1) map.CCExpiry    = this.getCCExpiry(info);
        if (fields.indexOf('ccbrand')  > -1) map.CCBrand     = this.getCCBrand(info['cardType']);
        return map;
    },

    /**
     * Retrieve order total amount
     *
     * @returns {dw.value.Money} - retrieve lineItemCtnr amount
     */
    getFixedContainerTotalAmount: function () {
        // as a valid money value is expected - defaults to 0
        var amount = new Money(0, this.getCurrency());

        var adjustedPrice;
        // fetch amount from payment instrument
        // FIXME check if this can be replaced by this.getOrderPaymentInstrument()
        var instruments = this.getOrder().getPaymentInstruments();
        var iter = instruments.iterator();

        while (iter.hasNext()) {
            var instrument = iter.next();
            if (instrument.getPaymentMethod().indexOf('PAYMENTOPERATOR', 0) > -1 || 
                    instrument.getPaymentMethod() == "CREDIT_CARD" || instrument.getPaymentMethod() == "DW_APPLE_PAY") {
                adjustedPrice = instrument.paymentTransaction.amount;
            }
        }
        if (adjustedPrice != null && adjustedPrice.isAvailable()) {
            amount = adjustedPrice;
        }
        return amount;
    },

    /**
     * Fetch the amount of a money object converted to the fraction unit of its currency / returns 0 if Money object is null
     *
     * @param {dw.value.Money} - optional money object
     * @returns {number}
     */
    getAmountFractionValue: function (money) {
        var amount;

        if (money) {
            amount = money;
        } else {
            amount = this.getFixedContainerTotalAmount();
        }

        if (amount != null && amount.isAvailable()) {
            var currencyCode = amount.getCurrencyCode();
            var currency = require('dw/util/Currency').getCurrency(currencyCode);
            var fractionDigits = currency.getDefaultFractionDigits();
            var fractionAmount = (amount.value * Math.pow(10, fractionDigits)).toFixed();
            return fractionAmount;
        } else {
            return 0;
        }
    },

    /**
     * Retrieve currency code from order
     *
     * @returns {string}
     */
    getCurrency: function () {
        return this.getOrder().getCurrencyCode();
    },

    /**
     * Retrieves the formatted (JJJJMM) expiration date of the credit card from form-data.
     *
     * @param {Object} paymentInformation - payment instrument data
     * @returns {string} - credit card expiration date as string
     */
    getCCExpiry: function (paymentInformation) {
        var expirationYear = (paymentInformation['expirationYear'] + '').replace(/\./, '');
        var expirationMonth = paymentInformation['expirationMonth'] + '';
        if (expirationMonth.length !== 2) {
            expirationMonth = '0' + expirationMonth;
        }
        return expirationYear + expirationMonth;
    },

    /**
     * Retrieves the converted brand of the credit card from form-data.
     *
     * @param {string} type - cc type
     * @return {string} - cc brand
     */
    getCCBrand: function (type) {
        return this.creditCardBrandsMapping[type];
    }
});
module.exports = AbstractPayment;
