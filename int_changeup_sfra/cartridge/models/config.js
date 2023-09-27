'use strict';

/**
 * Sets flags and class names for displaying the Changeup UI during checkout
 *
 * @param {Object} config - The config object retrieved from .getConfig()
 * @returns {Object} flags for displaying charity logos, and a wrapper class for handling checkbox vs no checkbox
 */
function getCheckoutDisplay(config) {
    var showDefaultLogo = false;
    var showFeaturedRow = false;
    var showTotalDonations = false;
    var displayClass = '';

    // Show the Default Charity Logo??
    if (config.default_charity && config.default_charity.logo) {
        showDefaultLogo = true;
    }

    // Show the Featured Charity Row??
    // if so, then do not show the default charity
    if (config.featured_charities && config.featured_charities.length) {
        showFeaturedRow = true;
        showDefaultLogo = false;
    }

    // Class for the donation container??
    if (config.donation_type_actor === 'merchant') {
        displayClass = 'merchant';
    }

    // Show the total donations line??
    if (config.total_donations_toggle === true) {
        showTotalDonations = true;
    }

    return {
        showDefaultLogo: showDefaultLogo,
        showFeaturedRow: showFeaturedRow,
        showTotalDonations: showTotalDonations,
        displayClass: displayClass
    };
}

/**
 * Determines the message and sub message for the Changeup UI during checkout.  The messaging
 * is dynamic based on the Changeup config defined in the BM dashboard.
 *
 * This also relies on the changeup resource bundle.
 *
 * @param {Object} config - the config object retrieved from .getConfig()
 * @returns {Object} containing the primary and secondary UI messaging
 */
function getCheckoutResources(config) {
    var Resource = require('dw/web/Resource');

    var args = [];

    var msgKeys = ['message'];
    msgKeys.push(config.donation_type_actor);
    msgKeys.push(config.donation_type_option);

    var subMsgKeys = ['submessage'];

    if (config.donation_type_option !== 'roundup' && config.donation_type_actor !== 'merchant') {
        args.push(config.donation_type_amount);
    }

    if (config.checkout_display.showDefaultLogo) {
        msgKeys.push('default_charity');
        subMsgKeys.push('default_charity');
        args.push(config.default_charity.display);
    } else if (config.checkout_display.showFeaturedRow) {
        subMsgKeys.push('featured');
    }

    var msgKey = msgKeys.join('.');
    var msg = Resource.msgf(msgKey, 'changeup', '', args);

    var subMsgKey = subMsgKeys.join('.');
    var subMsg = Resource.msg(subMsgKey, 'changeup', '');

    // if we have a to-date total amount, then display a message for it
    var totalDonationsService = require('*/cartridge/scripts/changeUp/services/totalDonations');
    var totalDonationsToDate = totalDonationsService.getTotalDonationsToDate(config);

    var totalDonationsMsg = '';
    if (totalDonationsToDate) {
        totalDonationsMsg = Resource.msgf('submessage.toDate', 'changeup', '', dw.util.StringUtils.formatNumber(Number(totalDonationsToDate)));
    }

    // if there is only 1 charity, and the customer cannot search for one, then no need for the submsg
    if (config.checkout_display.showDefaultLogo && !config.customer_search_toggle) {
        subMsg = '';
    }

    return {
        msg: msg,
        subMsg: subMsg,
        toDateMsg: totalDonationsMsg
    };
}

module.exports = {
    getConfig: function () {
        var CustomObjectMgr = require('dw/object/CustomObjectMgr');

        var configObj = CustomObjectMgr.getCustomObject('ChangeUpConfig', 'config');
        var res = null;

        if (configObj) {
            res = JSON.parse(configObj.custom.config);

            if (res) {
                res.checkout_display = getCheckoutDisplay(res);
                res.checkout_resources = getCheckoutResources(res);
            }
        }

        return res;
    }
};
