/* global empty */
'use strict';

/**
 * RemoveTokens.js
 *
 * Removes tokens
 */

// SFCC system class imports.
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var CSVStreamReader = require('dw/io/CSVStreamReader');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Logger = require('dw/system/Logger');
var CustomerMgr = require('dw/customer/CustomerMgr');

// Module level declarations.
var log = Logger.getLogger('tokens', 'tokens');

/**
 * Returns the customer data object
 * @param {array} row - Customer Token Data
 * @return {Object} Object - Returns the customer token data object
 */
function getCustomerData(row) {
    return {
        customer_no: row[0],
        card_type: row[1],
        card_name: row[2],
        masked_number: row[3],
        token: row[4],
        expiration_month: row[5],
        expiration_year: row[6],
        is_default: row[7],
        billing_address_id: row[8],
        firstname: row[9],
        lastname: row[10],
        address1: row[11],
        address2: row[12],
        city: row[13],
        postcode: row[14],
        region: row[15],
        country_id: row[16]
    };
}

/**
 * Removes all payment instruments from customer's wallet
 * @param {dw.customer.wallet} wallet – Customer's wallet
 */
function removeCustomersPaymentInstrument(wallet) {
    var collections = require('app_storefront_base/cartridge/scripts/util/collections');
    var PaymentInstruments = wallet.getPaymentInstruments(PaymentInstrument.METHOD_CREDIT_CARD);

    collections.forEach(PaymentInstruments, function (CurrentPaymentInstrument) {
        wallet.removePaymentInstrument(CurrentPaymentInstrument);
    });
}

/**
 * Executes the migration scirpt
 */
function execute() {
    var tokenDirectory = new File(File.IMPEX + File.SEPARATOR + 'tokens');
    var tokenFile = new File(tokenDirectory, 'tokens.csv');
    var readTokenFile = new FileReader(tokenFile, 'UTF-8');
    var csvReader = new CSVStreamReader(readTokenFile);

    /**
     * Having to disable eslint as it doesn't work
     * with the API for the next two lines
     */

    /* eslint-disable */
    while ((row =csvReader.readNext())) {
        var tokenData = getCustomerData(row);
        try {
            /* eslint-enable */
            var customer = CustomerMgr.getCustomerByCustomerNumber(tokenData.customer_no);

            if (!empty(customer)) {
                var wallet = customer.getProfile().getWallet();

                if (!empty(wallet)) {
                    removeCustomersPaymentInstrument(wallet);
                }

                log.info(tokenData.customer_no + ' payment instruments removed');
            } else {
                log.info(tokenData.customer_no + ' customer not found');
            }
        } catch (e) {
            log.error(tokenData.customer_no + ' payment instrument not removed');
        }
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
