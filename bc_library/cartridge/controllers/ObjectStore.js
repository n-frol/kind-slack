'use strict';

/**
 * @module controllers/ObjectStore
 */

/* Script Modules */

var boguard = require('~/cartridge/scripts/boguard');

/* API Includes */
var Transaction = require('dw/system/Transaction');
var Site = require('dw/system/Site');

function readObjects() {

    var Response = require('~/cartridge/scripts/util/Response');
    var params = request.httpParameterMap;
    var headers = request.httpHeaders;

    request.locale = (empty(Site.getCurrent().defaultLocale) ? "default" : Site.getCurrent().defaultLocale);
    var objectHelper = getObjectHelperObj(headers);

    var responseObj = objectHelper.getResultList(params);

    Response.renderJSON(responseObj);

}

function saveObject() {

    var Response = require('~/cartridge/scripts/util/Response');
    var params = request.httpParameterMap;
    var headers = request.httpHeaders;

    var objectHelper = getObjectHelperObj(headers);

    var responseObj = Transaction.wrap(function() {
        return objectHelper.saveObject(params.requestBodyAsString);
    });

    Response.renderJSON(
      {success : responseObj}
    );

}

function createObject() {

    var Response = require('~/cartridge/scripts/util/Response');
    var params = request.httpParameterMap;
    var headers = request.httpHeaders;

    var objectHelper = getObjectHelperObj(headers);

    var responseObj = Transaction.wrap(function() {
        return objectHelper.createObject(params.requestBodyAsString);
    });

    Response.renderJSON(
      {success : responseObj}
    );

}

function deleteObject() {

    var Response = require('~/cartridge/scripts/util/Response');
    var params = request.httpParameterMap;
    var headers = request.httpHeaders;

    var objectHelper = getObjectHelperObj(headers);

    var responseObj = Transaction.wrap(function() {
        return objectHelper.deleteObject(params.requestBodyAsString);
    });

    Response.renderJSON(
      {success : responseObj}
    );

}

function getDefinition() {

    var Response = require('~/cartridge/scripts/util/Response');
    var params = request.httpParameterMap;
    var headers = request.httpHeaders;

    var objectHelper = getObjectHelperObj(headers);

    Response.renderJSON(
      {customObjectDefinition: objectHelper.getObjectDefinition()}
    );

}
/**
 * get the object helper object
 *
 * @private
 *
 * @param  {Object} requestHeaders
 * @return {Object} ObjectHelper
 */
function getObjectHelperObj(requestHeaders) {

    var isSystem = ("true" === requestHeaders.system);

    var config = null;

    if (requestHeaders.config != "undefined") {
        config = JSON.parse(requestHeaders.config);
    }
    var ObjectHelper;

    if (!empty(config) && config.helperClassPath) {
        ObjectHelper = require(config.helperClassPath).ObjectHelper;
    } else {
        ObjectHelper = require("bc_library/cartridge/scripts/customobject/ObjectHelper").ObjectHelper;
    }

    var objectHelper = new ObjectHelper(requestHeaders.type, isSystem, config);

    return objectHelper;
}

/**
 * @see module:controllers/ObjectStore~ReadObjects */
exports.ReadObjects = boguard.ensure(['https'], readObjects);
/**
 * @see module:controllers/ObjectStore~SaveObject */
exports.SaveObject = boguard.ensure(['https'], saveObject);
/**
 * @see module:controllers/ObjectStore~CreateObject */
exports.CreateObject = boguard.ensure(['https'], createObject);
/**
 * @see module:controllers/ObjectStore~DeleteObject */
exports.DeleteObject = boguard.ensure(['https'], deleteObject);
/**
 * @see module:controllers/ObjectStore~GetDefinition */
exports.GetDefinition = boguard.ensure(['https'], getDefinition);
