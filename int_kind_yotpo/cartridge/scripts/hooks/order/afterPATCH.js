/* global empty */
'use strict';

/**
 * afterPATCH.js
 *
 * Runs after an OCAPI PATCH request has been made.
 */

// SFCC system class imports.

var HookMgr = require('dw/system/HookMgr');

function getPropertyType(documnet, property) {
    /*eslint-disable */
    const isInteger = Object.hasOwnProperty.call(documnet.order, property+'_i');
    const isNumber = Object.hasOwnProperty.call(documnet.order, property+'_n');
    return isInteger ? property+'_i' : isNumber ? property+'_n' : property;
    /* eslint-enable */
}

function getPropertyValue(document, property) {
    const propertyName = getPropertyType(document, property);
    switch (propertyName) {
        case 'c_refundAmount_i':
            return document.order.c_refundAmount_i;
        case 'c_refundAmount_n':
            return document.order.c_refundAmount_n;
        case 'c_settlementAmount_i':
            return document.order.c_settlementAmount_i;
        case 'c_settlementAmount_n':
            return document.order.c_settlementAmount_n;

        default:
            return 0;
    }
}

function afterPATCH(order, orderInput) {
    try {
        if (!empty(order)) {
            if (!empty(orderInput)) {
                const requestDocument = JSON.parse(orderInput);
                if (!empty(requestDocument.order)) {
                    const isRefund = Object.hasOwnProperty.call(requestDocument.order, getPropertyType(requestDocument, 'c_refundAmount'));
                    const isSettlement = Object.hasOwnProperty.call(requestDocument.order, getPropertyType(requestDocument, 'c_settlementAmount'));
                    const currencyCode = order.currencyCode;
                    /*eslint-disable */
                    if (isSettlement) {
                        const settlementAmount = new dw.value.Money(getPropertyValue(requestDocument, 'c_settlementAmount'), currencyCode);
                        if (HookMgr.hasHook('app.kind.yotpo.loyalty.order')) {
                            HookMgr.callHook(
                                'app.kind.yotpo.loyalty.order',
                                'processOrder',
                                order,
                                settlementAmount);
                        }
                    }

                    if (isRefund) {
                        const refundAmount = new dw.value.Money(getPropertyValue(requestDocument, 'c_refundAmount'), currencyCode);
                        if (HookMgr.hasHook('app.kind.yotpo.loyalty.order')) {
                            HookMgr.callHook(
                                'app.kind.yotpo.loyalty.order',
                                'processRefund',
                                order.orderNo,
                                refundAmount);
                        }
                    }
                    /* eslint-enable */
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
