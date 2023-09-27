'use strict';

/* API Includes */
var Site = require('dw/system/Site');

var server = require('server');

/**
 * Renders the Dashboard Campaign
 */
server.get(
    'Dashboard',
    server.middleware.https,
    function (req, res, next) {
        if (Site.current.getCustomPreferenceValue('talkableDashboard')) {
            res.render('talkable/dashboard');
        } else {
            res.render('error/notfound');
        }

        return next();
    }
);

/**
 * Renders the Standalone Campaign
 */
server.get(
    'Standalone',
    server.middleware.https,
    function (req, res, next) {
        if (Site.current.getCustomPreferenceValue('talkableStandalone')) {
            res.render('talkable/standalone');
        } else {
            res.render('error/notfound');
        }

        return next();
    }
);

/**
 * Renders HEAD Template
 */
server.get(
    'Head',
    server.middleware.https,
    function (req, res, next) {
        res.render('talkable/head');

        return next();
    }
);

module.exports = server.exports();
