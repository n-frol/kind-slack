/* global empty */
'use strict';

/**
 * UpdateCustomerData.js
 *
 * Exports job step functions for updating customer records with missing data
 * from the system customer import job.
 */

// SFCC API imports
var CSVStreamReader = require('dw/io/CSVStreamReader');
var CustomerMgr = require('dw/customer/CustomerMgr');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

// Global declarations.
var StateHelpers = require(
    'app_kind_snacks/cartridge/scripts/helpers/stateHelpers');
var log = Logger.getLogger('customer-update', 'customer-update');

/**
 * @class CustomerAddress
 * @classdesc A helper class for dealing with address records from the CSV.
 * @param {string[]} csvRow - The row item from the CSV file which is a list of
 *      strings.
 */
function CustomerAddress(csvRow) {
    this.customerNo = csvRow[0];
    this.addressName = csvRow[2];
    this.address1 = csvRow[4];
    this.address2 = csvRow[5];
    this.state = csvRow[7];
    this.isDefaultBilling = csvRow.pop() === '1';
}

/**
 * Gets the import file and returns a stream for reading the data from the file..
 *
 * @returns {{streamReader: dw.io.CSVStreamReader, errMsg: string}} - Returns
 *      the stream for reading records from the CSV file, or an error message
 *      for logging if there was an error.
 */
function getCSVReader() {
    var result = {
        streamReader: null,
        errMsg: ''
    };

    try {
        var directory = 'temp';
        var fileName = 'addresses';

        // Get a ref to the directory where the import file is located.
        var dirPath = File.IMPEX + File.SEPARATOR + directory;
        var dir = new File(dirPath);

        // If the directory doesn't exist, return an error.
        if (!dir.exists() || !dir.isDirectory() || !fileName) {
            result.errMsg = 'The path for the import file is not valid.';
            return result;
        }

        var file = new File(dir, fileName + '.csv');

        if (!file.exists() || file.isDirectory()) {
            result.errMsg = 'Import file does not exist in the specified path';
            return result;
        }

        var fileReader = new FileReader(file, 'UTF-8');
        result.streamReader = new CSVStreamReader(fileReader);
    } catch (e) {
        var eMsg = 'ERROR - could not get import file:';
        eMsg += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        log.error(eMsg);
    }

    return result;
}

/**
 * Gets the total count returned from the SFCC customer query.
 *
 * @param {Object} args - An arguments object containing the configured
 *      parameter values from the Job setup in BM.
 * @returns {dw.system.Status} - Returns a status instance indicating the
 *      success or failure of the Job steps execution.
 */
