/* global empty */
'use strict';
var Status = require('dw/system/Status');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var EmailUnsubscriberHelper = require('~/cartridge/scripts/helpers/emailUnsubscriberHelper');

function createCustomObject(email) {
    var EmailUnsubscribeListObject;
    try {
        // ================  Begin Transaction  ===================== */
        Transaction.begin();
        // Get or the custom OrderTransactionalEmails instance.
        EmailUnsubscribeListObject = CustomObjectMgr.getCustomObject('EmailUnsubscribeList', email);
        // Get the OrderTransactionalEmails custom object instance.
        if (empty(EmailUnsubscribeListObject)) {
            EmailUnsubscribeListObject = CustomObjectMgr.createCustomObject('EmailUnsubscribeList', email);
        }
        EmailUnsubscribeListObject.custom.isKlaviyoProccesed = true;
        EmailUnsubscribeListObject.custom.isYotpoProccesed = true;

        Transaction.commit();
        // ==================  End Transaction  ===================== */
    } catch (e) {
        Transaction.rollback();
    }
}


function unSubscribeFromYatpo(email) {
    var result = EmailUnsubscriberHelper.yotpoRemoveEmailFromList(email);
    if (empty(result) || result.getStatus() === 'ERROR') {
        return false;
    }
    return true;
}

function unSubscribeFromKlavio(listId, email) {
    var result = EmailUnsubscriberHelper.deleteKlavioSubscribe(listId, email);
    if (empty(result) || result.status === 'ERROR') {
        return false;
    }
    return true;
}

function pullYatpoList(parameter) {
    var isListidExist = Object.hasOwnProperty.call(parameter, 'klavio_subscribe_listid');
    if (!isListidExist || empty(parameter.klavio_subscribe_listid)) { return new Status(Status.ERROR, '', 'klavio_subscribe_listid parameter is not exist or empty'); }

    var result = EmailUnsubscriberHelper.yotpoListOfUnsubscribers();
    if (result.getStatus() === 'ERROR') {
        return new Status(Status.ERROR, '', result.getErrorMessage());
    }
    var responseToJSON = JSON.parse(result.object);
    if (!empty(responseToJSON.response) && responseToJSON.response.unsubscribers.length) {
        responseToJSON.response.unsubscribers.forEach(function (record) {
            var email = record.user_email;
            var isUnSubscribedFromKlavio = unSubscribeFromKlavio(parameter.klavio_subscribe_listid, email);
            if (isUnSubscribedFromKlavio) {
                createCustomObject(email);
            }
        });
    }
    return new Status(Status.OK);
}

function pullKlavioList(parameter) {
    var isListidExist = Object.hasOwnProperty.call(parameter, 'klavio_unsubscribe_listid');
    if (!isListidExist || empty(parameter.klavio_unsubscribe_listid)) { return new Status(Status.ERROR, '', 'klavio_unsubscribe_listid parameter is not exist or empty'); }

    var result = EmailUnsubscriberHelper.subscribeProfilesToList(parameter.klavio_unsubscribe_listid);
    if (result.getStatus() === 'ERROR') {
        return new Status(Status.ERROR, '', result.getErrorMessage());
    }
    var responseToJSON = JSON.parse(result.object);
    if (!empty(responseToJSON) && responseToJSON.records.length) {
        responseToJSON.records.forEach(function (record) {
            var email = record.email;
            var isUnSubscribedFromYatpo = unSubscribeFromYatpo(email);
            if (isUnSubscribedFromYatpo) {
                createCustomObject(email);
            }
        });
    }
    return new Status(Status.OK);
}

module.exports = {
    execute: function (parameter) {
        var status = new Status(Status.ERROR);
        status = pullYatpoList(parameter);
        status = pullKlavioList(parameter);
        return status;
    }
};
