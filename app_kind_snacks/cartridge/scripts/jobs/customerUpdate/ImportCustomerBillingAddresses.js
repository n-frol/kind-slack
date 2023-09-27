/* global empty */
'use strict';

/**
 * @file ImportCustomerBillingAddresses.js
 * @fileoverview - Exports a function for importing missing billing address
 * data from a CSV to a customer's default payment instrument as custom
 * attributes.
 */

// SFCC API imports
var CSVStreamReader = require('dw/io/CSVStreamReader');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

// Script imports
var StateHelpers = require('app_kind_snacks/cartridge/scripts/helpers/stateHelpers');

// Module level declarations
var log = Logger.getLogger('customer-update', 'customer-update');

/* ========================================================================
 * Private Helper Functions
 * ======================================================================== */

/**
 * Gets the CSV Reader for the specified import file or null if no file found.
 *
 * @param {string} fileName - The name of the import file.
 * @param {string} dirName - The name of the subdir in the IMPEX directory.
 * @return {dw.io.CSVStreamReader} - Returns the CSVStreamReader configured to
 *      read the specified import file.
 */
function getReader(fileName, dirName) {
    try {
        // Get a ref to the directory where the import file is located.
        var dirPath = File.IMPEX + File.SEPARATOR + dirName;
        var dir = new File(dirPath);

        // If the directory doesn't exist log error and return null.
        if (!dir.exists() || !dir.isDirectory() || !fileName) {
            log.error('ERROR: The path for the import file is not valid.');
            return null;
        }

        var file = new File(dir, fileName + '.csv');

        // If the import file doesn't exist log an error and return null.
        if (!file.exists() || file.isDirectory()) {
            log.error('ERROR: Import file does not exist at specified path');
            return null;
        }

        var fileReader = new FileReader(file, 'UTF-8');
        return new CSVStreamReader(fileReader);
    } catch (e) {
        var eMsg = 'ERROR - could not get import file:';
        eMsg += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();
        log.error(eMsg);
    }

    return null;
}

/**
 * Gets the required data fields from the CSV record.
 *
 * @param {string[]} csvRow - A row of the CSV.
 * @return {{customerNo: string, address1: string, address2: string, city: string, stateCode: string, phone: string}} -
 *      Returns a data object with key/val pairs for data attrs.
 */
function getRowData(csvRow) {
    return {
        customerNo: csvRow[0].trim(),
        address1: csvRow[4].trim(),
        address2: csvRow[5].trim(),
        city: csvRow[6].trim(),
        stateCode: StateHelpers.getStateCode(csvRow[7]),
        postalCode: csvRow[8].trim(),
        phone: csvRow[10].trim()
    };
}

/**
 * Updates the default payment instrument for the specified customer with the
 * billing address data in the import CSV file.
 *
 * @param {dw.customer.Profile} profile - The SFCC Customer Profile instance.
 * @param {Object} customerData - The CSV row data object for the customer.
 * @param {Date} reportDate - The job step's configured report date. If the
 *      customer's PI has been modified after this date, it will not be updated.
 */