module.exports.updateCustomers = function (args) {
    var dateParam = typeof args.importDate !== 'undefined' ? args.importDate : '03/01/2019';
    var STATE_NAMES_LOWER = StateHelpers.getStateNames();
    var importDate = new Date(dateParam).valueOf();
    var streamResult = getCSVReader();

    if (!empty(streamResult.errMsg)) {
        log.error(streamResult.errMsg);
        return new Status(Status.ERROR);
    }

    // Get the CSV reader, and read the 1st line (headers).
    var csvStreamReader = streamResult.streamReader;
    var parseItem = csvStreamReader.readNext();

    // Ignore the 1st row (headers), and read the 2nd.
    parseItem = csvStreamReader.readNext();

    // Loop through the rows of the CSV for updates.
    while (!empty(parseItem)) {
        try {
            var customerAddress = new CustomerAddress(parseItem);
            var profile = CustomerMgr.getProfile(
                customerAddress.customerNo);

            if (!empty(profile)) {
                // Log the customer number.
                log.info('Beginning update of customer number: {0}',
                    customerAddress.customerNo);

                var addressBook = profile.addressBook;
                var wallet = profile.wallet;
                var preferred = !empty(profile.custom.defaultPaymentInstrument) ?
                    profile.custom.defaultPaymentInstrument : '';

                // Update the CustomerAddress data.
                if (addressBook.addresses.length) {
                    var addressIterator = addressBook.addresses.iterator();
                    var addressFound = false;

                    // Loop through the customer addresses to find the one with
                    // the matching ID.
                    while (addressIterator.hasNext()) {
                        var address = addressIterator.next();
                        var addressModified = address.lastModified.valueOf();

                        if (address.ID === customerAddress.addressName &&
                            addressModified <= importDate
                        ) {
                            addressFound = true;
                            log.info('Customer {0}: updating address {1}',
                                customerAddress.customerNo,
                                address.ID
                            );

                            // Update address1
                            if (!empty(customerAddress.address1)) {
                                address.address1 = customerAddress.address1.trim();
                            }

                            // Update address2
                            if (!empty(customerAddress.address2)) {
                                address.address2 = customerAddress.address2.trim();
                            }

                            // Update State if Empty or not set as Abbreviation
                            if (empty(address.stateCode) &&
                                !empty(customerAddress.state) &&
                                STATE_NAMES_LOWER.indexOf(
                                    customerAddress.state.toLowerCase().trim()
                                ) > -1
                            ) {
                                address.stateCode = StateHelpers.getStateCode(
                                    customerAddress.state);
                            }
                        } else if (addressModified <= importDate) {
                            log.info('Customer {0}: Address {1} found but not ' +
                                'updated due to last modification time {2}',
                                customerAddress.customerNo,
                                address.ID,
                                address.lastModified.toDateString()
                            );
                        }
                    }

                    if (!addressFound) {
                        log.warn('Customer {0}: No address with ID {1}',
                            customerAddress.customerNo,
                            customerAddress.addressName
                        );
                    }
                } else {
                    log.warn('Customer {0}: No saved addresses to udpate',
                        customerAddress.customerNo);
                }

                // Update the CustomerPaymentInstrument data if this is the
                // Customer's default billing address.
                if (customerAddress.isDefaultBilling &&
                    !empty(wallet.paymentInstruments)
                ) {
                    var piIterator = wallet.paymentInstruments.iterator();

                    // Loop through the customer payment instruments and find
                    // if there is a default set.
                    while (piIterator.hasNext()) {
                        var pi = piIterator.next();
                        var piModified = pi.lastModified.valueOf();
                        var profilePreferred = !empty(preferred) &&
                            preferred === pi.UUID;
                        var markedPreferred = !empty(pi.custom.preferred) &&
                            pi.custom.preferred === true;

                        // If this is the default, then update the payment
                        // custom attributes.
                        if (piModified <= importDate &&
                            (profilePreferred || markedPreferred)
                        ) {
                            // Update custom.address1
                            if (!empty(customerAddress.address1)) {
                                pi.custom.address1 = customerAddress.address1.trim();
                            }

                            // Update custom.address2
                            if (!empty(customerAddress.address2)) {
                                pi.custom.address2 = customerAddress.address2.trim();
                            }

                            // Update custom.stateCode if empty or > 2 chars.
                            if (empty(pi.custom.stateCode) || pi.custom.stateCode.length > 2) {
                                if (!empty(customerAddress.state) &&
                                    STATE_NAMES_LOWER.indexOf(
                                        customerAddress.state.toLowerCase().trim()
                                    ) > -1
                                ) {
                                    // Update from CSV value.
                                    pi.custom.stateCode = StateHelpers.getStateCode(
                                        customerAddress.state
                                    );
                                } else if (!empty(pi.custom.stateCode) &&
                                    STATE_NAMES_LOWER.indexof(
                                        pi.custom.stateCode.trim().toLowerCase()
                                    ) > -1
                                ) {
                                    // Update from existing value on PI custom
                                    // attribue if the current state is longer
                                    // than 2 characters (full state name).
                                    pi.custom.stateCode = StateHelpers.getStateCode(
                                        pi.custom.stateCode
                                    );
                                } else {
                                    var logMsg = 'Could not find a valid state for CustomerPaymentInstrument';
                                    logMsg += '\nCurrent value: {0}';
                                    logMsg += '\nCSV value: {1}';
                                    log.warn(logMsg, pi.custom.stateCode,
                                        customerAddress.state);
                                }
                            }
                        }
                    }
                } else {
                    log.warn('Customer no {0} does not have a default payment instrument',
                        customerAddress.customerNo);
                }

                // Log the successful completion of updating.
                log.info('Finished updating customer number: {0}',
                    customerAddress.customerNo);
            } else {
                log.warn('Could not find customer number: {0}',
                    customerAddress.customerNo);
            }


            // Get the next row at the end of the loop.
            parseItem = csvStreamReader.readNext();
        } catch (e) {
            var errMsg = 'Error reading CSV Fields: ';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            // Set the item to null to break the loop.
            parseItem = null;
            log.error(errMsg);
            break;
        }
    }

    csvStreamReader.close();

    return new Status(Status.OK);
};
