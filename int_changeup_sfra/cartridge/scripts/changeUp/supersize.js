'use strict';

module.exports = function (changeup, basket, agreed) {
    var Transaction = require('dw/system/Transaction');
    var HookMgr = require('dw/system/HookMgr');

    var supersize = false;
    Transaction.wrap(function () {
        if(changeup.supersize || session.custom.supersize_value){
            var sup = changeup.supersize;
            var actor = changeup.config.donation_type_actor;
            supersize = true;
            var supersize_val = (changeup.supersize >= 0  && changeup.supersize != undefined && changeup.supersize != null) ? changeup.supersize : session.custom.supersize_value;
            if(parseFloat(supersize_val) > 0){
                var pli = null;
                pli = basket.getProductLineItems('changeup-donation');
                if (!pli || !pli.length) {
                    pli = basket.createProductLineItem('changeup-donation', basket.defaultShipment);
                } else {
                    pli = pli[0];
                }
                var newAmount = null;
                if((changeup.agreedToDonate || agreed) && changeup.config.donation_type_actor != 'merchant'){
                   
                    newAmount = parseFloat(session.custom.donation_amount) + parseFloat(supersize_val);
                } else {
                    newAmount = parseFloat(supersize_val);
                }
                pli.setPriceValue(parseFloat(newAmount));
            } else {
                var donationPLI = basket.getProductLineItems('changeup-donation');
                    
                if (donationPLI && donationPLI.length) {
                    basket.removeProductLineItem(donationPLI[0]);
                }
            }
            HookMgr.callHook('dw.order.calculate', 'calculate', basket);
        } 
    });
    return supersize;
};