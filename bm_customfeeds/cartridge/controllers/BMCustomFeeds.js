'use strict';

/**
 * @module controllers/BMCustomFeeds
 */

var boguard = require('bc_library/cartridge/scripts/boguard');
var ISML = require('dw/template/ISML');

function start() {
    ISML.renderTemplate('feeds/configurefeeds.isml');
}

function preview() {
    var feedPreview = require('~/cartridge/scripts/customobject/FeedPreviews');
    ISML.renderTemplate('data/preview.isml', {Preview : feedPreview.GeneratePreview()});
}

function getAllSites() {
    var Site = require('dw/system/Site');
    var Response = require('bc_library/cartridge/scripts/util/Response');
    
    var allSites = Site.getAllSites();
    
    var sites = [];
    for each(var availableSite in allSites) {
        var site = {};
        site['id'] = availableSite.ID;
        site['name'] = availableSite.name;
        sites.push(site);
    }
    
    Response.renderJSON(sites);
}

exports.Start = boguard.ensure(['get'], start);

exports.Preview = boguard.ensure(['post'], preview);

exports.GetAllSites = boguard.ensure(['get'], getAllSites);