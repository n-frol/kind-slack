'use strict';
const assign = require('server/assign');
const URLUtils = require('dw/web/URLUtils');

/**
 * Middleware validating if user logged in
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next call in the middleware chain
 * @returns {void}
 */
function validateLoggedIn(req, res, next) {
    if (!req.currentCustomer.profile) {
        if (req.querystring.args) {
            req.session.privacyCache.set('args', req.querystring.args);
        }

        const target = req.querystring.rurl || 1;

        if (!empty(req.querystring.gtmLoginSection)) {
            res.redirect(URLUtils.url('Login-Show', 'rurl', target, 'gtmLoginSection', req.querystring.gtmLoginSection));
        } else {
            res.redirect(URLUtils.url('Login-Show', 'rurl'));
        }
    }
    next();
}

module.exports = assign(module.superModule, {
    validateLoggedIn: validateLoggedIn,
});
