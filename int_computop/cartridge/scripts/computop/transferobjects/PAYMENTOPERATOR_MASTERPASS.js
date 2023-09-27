'use strict';
/**
 * Transfer object for payment method MasterPass redirect step (1)
 */

/* Script includes */
var AbstractMasterPassRedirectPayment = require('./AbstractMasterPassRedirectPayment');

var MasterPass = AbstractMasterPassRedirectPayment.extend({
    init: function () {
        this._super(); // eslint-disable-line no-underscore-dangle
    }
});
module.exports = new MasterPass();
