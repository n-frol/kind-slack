/**
 * Service class for method MasterPass / MasterPassQuickCheckout transaction step (2)
 */

/* Script includes */
var AbstractComputopService = require('./AbstractComputopService');

var MasterPassTransactionService = AbstractComputopService.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
        this.relativeURLPath = this.getSitePreference('paymentOperatorMasterPassTransactionGatewayPath');
    }
});
// Export the configured service singleton
module.exports = (new MasterPassTransactionService()).getService();
