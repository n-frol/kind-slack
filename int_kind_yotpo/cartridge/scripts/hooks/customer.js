
'use strict';
var YotpoLoyalty = require('*/cartridge/scripts/service/yotpoLoyaltyService');

function CreateUpdate(arg) {
    let response = YotpoLoyalty.createUpdateCustomer(arg);
    return response;
}

module.exports = {
    CreateUpdate: CreateUpdate
};
