/* global empty */
'use strict';

/**
 * SearchService.js
 *
 * A SFRA controller for getting predictive search results and returning them
 * to the browser for rendering.
 */

// SFRA module imports
var server = require('server');
var cache = require('*/cartridge/scripts/middleware/cache');

// Extend the base so we can override the endpoint.
server.extend(module.superModule);

/**
 * Gets the predictive search suggestions and renders the suggestions.isml
 * template with the resulting suggestions.
 *
 * @override SearchServices-GetSuggestions
 */
server.replace('GetSuggestions', cache.applyDefaultCache, function (req, res, next) {
    var Site = require('dw/system/Site');
    var SuggestModel = require('dw/suggest/SuggestModel');
    var CategorySuggestions = require('*/cartridge/models/search/suggestions/category');
    var ContentSuggestions = require('*/cartridge/models/search/suggestions/content');
    var ProductSuggestions = require('*/cartridge/models/search/suggestions/product');
    var SearchPhraseSuggestions = require('*/cartridge/models/search/suggestions/searchPhrase');

    // Get Site Pref Value for BYOB category.
    var site = Site.getCurrent();
    var byobCat = site.getCustomPreferenceValue('byobRootCategoryID');

    var categorySuggestions;
    var contentSuggestions;
    var productSuggestions;
    var recentSuggestions;
    var popularSuggestions;
    var brandSuggestions;
    var searchTerms = req.querystring.q;
    var cgid = req.querystring.cgid;
    var isByob = !empty(cgid) && !empty(byobCat) && cgid === byobCat;
    var suggestions;
    // TODO: Move minChars and maxSuggestions to Site Preferences when ready for refactoring
    var minChars = 3;
    // Unfortunately, by default, max suggestions is set to 10 and is not configurable in Business
    // Manager.
    var maxSuggestions = 3;

    if (searchTerms && searchTerms.length >= minChars) {
        suggestions = new SuggestModel();
        suggestions.setSearchPhrase(searchTerms);
        suggestions.setMaxSuggestions(maxSuggestions);

        if (isByob) {
            suggestions.setCategoryID(byobCat);
        }

        categorySuggestions = new CategorySuggestions(suggestions, maxSuggestions);
        contentSuggestions = new ContentSuggestions(suggestions, maxSuggestions);
        productSuggestions = new ProductSuggestions(suggestions, maxSuggestions);
        recentSuggestions = new SearchPhraseSuggestions(suggestions.recentSearchPhrases, maxSuggestions);
        popularSuggestions = new SearchPhraseSuggestions(suggestions.popularSearchPhrases, maxSuggestions);
        brandSuggestions = new SearchPhraseSuggestions(suggestions.brandSuggestions, maxSuggestions);

        if (productSuggestions.available || contentSuggestions.available
            || categorySuggestions.available
            || recentSuggestions.available
            || popularSuggestions.available
            || brandSuggestions.available) {
            res.render('search/suggestions', {
                suggestions: {
                    product: productSuggestions,
                    category: categorySuggestions,
                    content: contentSuggestions,
                    recent: recentSuggestions,
                    popular: popularSuggestions,
                    brand: brandSuggestions
                },
                isByob: isByob
            });
        } else {
            res.json({});
        }
    } else {
        // Return an empty object that can be checked on the client.  By default, rendered
        // templates automatically get a diagnostic string injected into it, making it difficult
        // to check for a null or empty response on the client.
        res.json({});
    }

    next();
});

module.exports = server.exports();
