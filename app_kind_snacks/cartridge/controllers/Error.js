'use strict';

var server = require('server');
var system = require('dw/system/System');
var Resource = require('dw/web/Resource');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.use('Start', consentTracking.consent, function (req, res, next) {
    var showError = system.getInstanceType() !== system.PRODUCTION_SYSTEM
        && system.getInstanceType !== system.STAGING_SYSTEM;
    if (req.httpHeaders.get('x-requested-with') === 'XMLHttpRequest') {
        res.setStatusCode(500);
        res.json({
            error: req.error || {},
            message: Resource.msg('subheading.error.general', 'error', null)
        });
    } else {
        res.render('error', {
            error: req.error || {},
            showError: showError,
            message: Resource.msg('subheading.error.general', 'error', null)
        });
    }
    next();
});

module.exports = server.exports();
