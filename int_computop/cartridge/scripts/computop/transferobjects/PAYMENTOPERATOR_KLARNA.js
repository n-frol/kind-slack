'use strict';

/**
 * Klarna transfer object class
 */

/* API includes */
var HashMap = require('dw/util/HashMap');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');
var KLARNA_ORDERDESC_MAX_LENGTH = 2048;

var Klarna = AbstractPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getCustomerAddressParams',
            'getCustomParams'
        ];

        this.paymentFormFields = {
            klarna: [
                'year',
                'month',
                'day',
                'ssn',
                'reference',
                'gender',
                'housenumber',
                'mobilenumber',
                'companyorperson'
            ]
        };
    },

    /**
     * Check if current customer has to be treated as company
     *
     * @returns {boolean} - checks if current customer represents company
     */
    isCompany: function () {
        var paymentInfo = this.getPaymentInformation();
        return paymentInfo.companyorperson === 'F';
    },

    /**
     * Fetch address values from order billing address
     *
     * @returns {dw.util.HashMap} - address parameters
     */
    getCustomerAddressParams: function () {
        var map = new HashMap();
        var billingAddress = this.getBillingAddress();
        var paymentInfo = this.getPaymentInformation();

        map.put('bdFirstName', !this.isCompany() ? billingAddress.getFirstName() : '');
        map.put('bdLastName', billingAddress.getLastName());
        map.put('bdStreet', billingAddress.getAddress1());
        map.put('bdStreetNr', paymentInfo.housenumber);
        map.put('bdZip', billingAddress.getPostalCode());
        map.put('bdCity', billingAddress.getCity());

        var shippingAddress = this.getShippingAddress();
        map.put('sdFirstName', !this.isCompany() ? shippingAddress.getFirstName() : '');
        map.put('sdLastName', shippingAddress.getLastName());
        map.put('sdStreet', shippingAddress.getAddress1());
        map.put('sdStreetNr', shippingAddress.getAddress2() ? shippingAddress.getAddress2() : shippingAddress.getAddress1());
        map.put('sdZip', shippingAddress.getPostalCode());
        map.put('sdCity', shippingAddress.getCity());

        // set country code for billing and shipping address
        var countryCode = '';
        switch (String(billingAddress.getCountryCode()).toUpperCase()) {
            case 'DE':
                countryCode = 'DEU';
                break;
            case 'DK':
                countryCode = 'DNK';
                break;
            case 'NO':
                countryCode = 'NOR';
                break;
            case 'FI':
                countryCode = 'FIN';
                break;
            case 'SE':
                countryCode = 'SWE';
                break;
            case 'US':
                countryCode = 'USA';
                break;
            default:
                break;
        }
        map.put('bdCountryCode', countryCode);
        map.put('sdCountryCode', countryCode);

        // in api doc this params is called MobileNo which is wrong
        map.put('MobileNr', paymentInfo.mobilenumber);
        // the email param actually is missing in the api doc, but is mandatory for the paygate
        map.put('Email', this.getOrder().getCustomerEmail());
        map.put('Phone', billingAddress.getPhone());
        return map;
    },

    /**
     * Retrieve order description from order
     *
     * @returns {string} - order line items as string
     */
    getOrderDescription: function () {
        var prodDesc = '';
        var iter = this.order.allProductLineItems.iterator();

        while (iter != null && iter.hasNext()) {
            var pli = iter.next();

            prodDesc += pli.quantity + ';' +
                pli.productID + ';' +
                pli.productName + ';' +
                pli.adjustedGrossPrice * 100 + ';' +
                // FIXME hardcoded VAT values?
                // VAT in percent
                '19;' +
                // discount in percent
                '3;' +
                // 0: nothing
                '0';

            if (iter.hasNext()) {
                prodDesc += '+';
            }
        }
        if (prodDesc.length > KLARNA_ORDERDESC_MAX_LENGTH) {
            prodDesc = prodDesc.substr(0, (KLARNA_ORDERDESC_MAX_LENGTH - 1));
        }
        return prodDesc;
    },

    /**
     * Retrieve klarna specific params
     *
     * @returns {dw.util.HashMap} - custom parameters
     */
    getCustomParams: function () {
        var map = new HashMap();
        var paymentInfo = this.getPaymentInformation();

        // prepare date of birth
        var year = String(paymentInfo.year);
        var month = String(paymentInfo.month);
        var day = String(paymentInfo.day);

        if (month.length === 1) {
            month = '0' + month;
        }
        if (day.length === 1) {
            day = '0' + day;
        }

        if (!this.isCompany()) {
            map.put('DateOfBirth', year + '-' + month + '-' + day);
            map.put('Gender', paymentInfo.gender);
        }

        var billingAddress = this.getBillingAddress();
        if (!this.isCompany()) {
            if (['DK', 'SE', 'FI', 'NO'].indexOf(billingAddress.getCountryCode()) !== -1) {
                map.put('SocialSecurityNumber', paymentInfo.ssn);
            }
        } else {
            map.put('SocialSecurityNumber', paymentInfo.ssn);
        }
        map.put('CompanyOrPerson', paymentInfo.companyorperson);
        map.put('KlarnaAction', this.getSitePreference('paymentOperatorKlarnaAction'));
        map.put('InvoiceFlag', this.getSitePreference('paymentOperatorKlarnaInvoiceFlag'));
        map.put('AnnualSalary', '');
        map.put('Reference', this.isCompany() ? paymentInfo.reference : '');
        map.put('OrderId1', '');
        map.put('OrderId2', '');
        return map;
    }
});
module.exports = new Klarna();
