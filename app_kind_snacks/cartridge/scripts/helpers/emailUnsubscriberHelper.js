'use strict';

function subscribeProfilesToList(listOrSegmentID) {
    var KlaviyoApiService = require('*/cartridge/scripts/utils/klavioService');
    var emailList = KlaviyoApiService.subscribeProfilesToList(listOrSegmentID);
    return emailList;
}

function deleteKlavioSubscribe(listId, email) {
    var KlaviyoApiService = require('*/cartridge/scripts/utils/klavioService');
    var response = KlaviyoApiService.deleteSubscribe(listId, email);
    return response;
}

function yotpoListOfUnsubscribers() {
    var YotpoService = require('*/cartridge/scripts/service/yotpoUGCApiService');
    var response = YotpoService.retrieveListOfUnsubscribers();
    return response;
}

function yotpoRemoveEmailFromList(email) {
    var YotpoService = require('*/cartridge/scripts/service/yotpoUGCApiService');
    var response = YotpoService.removeSetOfEmails(email);
    return response;
}

module.exports = {
    subscribeProfilesToList: subscribeProfilesToList,
    yotpoListOfUnsubscribers: yotpoListOfUnsubscribers,
    deleteKlavioSubscribe: deleteKlavioSubscribe,
    yotpoRemoveEmailFromList: yotpoRemoveEmailFromList
};
