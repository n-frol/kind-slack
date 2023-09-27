'use strict';

var Cart = module.superModule;
var server = require('server');

server.extend(Cart);

server.append(
    'Show',
    server.middleware.https,
    function (req, res, next) {
        var paymentOperatorData = {};

        // paymentoperator errors - from failure redirects
        if (req.session.privacyCache.get('paymentOperatorError')) {
            paymentOperatorData.error = req.session.privacyCache.get('paymentOperatorError');
            req.session.privacyCache.set('paymentOperatorError', false);
        }

        // remove paypalexpress & masterpass quickcheckout session data
        req.session.privacyCache.set('PaypalExpressData', false);
        req.session.privacyCache.set('MasterPassQuickCheckoutData', false);

        res.setViewData({ paymentOperator: paymentOperatorData });

        return next();
    }
);

/**
 * Clear paypal express & masterpass quickcheckout data
 */
server.append(
    'MiniCartShow',
    function (req, res, next) {
        // remove paypalexpress & masterpass quickcheckout session data
        req.session.privacyCache.set('PaypalExpressData', false);
        req.session.privacyCache.set('MasterPassQuickCheckoutData', false);
        next();
    }
);

module.exports = server.exports();
