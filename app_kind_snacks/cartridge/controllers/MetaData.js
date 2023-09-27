'use strict';

/**
 * MetaData.js
 *
 * A controller containing endpoints for fetching the proper metadata to render
 * on site pages.
 */

var server = require('server');

/**
 * Renders a template containing the social card meta tags for the configured
 * card types on the site.
 */
server.get('SocialCards', function (req, res, next) {
    var SocialCardsModel = require('*/cartridge/models/socialCards');
    var scViewData = new SocialCardsModel(req.querystring);

    res.render('components/meta/socialCards', { socialCardsData: scViewData });
    return next();
});

module.exports = server.exports();
