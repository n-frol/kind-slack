/* global empty */
'use strict';

/**
 * TokenMigration.js
 *
 * Migrates payent instuments and tokens based off the prescibed schema
 */

// SFCC system class imports.
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var CSVStreamReader = require('dw/io/CSVStreamReader');
var CustomerMgr = require('dw/customer/CustomerMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Logger = require('dw/system/Logger');

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
 * Creates and adds payment instrument to customer's wallet
 * @param {dw.customer} Profile - Current profile
 * @param {Object} tokenData - Token data object
 */
function createPaymentInstrument(Profile, tokenData) {
    var wallet = Profile.getWallet();

    if (!empty(wallet)) {
        var paymentInstrument = wallet.createPaymentInstrument(
            PaymentInstrument.METHOD_CREDIT_CARD);
        paymentInstrument.setCreditCardHolder(
            tokenData.card_name
        );
        paymentInstrument.setCreditCardNumber(tokenData.masked_number);

        paymentInstrument.setCreditCardType(tokenData.card_type);
        paymentInstrument.setCreditCardExpirationMonth(parseInt(tokenData.expiration_month, 10));
        paymentInstrument.setCreditCardExpirationYear(parseInt(tokenData.expiration_year, 10));
        paymentInstrument.setCreditCardToken(tokenData.token);
        paymentInstrument.custom.paymentOperatorCCNr = tokenData.token;
        paymentInstrument.custom.paymentOperatorCCBrand = tokenData.card_type;

        var expirationMonth = tokenData.expiration_month;

        if (expirationMonth.length === 1) {
            expirationMonth = '0' + expirationMonth;
        }

        paymentInstrument.custom.paymentOperatorCCExpiry = tokenData.expiration_year + expirationMonth;
        paymentInstrument.custom.address1 = tokenData.address1;

        if (!empty(tokenData.address2)) {
            paymentInstrument.custom.address2 = tokenData.address2;
        }

        paymentInstrument.custom.city = tokenData.city;
        paymentInstrument.custom.stateCode = tokenData.region;
        paymentInstrument.custom.postalCode = tokenData.postcode;

        if (tokenData.is_default === '1') {
            Profile.custom.defaultPaymentInstrument = paymentInstrument.UUID;
        }
        log.info(tokenData.customer_no + ' ' + tokenData.token + ' created');
    } else {
        log.error('Wallet not found');
    }
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
        /* eslint-enable */
        var customerNo = tokenData.customer_no;
        try {
            if (!empty(customerNo)) {
                var Profile = CustomerMgr.getProfile(customerNo.toString());
                if (!empty(Profile)) {
                    createPaymentInstrument(Profile, tokenData);
                } else {
                    log.error(customerNo + ' token ' + tokenData.token + ' not imported');
                }
            } else {
                log.error('No customer ID found');
            }
        } catch (e) {
            log.error(customerNo + ' token failed');
        }
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
