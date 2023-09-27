'use strict';

/**
 * @module util/browsing
 */

/**
 * Recovers the last url from the click stream
 * @return {dw.web.URL} the last called URL
 */
exports.lastUrl = function lastUrl() {
    var location = dw.web.URLUtils.url('Home-Show');
    var click = session.clickStream.last;
    if (click) {
        location = dw.web.URLUtils.url(click.pipelineName);
        if (!empty(click.queryString) && click.queryString.indexOf('=') !== -1) {
            var params = click.queryString.split('&');
            params.forEach(function (param) {
                location.append.apply(location, param.split('='));
            });
        }
    }
    return location;
};

/**
 * Returns the last catalog URL or homepage URL if non found
 * @return {string} The last browsed catalog URL
 */
exports.lastCatalogURL = function lastCatalogURL() {
    var clicks = session.getClickStream().getClicks();

    for (var i = clicks.size() - 1; i >= 0; i--) {
        var click = clicks[i];
        switch (click.getPipelineName()) {
            case 'Product-Show':
            case 'Search-Show':
                // catalog related click
                // replace well-known http parameter names 'source' and 'format' to avoid loading partial page markup only
                return 'http://' + click.host + click.url.replace(/source=/g, 'src=').replace(/format=/g, 'frmt=');
            default:
                break;
        }
    }

    return dw.web.URLUtils.httpHome().toString();
};
