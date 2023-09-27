/* global empty */
'use strict';

/**
 * UpdateCustomerDataChunks.js
 *
 * Updates the the state to an abbreviation if it is set as the expanded state
 * name. The module gets all of the customers with a default payment method, then
 * checks the custom attributes of the default CustomerPaymentInstrument, and if
 * the PI has a state name that is not abreviated, it updates it to the 2 char.
 * abreviation.
 */

// SFCC API Imports
var CustomerMgr = require('dw/customer/CustomerMgr');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');
var Transaction = require('dw/system/Transaction');

// Script Module Imports
var StateHelpers = require('app_kind_snacks/cartridge/scripts/helpers/stateHelpers');

// Declare global variables.
var log = Logger.getLogger('customer-update', 'customer-update');
/** @type {dw.util.SeekableIterator<dw.customer.Profile>} */
var customers;

/**
 * @class
 * @classdesc A data classfor passing data to udpate the customer profile.
 * @param {dw.customer.CustoPaymentInstrument} paymentInstrument - The
 *      customer's default payment instrument that is used for recurring
 *      purchases.
 * @param {dw.customer.Profile} profile - The customer Profile.
 */
function ProfileUpdateModel(paymentInstrument, profile) {
    this.profile = profile;
    this.paymentInstrument = paymentInstrument;
}

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
    // Get the customers.
    customers = CustomerMgr.searchProfiles(
        'custom.defaultPaymentInstrument != NULL', 'lastModified asc');

    return new Status(Status.OK);
};

/**
 * Gets the total count of customer profiles that match the criteria specified.
 *
 * @returns {number} - Returns the count of customers in the iterator instance.
 */
exports.getTotalCount = function () {
    var count = customers.count;
    return count;
};

/**
 * Gets the next Profile in the iterator and returns it, or returns undefined if
 * there are no more profiles to be read.
 *
 * @return {dw.customer.Profile|undefined} - Returns the next profile or
 *      undefined.
 */
exports.read = function () {
    if (customers.hasNext()) {
        return customers.next();
    }

    return undefined;
};

/**
 * Gets the next customer profile in the SeekableIterator, gets the
 * CustomerPaymentInstrument that is customer's default, and checks if any
 * updates need to be done, then returns the fields to update with the customer
 * profile, or undefined if not updating.
 *
 * @param {dw.customer.Profile} profile - Customer profile returned from the
 *      read setp.
 * @returns {ProfileUpdateModel|undefined} -
 */
exports.process = function (profile) {
    var wallet = profile.wallet;
    var preferredUUID = !empty(profile.custom.defaultPaymentInstrument) ?
        profile.custom.defaultPaymentInstrument : '';
    var piCollection = wallet.getPaymentInstruments();
    var defaultPi;

    // Get the default payment instrument.
    if (piCollection.length && preferredUUID) {
        var x = 0;
        while (x < piCollection.length) {
            var pi = piCollection[x];
            if (pi.UUID === preferredUUID) {
                defaultPi = pi;
                break;
            }

            x++;
        }
    } else if (!piCollection.length) {
        // Log - No Payment Instruments in Wallet
        log.error('ERROR processing customer no: {0}' +
            '\n\tNo saved payment instruments found.',
            profile.customerNo);
        return undefined;
    } else {
        // Log - No Default Payment Instrument attribute found on profile.
        log.error('ERROR processing customer no: {0}' +
            '\n\tNo preferred payment instrument found.',
            profile.customerNo);
        return undefined;
    }

    return new ProfileUpdateModel(defaultPi, profile);
};

/**
 * Writes any changes to the customer Profile instances.
 *
 * @param {ProfileUpdateModel[]} chunk - An array of ProfileUpdateModel instances.
 */
exports.write = function (chunk) {
    var i = 0;

    while (i < chunk.size()) {
        var puModel = chunk.get(i);
        var pi = puModel.paymentInstrument;
        var state = !empty(pi) && !empty(pi.custom.stateCode) ?
            pi.custom.stateCode : '';

        // If the entire state name was used switch it for the abbreviation.
        if (!empty(state) && state.length > 2) {
            try {
                Transaction.begin();
                var stateCode = StateHelpers.getStateCode(state);
                if (stateCode !== state) {
                    pi.custom.stateCode = stateCode;
                    log.info('Updated state code of customer no: {0}',
                        puModel.profile.customerNo);
                }
                Transaction.commit();
            } catch (e) {
                var errMsg = 'ERROR processing customer {0}';
                errMsg += Object.keys(e).map(function (key) {
                    return '\n\t' + key + ': ' + e[key];
                }).join();

                log.error(errMsg, puModel.profile.customerNo);
                Transaction.rollback();
            }
        }

        i++;
    }
};

/**
 * Callback function that is executed once all other steps of the chunk
 * step-type have completed.
 *
 * @param {boolean} success - A success flag indicating if the job step has
 *      executed successfully.
 * @param {Object} args - The arguments object containing the parameters
 *      configured for the job step in Business Manager.
 * @param {dw.job.JobStepExecution} stepExecution - The job step execution
 *      instance for the job step.
 * @return {dw.system.Status} - Returns an instance of the Status class
 *      indicating the success of the job step execution.
 */
exports.afterStep = function (success, args, stepExecution) {
    var SeekableIterator = require('dw/util/SeekableIterator');
    log.info('Job Step {0} finished\nSuccess: {1}', stepExecution.ID, success);

    // Close the iterator
    if (customers instanceof SeekableIterator) {
        customers.close();
    }

    return new Status(Status.OK);
};
