/* global empty */
'use strict';

/**
 * ReportMissingBillingData.js
 *
 * Exports callback functions for a custom chunk-step-module job step which
 * finds all customers who have a stored default CustomerPaymentInstrument, and
 * then writes which billing address custom attributes are not set on the
 * payment instrument to a csv log file.
 */

// SFCC API imports
var CSVStreamWriter = require('dw/io/CSVStreamWriter');
var CustomerMgr = require('dw/customer/CustomerMgr');
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

// Declare module level variables.
var log = Logger.getLogger('customer-update', 'customer-update');
/** @type {dw.util.SeekableIterator<dw.customer.Profile>} */
var customers;
var csvStreamWriter;

/** @constant - The names of the columns to write in the export file. */
var EXPORT_COLUMNS = [
    'customerNo',
    'isMissingFields',
    'missingFieldNames',
    'paymentMethodType'
];

/* ==========================================================================
 * Private Helper Functions
 * ========================================================================== */

 /**
 * Get the stream writer instance configured to write values to the file at the
 * path in the IMPEX directory that is specified in the job step configuration
 * in Business Manager.
 *
 * @param {Object} args - An arguments object containing key/val pairs for any
 *      parameters configured for this job step in the job step configuration.
 * @param {string} args.directory - The directory in the IMPEX directory that
 *      the export file should be created within.
 * @param {string} args.fileName - The name of the CSV file that the log
 *      entries should be written to.
 * @return {dw.io.CSVStreamWriter} - Returns an instance of the CSVStreamWriter
 *      class that is configured to write data to the specified export file.
 */
function getCSVStreamWriter(args) {
    log.info('Getting CSVStreamWriter...');
    var directory = !empty(args.directory) ? args.directory : 'temp';
    var filename = !empty(args.fileName) ? args.fileName : 'MissingBillingAddresses';
    var saveDirPath = File.IMPEX + File.SEPARATOR + directory;
    var saveDirectory = new File(saveDirPath);

    // Append the date to the filename
    filename += '.csv';

    // Get a reference to the file.
    var file = new File(saveDirectory, filename);

    // Check if the file exists
    if (file.exists()) {
        var msg = 'File with name {0} already exists in the IMPEX directory.';
        try {
            if (!file.remove()) {
                log.error('ERROR: Unable to remove export with the same name: {0}',
                    saveDirPath + File.SEPARATOR + filename);
                return null;
            }

            log.warn(msg + '\nDuplicate file removed.',
                saveDirPath + File.SEPARATOR + filename);

            // Reset the reference to point at the desired export file location.
            file = new File(saveDirectory, filename);
        } catch (e) {
            var logMsg = 'ERROR: Unable to get CSVStreamWriter instance:';
            logMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            });
            log.error(logMsg);
            return null;
        }
    }

    // If unable to get the file then return an error.
    if (empty(file)) {
        log.error('ERROR: Could not create export file.');
        return new Status(Status.ERROR);
    }

    // Create the file & csv stream writer instances.
    var fileWriter = new FileWriter(file);
    var csvWriter = new CSVStreamWriter(fileWriter);

    log.info('CSVStreamWriter for file {0} successfully created.',
        saveDirPath + File.SEPARATOR + filename);

    return csvWriter;
}

/* ==========================================================================
 * Exported Step Functions
 * ========================================================================== */

/**
 * Chunk type job step lifecycle function that is called before the execution
 * of the associated job.
 *
 * @param {Object} args - An arguments object holding any parameters configured
 *      in BM for the specific Job Step.
 * @returns {dw.system.Status} - Returns a system status to indicate the success
 *      or failure of the job step.
 */
exports.beforeStep = function (args) {
    // Get the CSVStreamWriter instance.
    csvStreamWriter = getCSVStreamWriter(args);
    // Get the customer profiles.
    customers = CustomerMgr.searchProfiles(
        'custom.defaultPaymentInstrument != NULL', 'lastModified asc');

    log.info('Total Customers w/defualt PI: {0}', customers.count);

    // Write the header row to the CSV file.
    csvStreamWriter.writeNext(EXPORT_COLUMNS);

    return new Status(Status.OK);
};

