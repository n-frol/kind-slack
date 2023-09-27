'use strict';

/**
 * Returns partial containing Google Tag Manager script initialization
 *
 * @module controllers/GoogleTagManager
 */



// SFRA Includes
var server = require('server');

var Site = require('dw/system/Site');

server.get('Tracking', function (req, res, next) {
    res.render('google/components/tracking', {
        GoogleTagManagerEnabled: Site.current.getCustomPreferenceValue('googleTagManagerEnabled'),
        GoogleTagManagerContainerID: Site.current.getCustomPreferenceValue('googleTagManagerContainerID')
    });
    next();
});

module.exports = server.exports();