function updateCustomer(profile, customerData, reportDate) {
    var wallet = profile.wallet;

    if (!empty(wallet) &&
        !empty(wallet.paymentInstruments) &&
        !empty(profile.custom.defaultPaymentInstrument)
    ) {
        var defaultUUID = profile.custom.defaultPaymentInstrument;
        var piArray = wallet.paymentInstruments.toArray();

        piArray.forEach(function (pi) {
            var modifiedDate = pi.lastModified;

            if (pi.UUID === defaultUUID && !empty(modifiedDate)) {
                if (modifiedDate.valueOf() < reportDate.valueOf()) {
                    try {
                        // Keep track of the fields that were updated.
                        var updatedFields = [];

                        // Begin Transaction
                        Transaction.begin();

                        // --- Address 1 ---
                        if (!empty(customerData.address1) &&
                            empty(pi.custom.address1)
                        ) {
                            pi.custom.address1 = customerData.address1;
                            updatedFields.push('address1');
                        }

                        // --- Address 2 ---
                        if (!empty(customerData.address2) &&
                            empty(pi.custom.address2)
                        ) {
                            pi.custom.address2 = customerData.address2;
                            updatedFields.push('address2');
                        }

                        // --- City ---
                        if (!empty(customerData.city) &&
                            empty(pi.custom.city)
                        ) {
                            pi.custom.city = customerData.city;
                            updatedFields.push('city');
                        }

                        // --- Postal Code ---
                        if (!empty(customerData.postalCode) &&
                            empty(pi.custom.postalCode)
                        ) {
                            pi.custom.postalCode = customerData.postalCode;
                            updatedFields.push('postalCode');
                        }

                        // --- State Code ---
                        if (!empty(customerData.stateCode) &&
                            empty(pi.custom.stateCode)
                        ) {
                            pi.custom.stateCode = customerData.stateCode;
                            updatedFields.push('stateCode');
                        }

                        // --- Phone No ---
                        if (!empty(customerData.phone) &&
                            empty(pi.custom.phone)
                        ) {
                            pi.custom.phone = customerData.phone;
                            updatedFields.push('phone');
                        }

                        // End Transaction
                        Transaction.commit();

                        // Log which fields were updated/
                        log.info('Successfully updated fields: {0}\n' +
                            'for customer no: {0}', updatedFields.join(', '),
                            customerData.customerNo);
                    } catch (e) {
                        Transaction.rollback();
                        var errMsg = 'ERROR unable to update customer no: {0}';
                        errMsg += Object.keys(e).map(function (key) {
                            return '\n\t' + key + ': ' + e[key];
                        }).join();

                        log.error(errMsg, customerData.customerNo);
                    }
                } else {
                    log.warn('WARN customer no {0} has updated the payment ' +
                        'instrument since report was run.\nPI will not be ' +
                        'updated.', customerData.customerNo);
                }
            }
        });
    } else {
        log.error('ERROR no payment instruments in wallet for customer no {0}',
            customerData.customerNo);
    }
}

/* ========================================================================
 * Public Exported Functions
 * ======================================================================== */

/**
 * Gets the customer addresses from the specified CSV file in the Job Step
 * configuration in BM, and adds the missing custom data attributes to the
 * customer's default payment instrument.
 *
 * @param {Object} args - An arguments object containing key/val pairs for any
 *      arguments configured in the Job Step in BM.
 * @return {dw.system.Status} - Returns a SFCC system status instance to signal
 *      the success or failure of the job execution.
 */
module.exports.importCustomerAddresses = function (args) {
    // SFCC API includes
    var CustomerMgr = require('dw/customer/CustomerMgr');

    log.info('Beginning Customer Address Import...');
    log.info('Attempting to find import file...');

    // Get the argument values from the Job Step configuration in BM.
    var fileName = !empty(args.fileName) ? args.fileName : 'billing_addresses';
    var dirName = !empty(args.directory) ? args.directory : 'temp';
    var dateParam = !empty(args.reportDate) ? args.reportDate : '03/20/2019';
    var reportDate = new Date(dateParam);

    // Get the CSV Reader for the import file.
    var csvReader = getReader(fileName, dirName);

    // If the import can't be found return an ERROR Status.
    if (empty(csvReader)) {
        log.error('ERROR: Unable to find or read import file!');
        return new Status(Status.ERROR);
    }

    log.info('Import file found...');
    log.info('Reading import rows...');

    // Skip the header row.
    var csvRow = csvReader.readNext();

    // Get the first record.
    csvRow = csvReader.readNext();

    while (!empty(csvRow)) {
        try {
            var rowData = getRowData(csvRow);
            var profile = CustomerMgr.getProfile(String(rowData.customerNo));

            if (!empty(profile)) {
                // Call the transactional method to update the custom attrs.
                updateCustomer(profile, rowData, reportDate);
            } else {
                log.error('ERROR customer not found: {0}', rowData.customerNo);
            }
        } catch (e) {
            // Get the full error object for logging.
            var errMsg = 'ERROR updating customer address:\n';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            log.error(errMsg);
        }
        csvRow = csvReader.readNext();
    }

    log.info('Finished updating customers...');
    csvReader.close();

    return new Status(Status.OK);
};