/**
 * Gets the total count of customers found in the initial query.
 *
 * @returns {number} - The total count of customer profiles in the collection.
 */
module.exports.getTotalCount = function () {
    var count = customers.count;
    return count;
};

/* eslint-disable consistent-return */
/**
 * Gets the next customer profile from the iterator.
 *  - NOTE: ESLint consistent-return is disabled so that bad results can be
 *       be filtered out by not returning any value.
 *
 * @returns {dw.customer.Profile|undefined} - Returns the next Profile in the
 *      SeekableIterator.
 */
module.exports.read = function () {
    if (customers.hasNext()) {
        return customers.next();
    }
};


/**
 * Determines what custom attributes are missing (if any) from the default
 * payment instrument in the customer profile's wallet, and returns an object
 * for writing values to the export file.
 *
 * @param {dw.customer.Profile} profile - The customer profile instance to
 *      process.
 * @returns {string[]} -
 *      Returns an object with data to write to the export file.
 */
module.exports.process = function (profile) {
    var defaultPI;
    var paymentMethodType = 'None';
    var missingAttrs = [];

    try {
        // Make sure there are payment instruments.
        if (!empty(profile.wallet) &&
            !empty(profile.wallet.paymentInstruments) &&
            !empty(profile.custom.defaultPaymentInstrument)
        ) {
            // Find the PaymentInstrument that is set as the customer's default.
            profile.wallet.paymentInstruments.toArray().forEach(function (pi) {
                if (pi.UUID === profile.custom.defaultPaymentInstrument) {
                    defaultPI = pi;
                    paymentMethodType = pi.paymentMethod;
                }
            });

            // If the default doesn't match a saved PI then throw an exception.
            if (!empty(defaultPI)) {
                // Check each address custom attribute to see if they are missing.
                // NOTE: address2 is not included for lookup but should be populated
                //      if address1 is missing.
                if (empty(defaultPI.custom.address1)) {
                    missingAttrs.push('address1');
                }

                if (empty(defaultPI.custom.phone)) {
                    missingAttrs.push('phone');
                }

                if (empty(defaultPI.custom.city)) {
                    missingAttrs.push('city');
                }

                if (empty(defaultPI.custom.postalCode)) {
                    missingAttrs.push('postalCode');
                }

                if (empty(defaultPI.custom.stateCode)) {
                    missingAttrs.push('stateCode');
                }

                if (!empty(missingAttrs)) {
                    return [
                        profile.customerNo,
                        missingAttrs.length > 0 ? 'true' : 'false',
                        missingAttrs.join(','),
                        paymentMethodType
                    ];
                }

                log.info('No missing attributes on PI for customer {0}',
                    profile.customerNo);
            } else {
                log.warn('No defualt payment instrument found for customer {0}',
                    profile.customerNo);
            }
        } else {
            log.warn('No payment instruments in wallet for customer {0}',
                profile.customerNo);
        }
    } catch (e) {
        var errMsg = 'ERROR: There was an error processing a customer';
        errMsg += Object.keys(e).map(function (key) {
            return '\n\t' + key + ': ' + e[key];
        }).join();

        log.error(errMsg);

        /*
         * NOTE: Nothing is returned when there is an error in order to filter
         *      the result, and keep it from being written to the CSV report a
         *      second time.
         */
    }
};
/* eslint-enable consistent-return */

/**
 * Writes the results of each chunk of customer records to the CSV report file.
 *
 * @param {dw.util.List<string[]>} chunk - Returns a List of data objects.
 */
module.exports.write = function (chunk) {
    var i = 0;
    while (i < chunk.size()) {
        try {
            var customerRecord = chunk.get(i);

            if (!empty(customerRecord)) {
                csvStreamWriter.writeNext(customerRecord.toArray());
            }
        } catch (e) {
            var errMsg = 'ERROR:';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            log.error(errMsg);
        }

        i++;
    }
};

module.exports.afterStep = function (success) {
    if (!success) {
        log.error('ERROR: Job did not finish successfully.');
        return new Status(Status.ERROR);
    }

    csvStreamWriter.close();
    customers.close();

    return new Status(Status.OK);
};
