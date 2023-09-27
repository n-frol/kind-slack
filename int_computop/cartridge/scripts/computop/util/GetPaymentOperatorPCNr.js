'use strict';
/**
 * This script will request a PCNr from computop when the customer saves a credit card
 * in the payment settings (customer account)
 */

/* API includes */
var cdpmLogger = require('dw/system/Logger').getLogger('paymentOperator', 'paymentOperator');

(function (exports) {
    var logPrefix = 'PAYMENTOPERATOR_PAYMENTGATE - GetPaymentOperatorPCNr.js\n\t';

    /**
     * Save PCNr for new credit card / customer payment instrument
     *
     * @param {Object} params - with creditCardFormFields
     * @returns {Object} - with paygate response data
     */
    function getPCNr(params) {
        var result = {};

        try {
            // create transfer object
            var CreditDirectAuthorizeObject = require('~/cartridge/scripts/computop/transferobjects/CreditDirectAuthorize');
            CreditDirectAuthorizeObject.setPaymentInformation(params);
            // call service
            var CreditDirectService = require('~/cartridge/scripts/computop/svc/CreditDirectService');
            CreditDirectService.call(CreditDirectAuthorizeObject.getTransferObject());
            result = CreditDirectService.getResponse();
        } catch (err) {
            cdpmLogger.error(logPrefix + 'Error while retrieving PCNr from paygate! ' +
                err.fileName + ': ' + err.message + '\n' + err.stack);
            result.Status = 'error';
        }
        return result;
    }

    exports.getPCNr = getPCNr; // eslint-disable-line no-param-reassign
}(module.exports));
