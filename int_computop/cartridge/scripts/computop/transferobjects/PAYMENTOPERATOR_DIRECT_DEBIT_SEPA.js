'use strict';

/**
 * Direct Debit Sepa transfer object class
 */

/* API includes */
var HashMap = require('dw/util/HashMap');
var StringUtils = require('dw/util/StringUtils');
var UUIDUtils = require('dw/util/UUIDUtils');
var Calendar = require('dw/util/Calendar');

/* Script includes */
var AbstractPayment = require('./AbstractPayment');

var DirectDebitSepa = AbstractPayment.extend({
    init: function () {
        this.methods = [
            'getOrderParams',
            'getMACParams',
            'getBankParams',
            'getCustomParams'
        ];

        this.requiredBankFields = [
            'owner',
            'realiban',
            'bic',
            'bank'
        ];

        this.paymentFormFields = {
            directdebitsepa: ['accountholdername', 'bankname', 'iban', 'bic']
        };
    },

    /**
    * Retrieve Direct Debit Sepa specific params
    *
    * @return HashMap
    */
    getCustomParams: function () {
        var map = new HashMap();
        var capture = this.getSitePreference('paymentOperatorDirectDebitCaptureType');
        if (capture === 'timeBased') {
            var hours = this.getSitePreference('paymentOperatorDirectDebitCaptureHours');
            map.put('Capture', hours);
        } else {
            map.put('Capture', capture);
        }

        map.put('SellingPoint', this.getSitePreference('paymentOperatorDirectDebitSellingPoint'));
        map.put('Service', this.getSitePreference('paymentOperatorDirectDebitService'));
        map.put('Channel', '');
        map.put('IPZone', '');
        map.put('DtOfSgntr', StringUtils.formatCalendar(new Calendar(), 'dd.MM.yyyy'));
        map.put('MandateID', UUIDUtils.createUUID());
        map.put('Email', this.getOrder().getCustomerEmail());
        var billingAddress = this.getBillingAddress();
        map.put('AddrCountryCode', billingAddress.getCountryCode());
        return map;
    }
});
module.exports = new DirectDebitSepa();
