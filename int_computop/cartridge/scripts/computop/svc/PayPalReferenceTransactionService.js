/**
 * Service class for PayPal Reference transactions using an existing PayPal
 * billing agreement ID.
 */


// Script includes
var AbstractComputopService = require('./AbstractComputopService');

var PayPalReferenceTransactionService = AbstractComputopService.extend({
    init : function() {
        this._super();
        this.relativeURLPath = this.getSitePreference(
            'paymentOperatorPayPalReferencePaymentPath');
    }
});

//Export the configured service singleton
module.exports = (new PayPalReferenceTransactionService()).getService();