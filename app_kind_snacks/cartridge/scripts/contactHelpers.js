/* global empty */
'use strict';

var HashMap = require('dw/util/HashMap');
var Logger = require('dw/system/Logger');
var Mail = require('dw/net/Mail');
var Resource = require('dw/web/Resource');
var Site = require('dw/system/Site');
var Template = require('dw/util/Template');

/**
 * Recursively puts form data into the context object for the email
 * @param {dw.order.Order} form - The form data submitted
 * @param {dw.util.HashMap} ctx - The current context object
 * @param {array} fieldsToInclude - A specific list of fields to include in the context
 * @returns {dw.util.HashMap} context - The current context object with fields added
 */
function putFormFields(form, ctx, fieldsToInclude) {
    var context = ctx;

    Object.keys(form).forEach(function (key) {
        if (!empty(form[key])) {
            var field = form[key];

            if (!empty(field.formType) && field.formType === 'formGroup') {
                context = putFormFields(field, context, fieldsToInclude);
            } else if (!empty(fieldsToInclude)) {
                if (fieldsToInclude.indexOf(key) > -1) {
                    context.put(key, field.htmlValue || context.get(key) || ''); // In case there's a duplicate of a field, don't overwrite filled in value with blank value
                }
            } else if (!empty(field.formType) || !empty(field.htmlValue)) {
                context.put(key, field.htmlValue || '');
            }
        }
    });

    return context;
}

/**
 * Sends a customer service contact email from the current user.
 *
 * @param {dw.web.FormGroup} form - The form data submitted.
 * @param {string} [locale] - the current request's locale id.
 * @param {array} fields - A specific list of fields to include in the email
 * @returns {void}
 */
function sendContactEmail(form, locale, fields) {
    var emailType = 'Customer Service Email';
    var log = Logger.getLogger('email', 'communication');
    var template;
    var content;

    var context = new HashMap();
    var contextWrap = new HashMap();

    putFormFields(form, context, fields);

    contextWrap.put('formFields', context);

    var fromEmail = form.addressFields.email.htmlValue;
    var toEmail = Site.current.getCustomPreferenceValue('customerServiceEmail');
    var subject = Resource.msg('subject.contact', 'forms', null);
    var templateName = 'contact/contactEmail';
    var contactEmail = new Mail();
    contactEmail.addTo(toEmail);
    contactEmail.setSubject(subject);
    contactEmail.setFrom(fromEmail);

    template = new Template(templateName);
    content = template.render(contextWrap).text;
    var mimeType = 'text/html';
    var encoding = 'UTF-8';

    contactEmail.setContent(content, mimeType, encoding);
    var sendStatus = contactEmail.send();

    // Create a log string.
    var infoMsg = 'Email send log:\n';
    infoMsg += '\tsending email of type: {0}\n';
    infoMsg += '\tsend status: {1}\n';
    infoMsg += '\tto: {2}\n';
    infoMsg += '\tfrom: {3}\n';
    infoMsg += '\tsubject: {4}\n';
    infoMsg += '\temail template used: {5}\n';
    infoMsg += '\temail MIME type: {6}\n';
    infoMsg += '\temail Encoding: {7}';


    // Log the email sent.
    log.info(
        infoMsg,
        emailType,
        sendStatus.code,
        toEmail,
        fromEmail,
        subject,
        templateName,
        mimeType,
        encoding
    );
}

/**
 * Sends a customer service contact email from the current user.
 *
 * @param {dw.web.FormGroup} form - The form data submitted.
 * @param {string} [locale] - the current request's locale id.
 * @param {array} fields - A specific list of fields to include in the email
 * @returns {void}
 */
function sendConfirmationEmail(form) {
    var emailType = 'Donation Confirmation Email';
    var log = Logger.getLogger('email', 'communication');
    var template;
    var content;

    var context = new HashMap();
    var contextWrap = new HashMap();

    contextWrap.put('formFields', context);

    var toEmail = form.addressFields.email.htmlValue;
    var fromEmail = Site.current.getCustomPreferenceValue('customerServiceEmail');
    var subject = Resource.msg('email.donations.success', 'forms', null);
    var templateName = 'contact/donationsEmail';
    var contactEmail = new Mail();
    contactEmail.addTo(toEmail);
    contactEmail.setSubject(subject);
    contactEmail.setFrom(fromEmail);

    template = new Template(templateName);
    content = template.render(contextWrap).text;
    var mimeType = 'text/html';
    var encoding = 'UTF-8';

    contactEmail.setContent(content, mimeType, encoding);
    var sendStatus = contactEmail.send();

    // Create a log string.
    var infoMsg = 'Email send log:\n';
    infoMsg += '\tsending email of type: {0}\n';
    infoMsg += '\tsend status: {1}\n';
    infoMsg += '\tto: {2}\n';
    infoMsg += '\tfrom: {3}\n';
    infoMsg += '\tsubject: {4}\n';
    infoMsg += '\temail template used: {5}\n';
    infoMsg += '\temail MIME type: {6}\n';
    infoMsg += '\temail Encoding: {7}';


    // Log the email sent.
    log.info(
        infoMsg,
        emailType,
        sendStatus.code,
        toEmail,
        fromEmail,
        subject,
        templateName,
        mimeType,
        encoding
    );
}


module.exports = {
    sendConfirmationEmail: sendConfirmationEmail,
    sendContactEmail: sendContactEmail
};
