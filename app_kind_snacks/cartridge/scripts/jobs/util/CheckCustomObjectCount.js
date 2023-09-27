/* global empty */
'use strict';

/**
 * CheckCustomObjectCount.js
 *
 * Return Error, if condition matches. This utility can use to monitor custom object count.
 * path : app_kind_snacks/cartridge/scripts/jobs/util/CheckCustomObjectCount.js
 */

// SFCC system class imports.
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Status = require('dw/system/Status');

// eslint-disable-next-line consistent-return
function execute(parameter) {
    var isCustomObjectNameExist = Object.hasOwnProperty.call(parameter, 'customObjectName');
    var iscustomObjectCountExist = Object.hasOwnProperty.call(parameter, 'customObjectCount');
    if (!isCustomObjectNameExist ||
        !iscustomObjectCountExist ||
        empty(parameter.customObjectName) || empty(parameter.customObjectCount)) {
        return new Status(Status.OK);
    }
    try {
        var customObject = CustomObjectMgr.getAllCustomObjects(parameter.customObjectName);
        if (customObject.getCount() >= Number(parameter.customObjectCount)) {
            return new Status(Status.ERROR);
        }
        return new Status(Status.OK);
    } catch (e) {
        return new Status(Status.OK);
    }
}
/** Exported functions **/
module.exports = {
    execute: execute
};
