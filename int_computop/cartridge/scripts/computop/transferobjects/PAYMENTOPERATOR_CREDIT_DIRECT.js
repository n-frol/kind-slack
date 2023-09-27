/* global session, empty */

'use strict';

/**
* Transfer object for payment method credit direct
*/

/* API includes */
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');
var HashMap = require('dw/util/HashMap');
var Customer = require('dw/customer/Customer');
var Profile = require('dw/customer/Profile');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');
var iso3166 = require('~/cartridge/scripts/computop/lib/ISO3166');

var CreditDirect = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getCustomParams',
            'getCAPNParams'
        ];

        this.requiredBankFields = [
            'ccnr',
            'cccvc',
            'ccexpiry',
            'ccbrand'
        ];
        this.paymentFormFields = {
            creditdirect: [
                'cardType',
                'cardNumber',
                'expirationMonth',
                'expirationYear',
                'securityCode'
            ]
        };
    },

    /**
     * Retrieve credit direct specific params
     *
     * @returns {dw.util.HashMap} - hash map with custom parameters
     */
    getCustomParams: function () {
        var map = new HashMap();
        var capture = this.getSitePreference('paymentOperatorCreditCardCaptureType').value;
        if (capture === 'timeBased') {
            map.put('Capture', this.getSitePreference('paymentOperatorCreditCardCaptureHours'));
        } else {
            map.put('Capture', capture);
        }
        // add 3D secure
        if (this.getSitePreference('paymentOperatorCreditCard3DEnabled')) {
            var termUrl = require('dw/web/URLUtils').https('PaymentOperator-TermUrl');
            map.put('TermURL', termUrl);
        } else {
            map.put('VBV', 'No');
        }

        return map;
    },

    /**
     * Set credit card data
     *
     * @returns {dw.util.HashMap} - hash map with credit card data
     */
    getBankParams: function () {
        var map = this._super(); // eslint-disable-line no-underscore-dangle

        var paymentInstrument = this.getPaymentInstrument();
        map.put('CCExpiry', this.getCCExpiry(
            {
                expirationMonth: paymentInstrument.creditCardExpirationMonth,
                expirationYear: paymentInstrument.creditCardExpirationYear
            }
        ));
        if (!map.get('CCCVC')) {
            map.put('CCCVC', session.privacy.PaymentOperatorCCSecurityCode);
        }
        // get PCNr / CCBrand from stored payment instrument
        var piUUID = session.privacy.PaymentOperatorCCUUID;
        var profile = !empty(this.getCustomer()) ?
            this.getCustomer().getProfile() : null;
        if (piUUID && !empty(profile)) {
            var array = require('*/cartridge/scripts/util/array');
            var customerPaymentInstruments = profile.getWallet().getPaymentInstruments();
            var customerPaymentInstrument = array.find(customerPaymentInstruments, function (item) {
                return piUUID === item.UUID;
            });
            if (customerPaymentInstrument
                && customerPaymentInstrument.custom.paymentOperatorCCNr
                && customerPaymentInstrument.custom.paymentOperatorCCBrand
            ) {
                map.put('CCNr', customerPaymentInstrument.custom.paymentOperatorCCNr);
                map.put('CCBrand', customerPaymentInstrument.custom.paymentOperatorCCBrand);
            }
        }
        if (paymentInstrument.getPaymentMethod() == "CREDIT_CARD") {
        	map.put('CCNr', paymentInstrument.custom.paymentOperatorCCNr);
            map.put('CCBrand', paymentInstrument.custom.paymentOperatorCCBrand);
        }

        //For Apple pay recuring orders
        if (paymentInstrument.getPaymentMethod() == "DW_APPLE_PAY") {
        	map.put('CCNr', paymentInstrument.custom.paymentOperatorCCNr);
            map.put('CCBrand', paymentInstrument.custom.paymentOperatorCCBrand);
            map.put('CCExpiry', paymentInstrument.custom.paymentOperatorCCExpiry);
        }

        return map;
    },

    /**
     * Function that adds optional CAPN data
     *
     * @returns {dw.util.HashMap} - if enabled returns hash map with customer data
     */
    getCAPNParams: function () {
        var map = new HashMap();
        if (this.getSitePreference('paymentOperatorCreditCardCapnEnabled')) {
            try {
                var billingAddress = this.getBillingAddress();
                var shippingAddress = this.getShippingAddress();
                var customer = this.getCustomer();
                var profile = null;
                var phoneNumber;
                var emailAddress;

                if (customer instanceof Customer) {
                    profile = customer.getProfile();
                }
                if (profile instanceof Profile) {
                    phoneNumber = profile.getPhoneHome();
                    emailAddress = profile.getEmail();
                } else {
                    // guest checkout
                    phoneNumber = billingAddress.getPhone();
                    emailAddress = this.getOrder().getCustomerEmail();
                }

                map.put('FirstName', billingAddress.getFirstName());
                map.put('LastName', billingAddress.getLastName());
                map.put('AddrStreet', billingAddress.getAddress1());
                map.put('AddrCity', billingAddress.getCity());
                map.put('AddrZip', billingAddress.getPostalCode());

                map.put('eMail', emailAddress);
                map.put('Phone', phoneNumber);
                map.put('sdFirstName', shippingAddress.getFirstName());
                map.put('sdLastName', shippingAddress.getLastName());
                map.put('sdAddrStreet', shippingAddress.getAddress1());
                map.put('sdAddrCity', shippingAddress.getCity());
                map.put('sdAddrZip', shippingAddress.getPostalCode());
                // map.put('sdeMail', profile.getEmail());
                map.put('sdPhone', shippingAddress.getPhone());
                var countryCode = shippingAddress.getCountryCode().value;
                map.put('sdCountryCode', iso3166.getIso3166Code(countryCode));
            } catch (e) {
                cdpmLogger.error('Error while adding capn data to transfer object!');
            }
        }
        return map;
    }

});
module.exports = new CreditDirect();
