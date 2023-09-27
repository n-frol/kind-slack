/* global empty */
'use strict';

/**
 * PaymentInstrumentPhoneNo.js
 *
 * Migrates phone numbers to payment instruments
 */

// SFCC system class imports.
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var CSVStreamReader = require('dw/io/CSVStreamReader');
var CustomerMgr = require('dw/customer/CustomerMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Logger = require('dw/system/Logger');

// Module level declarations.
var collections = require('app_storefront_base/cartridge/scripts/util/collections');
var log = Logger.getLogger('tokens', 'tokens');

/**
 * Returns the customer data object
 * @param {array} row - Customer Token Data
 * @return {Object} Object - Returns the customer token data object
 */
function getCustomerData(row) {
    return {
        customerNo: row[0],
        phoneNumber: row[1]
    };
}

/**
 * Updates customer's wallet
 * @param {dw.customer.Profile} Profile - Current profile
 * @param {Object} tokenData - Token data object
 */
function updatePaymentInstruments(Profile, tokenData) {
    var wallet = Profile.getWallet();

    if (!empty(wallet)) {
        var PaymentInstruments = wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);

        if (!empty(PaymentInstruments)) {
            collections.forEach(PaymentInstruments, function (CurrentPaymentInstrument) {
                CurrentPaymentInstrument.custom.phone = tokenData.phoneNumber.trim();
                log.info(
                    'Payment Instrument of type {0} updated for customer {1}',
                    CurrentPaymentInstrument.paymentMethod,
                    tokenData.customerNo
                );
            });
        } else {
            log.error('No payment instruments found');
        }
    } else {
        log.error('Wallet not found');
    }
}

/**
 * Executes the migration scirpt
 */
function execute() {
    var tokenDirectory = new File(File.IMPEX + File.SEPARATOR + 'tokens');

    if (tokenDirectory.exists()) {
        var tokenFile = new File(tokenDirectory, 'phone_numbers.csv');

        if (tokenFile.exists()) {
            var readTokenFile = new FileReader(tokenFile, 'UTF-8');
            var csvReader = new CSVStreamReader(readTokenFile);

            /**
             * Having to disable eslint as it doesn't work
             * with the API for the next two lines
             */

            var row = csvReader.readNext();

            while (!empty(row)) {
                var tokenData = getCustomerData(row);
                var customerNo = tokenData.customerNo;
                try {
                    if (!empty(customerNo)) {
                        var Profile = CustomerMgr.getProfile(customerNo.toString().trim());
                        if (!empty(Profile)) {
                            updatePaymentInstruments(Profile, tokenData);
                        } else {
                            log.error(customerNo + ': ' + tokenData.phoneNumber + ' not imported');
                        }
                    } else {
                        log.error('No customer number found');
                    }
                } catch (e) {
                    log.error(customerNo + ' phone failed');
                }
                row = csvReader.readNext();
            }

            csvReader.close();
            readTokenFile.close();
        }
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
