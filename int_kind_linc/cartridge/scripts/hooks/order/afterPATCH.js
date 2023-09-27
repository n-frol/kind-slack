/* global empty */
'use strict';

/**
 * afterPATCH.js
 *
 * Runs after an OCAPI PATCH request has been made.
 */

// SFCC system class imports.

var HookMgr = require('dw/system/HookMgr');

function afterPATCH(order, orderInput) {
    try {
        if (!empty(order)) {
            if (!empty(orderInput)) {
                const requestDocument = JSON.parse(orderInput);
                if (!empty(requestDocument.order)) {
                    const isConfirmShipment = Object.hasOwnProperty.call(requestDocument.order, 'c_confirmedShipments_s');
                    if (isConfirmShipment) {
                        if (HookMgr.hasHook('app.kind.linc.fulfillment')) {
                            HookMgr.callHook('app.kind.linc.fulfillment', 'fulfillment', order);
                        }
                    }
                    if (orderInput.status) {
                        if (orderInput.status === 'cancelled') {
                            if (HookMgr.hasHook('app.kind.linc.cancel.order')) {
                                HookMgr.callHook('app.kind.linc.cancel.order', 'cancelOrder', order);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        return;
    }
}

module.exports = {
    afterPATCH: afterPATCH
};
