/* global empty */
'use strict';

/**
 * OrderTransactionalEmails.js
 *
 * Triggers transactional emails to be sent through Marketing Cloud
 */

// SFCC system class imports.
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var HookMgr = require('dw/system/HookMgr');
var HashMap = require('dw/util/HashMap');
var SecureEncoder = require('dw/util/SecureEncoder');
var Site = require('dw/system/Site');
var Status = require('dw/system/Status');

// Module level declarations.
var comLog = Logger.getLogger('email', 'communication');

/**
 * Get Body of Email
 * @param {Object} Email: Custom Object
 * @returns {Object} EmailBody: Body of Email
 */
function getEmailBody(Email) {
    var EmailBody = {};
    if (!empty(Email) && !empty(Email.custom.emailType)) {
        var amountRefunded;
        var orderNumber = Email.custom.orderNumber;

        if (!empty(orderNumber)) {
            var Order = OrderMgr.getOrder(orderNumber);

            if (!empty(Order)) {
                amountRefunded = Order.totalGrossPrice.toFormattedString();
            }
        }

        if ((Email.custom.emailType.value === 'shippingConfirmation') || (Email.custom.emailType.value === 'partiallyShippedConfirmation')) {
            var productLineItems = Email.custom.productLineItems;
            var address1 = Email.custom.shippingAddress1;
            var address2 = Email.custom.shippingAddress2;
            var city = Email.custom.shippingCity;
            var state = Email.custom.shippingState;
            var postalCode = Email.custom.shippingPostalCode;
            var trackingURL = Email.custom.trackingURL;
            var trackingNumber = Email.custom.trackingNumber;

            if (!empty(productLineItems) && !empty(address1) && !empty(city) && !empty(state)
                && !empty(postalCode)) {
                EmailBody.productLineItems = productLineItems;
                EmailBody.address1 = address1;

                if (!empty(address2)) {
                    EmailBody.address2 = address1;
                }

                EmailBody.city = city;
                EmailBody.state = state;
                EmailBody.postalCode = postalCode;
            }

            if (!empty(trackingURL)) {
                EmailBody.trackingURL = trackingURL;
            }

            if (!empty(trackingNumber)) {
                EmailBody.trackingNumber = trackingNumber;
            }
        } else if (Email.custom.emailType.value === 'orderCancellation' || Email.custom.emailType.value === 'orderRefund') {
            if (!empty(amountRefunded)) {
                EmailBody.amountRefunded = amountRefunded;
            }
        }

        if (!empty(EmailBody)) {
            var firstName = Email.custom.firstName;
            var lastName = Email.custom.lastName;
            var email = Email.custom.email;
            var emailType = Email.custom.emailType;
            var billingFirstName = Email.custom.billingFirstName;

            /**
             * Require order number, first name, email, and emailType
             */
            if (!empty(orderNumber) && !empty(firstName) && !empty(email)) {
                EmailBody.orderNumber = orderNumber;
                EmailBody.firstName = firstName;
                EmailBody.email = email;
                EmailBody.emailType = emailType;
                EmailBody.billingFirstName = billingFirstName;

                if (!empty(lastName)) {
                    EmailBody.lastName = lastName;
                }
                return EmailBody;
            }
        }
    }
    return false;
}

function generateLineItemXML(productLineItems) {
    var xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><product-lineitems>';

    for (var i = 0; i < productLineItems.length; i++) {
        var productLineItem = productLineItems[i];

        xml += '<product-lineitem>';
        xml += '<product-name>' + SecureEncoder.forXmlContent(productLineItem.productName) + '</product-name>';
        xml += '<product-id>' + SecureEncoder.forXmlContent(productLineItem.productID) + '</product-id>';
        xml += '<product-quantity>' + SecureEncoder.forXmlContent(productLineItem.productQuantityShipped) + '</product-quantity>';
        xml += '</product-lineitem>';
    }

    xml += '</product-lineitems>';

    return xml;
}

/**
 * Executes the Order Transactional Emails Trigger to Marketing Cloud
 */
