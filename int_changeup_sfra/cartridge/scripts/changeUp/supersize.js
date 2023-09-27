'use strict';

module.exports = function (changeup, basket, agreed) {
    var Transaction = require('dw/system/Transaction');
    var HookMgr = require('dw/system/HookMgr');
    var supersize = false;
    Transaction.wrap(function () {
        if(typeof changeup.supersize == 'number'){
            supersize = true;
            var supersize_val = (changeup.supersize >= 0  && changeup.supersize != undefined && changeup.supersize != null) ? changeup.supersize : undefined;

            var newAmount = null;
            if((changeup.agreedToDonate || agreed) && changeup.config.donation_type_actor != 'merchant'){
                
                newAmount = parseFloat(changeup.amount_donation) + parseFloat(supersize_val);
            } else {
                newAmount = parseFloat(supersize_val);
            }
        } 
    });
    return supersize;
};



