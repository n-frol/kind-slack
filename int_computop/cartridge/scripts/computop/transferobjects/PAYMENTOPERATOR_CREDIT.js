/* global customer */

'use strict';
/**
 * Transfer object for payment method credit direct
 */

/* API includes */
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractRedirectPayment = require('./AbstractRedirectPayment');

var CreditCard = AbstractRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getCustomParams',
            'getRedirectUrls'
        ];

        this.paymentFormFields = { paymentoperatorcreditcard: ['creditcarduuid'] };
        this.isIframePayment = true;
    },

    /**
     * Get url for payment operator redirect
     *
     * @returns {string} - paygate endpoint
     */
    getPaymentOperatorUrl: function () {
        return [
            this.getSitePreference('paymentOperatorBaseUrl'),
            this.getSitePreference('paymentOperatorCreditCardGatewayPath')
        ].join(''); // trailing slash set for base url in site preferences
    },

    /**
     * Retrieve credit direct specific params
     *
     * @returns {dw.util.HashMap} - customer parameters
     */
    getCustomParams: function () {
        var map = new HashMap();

        var capture = this.getSitePreference('paymentOperatorCreditCardCaptureType').value;

        if (capture === 'timeBased') {
            var hours = this.getSitePreference('paymentOperatorCreditCardCaptureHours');
            map.put('Capture', hours);
        } else {
            map.put('Capture', capture);
        }

        var billingAddress = this.getBillingAddress();
        // Debitors:
        map.put('CreditCardHolder', billingAddress.getFirstName() + ' ' + billingAddress.getLastName());
        map.put('FirstName', billingAddress.getFirstName());
        map.put('MiddleName', '');
        map.put('Salutation', billingAddress.getSalutation());
        map.put('Title', '');
        map.put('LastName', billingAddress.getLastName());
        map.put('AddrStreet', billingAddress.getAddress1());
        map.put('AddrStreeNr', '');
        map.put('AddrZip', billingAddress.getPostalCode());
        map.put('AddrCity', billingAddress.getCity());
        map.put('AddrStreet2', '');
        map.put('AddrStreetNr2', '');
        map.put('AddrZip2', '');
        map.put('AddrCity2', '');

        // 1 or 2
        map.put('AddrChoice', '');

        // PPRO parameter extension
        map.put('AddrCountryCode', billingAddress.getCountryCode());
        map.put('SellingPoint', this.getSitePreference('paymentOperatorCreditCardSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorCreditCardService'));

        // I or R
        map.put('RTF', '');

        // Abo:
        map.put('AboAction', '');
        map.put('StartDate', '');
        map.put('EndDate', '');
        map.put('Interval', '');
        map.put('AboAmount', '');

        // optional F or P
        map.put('CompanyOrPerson', '');
        // optional JJJJMMTT
        map.put('DateOfBirth', '');
        // optional
        map.put('Gender', '');
        map.put('AddressAddition', '');
        map.put('AddrState', billingAddress.getStateCode());
        map.put('AddrDistrict', '');
        map.put('AddrPOBox', '');
        map.put('Phone', billingAddress.getPhone());
        map.put('WorkPhone', '');
        map.put('Fax', '');
        map.put('NewCustomer', '');
        map.put('SocialSecuritiyNumber', '');
        map.put('DrivingLicenseNumber', '');

        if (!this.getSitePreference('paymentOperatorCreditCard3DEnabled')) {
            map.put('VBV', 'No');
        }
        return map;
    },

    /**
     * Retrieve required order params
     *
     * @returns {dw.util.HashMap} - order parameters
     */
    getOrderParams: function () {
        var map = new HashMap();
        map.put('ReqID', '');
        map.put('UserData', this.order.getOrderNo());
        map.put('OrderDesc', this.getOrderDescription(this.getOrder()));
        map.put('RefNr', this.order.getOrderNo());
        map.put('Email', this.order.customerEmail);
        map.put('Channel', '');

        return map;
    },

    /**
     * Create request param string for redirect url
     *
     * @returns {string} - concatenated request parameters
     */
    getRequestString: function () {
        var result = '';
        var map = this.getTransferObject();
        var params = this.getTransferObjectString(map);

        cdpmLogger.debug('Request string for redirect payment: ' + params);

        var Blowfish = require('~/cartridge/scripts/computop/lib/Blowfish');

        result += '?MerchantID=' + this.getSitePreference('paymentOperatorMerchantID')
            + '&Len=' + params.length
            + '&Data=' + Blowfish.encryptBlowfish(params, this.getSitePreference('paymentOperatorMerchantCode'))
            + '&EtiID=' + encodeURIComponent(this.getSitePreference('paymentOperatorEtiID'));

        result += '&Language=' + this.getLocale().getLanguage();

        var xsltTemplatePath = this.getSitePreference('paymentOperatorCreditCardXSLTTemplatePath');

        if (xsltTemplatePath) {
            result += '&Template=' + xsltTemplatePath;
        }

        var creditCardUseOldCards = this.getSitePreference('paymentOperatorCreditCardUseOldCards');
        var customerPaymentInstrument = this.getCustomerPaymentInstrument();

        // TODO this will not work as currently paymentOperatorCC data is saved with orderPaymentInstrument NOT with customerPaymentInstrument
        if (creditCardUseOldCards && customerPaymentInstrument) {
            var expiry = customerPaymentInstrument.custom.paymentOperatorCCExpiry;

            result += '&PCNr=' + customerPaymentInstrument.custom.paymentOperatorCCNr
                + '&PCNrBrand=' + customerPaymentInstrument.custom.paymentOperatorCCBrand
                + '&PCNrMonth=' + expiry.substring(4, 6)
                + '&PCNrYear=' + expiry.substring(0, 4);
        }

        return result;
    },

    /**
     * Retrieve used credit card from the customer's available credit cards
     *
     * @returns {dw.customer.CustomerPaymentInstrument|null} - payment instrument used for current order
     */
    getCustomerPaymentInstrument: function () {
        var creditCardForm = this.getPaymentInformation();
        var creditCardUuid = creditCardForm.creditcarduuid;

        if (!customer.authenticated || !customer.getProfile()) {
            return null;
        }

        var wallet = customer.getProfile().getWallet();
        var PaymentInstrument = require('dw/order/PaymentInstrument');
        var paymentInstruments = wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);
        // find credit card in payment instruments
        var instrumentsIter = paymentInstruments.iterator();
        var creditCard = null;
        while (instrumentsIter.hasNext()) {
            creditCard = instrumentsIter.next();
            if (creditCardUuid === creditCard.UUID) {
                return creditCard;
            }
        }
        return null;
    }

});
module.exports = new CreditCard();
