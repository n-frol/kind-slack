'use strict';
var Site = require('dw/system/Site');

function DataExtension(record) {

    /**
     * @type {dw.svc.Service}
     */
    if (Site.current.ID == "kind_b2b") {
        var ser = "marketingcloud.rest.dataextension.insert";
    } else {
        var ser = "marketingcloud.rest.dataextension.insert.b2c";
    }
    var msgSvc = require('dw/svc/ServiceRegistry').get(ser);
    return msgSvc.call(record);
}

module.exports = DataExtension;