function execute() {
    var logPrefix = 'OrderTransactionalEmails Job: ';
    var Emails = CustomObjectMgr.getAllCustomObjects('OrderTransactionalEmails');
    var eString = '';
    var orderNo = '';
    var emailType = '';

    while (Emails.hasNext()) {
        var Email = Emails.next();
        /*
         * Try to trigger all emails and if successful, remove the custom object.
         */
        try {
            var emailBody = getEmailBody(Email);
            var communicationHookID;
            var paramHash = new HashMap();
            var toEmail = !empty(emailBody.email) ? emailBody.email : null;
            var fromEmail = Site.current.getCustomPreferenceValue(
                'customerServiceEmail') || 'customerservice@kindsnacks.com';

            emailType = emailBody.emailType.value;
            orderNo = !empty(emailBody.orderNumber) ?
                emailBody.orderNumber : null;

            switch (emailType) {
                case 'shippingConfirmation':
                    communicationHookID = 'oms.shipment';
                    break;
                case 'partiallyShippedConfirmation':
                    communicationHookID = 'oms.partialShipment';
                    break;
                case 'orderCancellation':
                    communicationHookID = 'oms.cancellation';
                    break;
                case 'orderRefund':
                    communicationHookID = 'oms.refund';
                    break;
                default:
                    break;
            }

            if (!empty(communicationHookID)) {
                if (emailType === 'shippingConfirmation' || emailType === 'partiallyShippedConfirmation') {
                    paramHash.put('OrderNumber', orderNo);
                    paramHash.put('firstName', !empty(emailBody.firstName) ? emailBody.firstName : null);
                    paramHash.put('lastName', !empty(emailBody.lastName) ? emailBody.lastName : null);
                    paramHash.put('billingFirstName', !empty(emailBody.billingFirstName) ? emailBody.billingFirstName : null);
                    paramHash.put('address1', !empty(emailBody.address1) ? emailBody.address1 : null);
                    paramHash.put('address2', !empty(emailBody.address2) ? emailBody.address2 : null);
                    paramHash.put('city', !empty(emailBody.city) ? emailBody.city : null);
                    paramHash.put('state', !empty(emailBody.state) ? emailBody.state : null);
                    paramHash.put('postalCode', !empty(emailBody.postalCode) ? emailBody.postalCode : null);
                    paramHash.put('productLineItems', generateLineItemXML(JSON.parse(emailBody.productLineItems)));
                    if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                        paramHash.put('productLineItemsRaw', emailBody.productLineItems);
                    }
                    paramHash.put('trackingURL', !empty(emailBody.trackingURL) ? emailBody.trackingURL : null);
                    paramHash.put('trackingNumber', !empty(emailBody.trackingNumber) ? emailBody.trackingNumber : null);
                } else if (emailType === 'orderCancellation' || emailType === 'orderRefund') {
                    if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                        paramHash.put('OrderNumber', orderNo);
                    } else {
                        paramHash.put('orderNumber', orderNo);
                    }
                    paramHash.put('firstName', !empty(emailBody.firstName) ? emailBody.firstName : null);
                    paramHash.put('lastName', !empty(emailBody.lastName) ? emailBody.lastName : null);
                    paramHash.put('billingFirstName', !empty(emailBody.billingFirstName) ? emailBody.billingFirstName : null);
                    paramHash.put('amountRefunded', !empty(emailBody.amountRefunded) ? emailBody.amountRefunded : null);
                }

                // Klaviyo send
                if (dw.system.Site.getCurrent().getCustomPreferenceValue('klaviyo_enabled')) { // eslint-disable-line no-undef
                    var EmailUtils = require('*/cartridge/scripts/utils/klaviyo/EmailUtils');
                    // FR if the klaviyo service fails for any reason save the object for later
                    if (EmailUtils.sendOrderEmailCustom(toEmail, paramHash, emailType) === false) {
                        comLog.error("Error sending e-mail to " + toEmail + ". Order #  " + orderNo);
                        // continue; // eslint-disable-line no-continue
                        throw new Error('Error sending notification');
                    }
                } else {
                    var hookID = 'app.mail.sendMail';

                    if (HookMgr.hasHook(hookID)) {
                        // expects a Status object returned from the hook call
                        var result = HookMgr.callHook(
                            hookID,
                            'sendMail',
                            {
                                communicationHookID: communicationHookID,
                                fromEmail: fromEmail,
                                toEmail: toEmail,
                                params: paramHash
                            }
                        );

                        comLog.error(result);

                        if (result.status !== Status.OK) {
                            throw new Error('Error sending notification');
                        }

                        // Create a log message string.
                        var infoMsg = logPrefix +
                            'Email Communication Was Sent:\n';
                        infoMsg += '\tEmail Type: {0}\n';
                        infoMsg += '\tOrder Number: {1}\n';
                        infoMsg += '\tsend status: {2}\n';
                        infoMsg += '\tEmail To: {3}\n';
                        infoMsg += '\tEmail From: {4}\n';

                        // Log information on the email sent.
                        comLog.info(
                            infoMsg,
                            emailType,
                            orderNo,
                            result.status === Status.OK ? 'OK' : 'ERROR',
                            toEmail,
                            fromEmail
                        );
                    } else {
                        comLog.error(logPrefix + 'No hook registered for {0}\n' +
                            '\tOrder Number: {1}',
                            hookID, orderNo);
                    }
                }
                //
                try {
                    Transaction.begin();
                    CustomObjectMgr.remove(Email);
                    Transaction.commit();
                } catch (e) {
                    Transaction.rollback();
                    eString = Object.keys(e).map(function (key) {
                        return '\n\t' + key + ': ' + e[key];
                    }).join();

                    eString = logPrefix + 'Failed to remove the ' +
                        'OrderTransactionalEmails CustomObject — ID: {0}\n' +
                        '\tOrder Number: {1}\n' +
                        eString;
                    comLog.error(eString, Email.custom.ID, orderNo);
                }
            } else {
                comLog.warn(logPrefix + 'Email type "{0}" not supported.\n' +
                    '\tOrder Number: {1}', emailType);
            }
        } catch (e) {
            // Log all properties of the Error object.
            eString = Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();

            eString = logPrefix +
                '\tFailed to trigger the following Email — ID: {0}\n' +
                '\tOrder Number: {1}' +
                eString;
            comLog.error(eString, Email.custom.ID, orderNo);
            throw new Error('Error sending notification');
        }
    }
}

/** Exported functions **/
module.exports = {
    execute: execute
};
