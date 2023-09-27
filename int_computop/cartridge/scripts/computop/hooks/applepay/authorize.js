'use strict';

/* API includes */
var cdpmLogger          = require('dw/system/Logger').getLogger('paymentOperator');
var PaymentInstrument   = require('dw/order/PaymentInstrument');
var Status              = require('dw/system/Status');

/* Script includes */

exports.authorizeOrderPayment = function(order, event) {
    cdpmLogger.debug("CDPM authorizeOrderPayment \n" + JSON.stringify(event));

    var paymentInstruments = order.getPaymentInstruments(
            PaymentInstrument.METHOD_DW_APPLE_PAY
        ).toArray();

    if ( !paymentInstruments.length ) {
        Logger.error('Unable to find Apple Pay payment instrument for order.');
        return new Status(Status.ERROR);
    }

    if ( typeof event != 'object' && -1 == Object.keys(event).indexOf('payment') ) {
            Logger.error('Authorization event object invalid for payment transaction with applePay.');
            return new Status(Status.ERROR);
        }

    try {
        // prepare request object
        var transferObject = require('~/cartridge/scripts/computop/transferobjects/ApplePay');
        transferObject.setApplePayData(event)
            .setLineItemCtnr(order);

        // call paygate
        var service = require('~/cartridge/scripts/computop/svc/ApplePayService');
        service.call(transferObject.getTransferObject());
        

        // handle response
        var response = service.getResponse();
        require('~/cartridge/scripts/computop/util/SavePaymentOperatorData').savePaymentOperatorResponse(order, response);

        if( ['OK', 'success', 'AUTHORIZE_REQUEST'].indexOf(response.Status) === -1 ) {
        	cdpmLogger.warn('Authorization (applepay) failed for order ' + order.orderNo);
        	return new Status(Status.ERROR);
        }

    } catch ( err ) {
        cdpmLogger.error("Error while sending applepay authorization to cdpm! \n" + err.fileName + ': ' + err.message + '\n' + err.stack);
        return new Status(Status.ERROR);
    }

    return new Status(Status.OK);
};
