/* global empty */

'use strict';

/**
 * hookLogger.js
 *
 * Exports functions for logging calls to existing hook points.
 * @module HooksLogger
 */

/**
 * Logs any email attempts that are made through the app.mail.sendMail hook.
 *
 * @memberof HooksLogger
 * @listens app.mail.sendMail
 * @param {Object} args - An arguments object containing information for the
 *      email that needs to be sent.
 * @returns {dw.system.Status} - Returns an SFCC Status instance indicating the
 *      success or failure of the hook execution.
 */
function sendMail(args) {
    var Logger = require('dw/system/Logger');
    var Status = require('dw/system/Status');
    var log = Logger.getLogger('email', 'communication');
    var infoMsg = 'hookLogger.js - Email Communication Attempt:\n';
    var params = !empty(args.params) ? args.params : {};
    var orderNo;
    var fields = {
        communicationHookID: { label: 'Email Hook Type: ' },
        template: { label: 'Template Name: ' },
        fromEmail: { label: 'Email From: ' },
        toEmail: { label: 'Email To: ' },
        subject: { label: 'Email Subject: ' }
    };

    // Loop through the email fields to log, and add the label and value to the
    // log message string.
    Object.keys(fields).forEach(function (key) {
        if (args[key]) {
            infoMsg += '\t' + fields[key].label + ': ' + args[key] + '\n';
        }
    });

    // If the args object has a params object property, try to get the order #.
    if (params) {
        orderNo = !empty(params.order) &&
            !empty(params.order.orderNumber) ?
            params.order.orderNumber : '';

        // Check for different properties that the Order # is found in,
        // depending on where in the site the hook was called from.
        if (!orderNo) {
            if (!empty(params.orderNumber)) {
                orderNo = params.orderNumber;
            } else if (!empty(params.OrderNumber)) {
                orderNo = params.OrderNumber;
            }
        }
    }

    // If an order # was found, add it to the log message.
    if (!empty(orderNo)) {
        infoMsg += '\tOrder Number: ' + orderNo + '\n';
    }

    // Add the name of the current hook to the log message.
    infoMsg += '\tExecuted From Hook: app.mail.sendMail';

    // Log the email attempt.
    log.info(infoMsg);

    // Always return a successful status to keep from blocking the email from
    // sending.
    return new Status(Status.OK);
}

module.exports = {
    sendMail: sendMail
};
