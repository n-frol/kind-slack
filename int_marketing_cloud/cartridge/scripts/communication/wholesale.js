'use strict';

const sendTrigger = require('./util/send').sendTrigger;
const hookPath = 'app.communication.wholesale.';

function approved(promise, data) {
    var a = data;
    return sendTrigger(hookPath + 'approved', promise, data);
}
function denied(promise, data) {
    var q = data;
    return sendTrigger(hookPath + 'denied', promise, data);
}
function submitted(promise, data) {
    var q = data;
    return sendTrigger(hookPath + 'submitted', promise, data);
}

function triggerDefinitions() {
    return {
        denied: {
            description: 'See API doc for dw.om.shipments.ShipmentDetail to determine available fields for mapping.\n' +
            'https://documentation.demandware.com/API1/index.jsp',
            attributes: [
            ]
        }
    };
}

module.exports = require('dw/system/HookMgr').callHook(
    'app.communication.handler.initialize',
    'initialize',
    require('./handler').handlerID,
    'app.communication.wholesale',
    {
        approved: approved,
        denied: denied,
        submitted: submitted
    }
);
module.exports.triggerDefinitions = triggerDefinitions;