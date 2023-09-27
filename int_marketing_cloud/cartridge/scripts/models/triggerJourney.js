'use strict';
var Site = require('dw/system/Site');

function TriggerJourney(record) {

    /**
     * @type {dw.svc.Service}
     */
    if (Site.current.ID == "kind_b2b") {
        var ser = "marketingcloud.rest.interaction.events";
    } else {
        var ser = "marketingcloud.rest.interaction.events.b2c";
    }
    var msgSvc = require('dw/svc/ServiceRegistry').get(ser);
    return msgSvc.call(record);
}

module.exports = TriggerJourney;
