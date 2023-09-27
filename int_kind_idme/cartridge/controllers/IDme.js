/* global empty, session */

'use strict';

// SFCC API includes
var URLUtils = require('dw/web/URLUtils');

// SFRA Modules
var server = require('server');

// Idme service Includes.
var IdmeService = require(
    '~/cartridge/scripts/service/idmeService');
var IdmeHelper = require(
    '~/cartridge/scripts/idmeHelper');


/**
 *
 * Get  access token
 *
 */
server.get('Response', server.middleware.https, function (req, res, next) {
    return next();
});

/**
 *
 * Get  access token
 *
 */
server.get('Results', server.middleware.https, function (req, res, next) {
    var result = {};
    var code = req.querystring.code;
    if (empty(code)) {
        // Log the error and get an 'unspecified error occured' message to
        // display for the user.
        result = IdmeHelper.getUnexpectedError({
            errMsg: 'ERROR: No code value included in response  from idme service.',
            queryString: req.querystring
        });
    }

    var state = req.querystring.state;
    var redirectUri = URLUtils.https('IDme-Results').toString();
    var accessTokenResponse = IdmeService.getIdmeAccessToken(redirectUri, code, state);
    var isErrorResponse = Object.hasOwnProperty.call(accessTokenResponse, 'error');
    if (isErrorResponse) {
        result = IdmeHelper.getUnexpectedError(accessTokenResponse);
    } else {
        var userProfile = IdmeService.getIdmeUserProfile(accessTokenResponse.access_token, state);
        isErrorResponse = Object.hasOwnProperty.call(userProfile, 'error');
        if (isErrorResponse) {
            result = IdmeHelper.getUnexpectedError(userProfile);
        } else {
            var verified = false;
            userProfile.status.forEach(function (status) {
                var group = status.group;
                verified = status.verified;
                if (verified === true) {
                    session.custom.idmegroup = group;
                    session.custom.idmegroup_verified = verified;
                    session.custom.idmesubgroup = status.subgroups[0];
                }
                if (verified === true) {
                    userProfile.attributes.forEach(function (attr) {
                        if (attr.handle === 'email') {
                            session.custom.idmemail = attr.value;
                        }
                    });
                }
            });
        }
    }
    res.json(result);
    res.redirect(
    URLUtils.https(state)
    );
    return next();
});


module.exports = server.exports();

