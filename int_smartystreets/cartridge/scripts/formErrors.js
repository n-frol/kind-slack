/* global empty */

'use strict';

/**
 * Get any form validation errors and add them to an object.
 *
 * @param {Object} form - the target form to return any validation errors from.
 * @returns {Object} - an object that contain any errors in the form.
 */
function getFormErrors(form) {
    var results = {};

    if (empty(form)) {
        return {};
    }

    Object.keys(form).forEach(function (key) {
        if (!empty(form[key]) && Object.prototype.hasOwnProperty.call(
                form[key], 'formType')) {
            if (form[key].formType === 'formField' && !form[key].valid) {
                results[form[key].htmlName] = form[key].error;
            }
            if (form[key].formType === 'formGroup') {
                var innerFormResult = getFormErrors(form[key]);
                Object.keys(innerFormResult).forEach(function (innerKey) {
                    results[innerKey] = innerFormResult[
                        innerKey];
                });
            }
        }
    });
    return results;
}

/**
 * Removes the htmlValue and value properties of a form
 * @param {Object} form - the target product line item
 * @returns {void}
 */
function removeFormValues(form) {
    if (empty(form)) {
        return;
    }

    Object.keys(form).forEach(function (key) {
        if (form[key]) {
            if (form[key].formType === 'formField') {
                delete form[key].htmlValue; // eslint-disable-line no-param-reassign
                delete form[key].value; // eslint-disable-line no-param-reassign
            }

            if (form[key].formType === 'formGroup') {
                removeFormValues(form[key]);
            }
        }
    });

    return;
}

module.exports = {
    getFormErrors: getFormErrors,
    removeFormValues: removeFormValues
};
