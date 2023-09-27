'use strict';

function addBasketUpliftAttributes(basket, changeup) {
  var Transaction = require('dw/system/Transaction');
  
  Transaction.wrap(function () {
    basket.custom.changeupDonationAmountMerchantSalesUplift = '0';
    basket.custom.changeupDonationSalesUpliftOrgUUID = changeup['causeId'] ? changeup['causeId'] : '';
  
    if(changeup.config && changeup.config.donation_type_checkout && changeup.config.donation_type_salesUplift) {
        basket.custom.changeupDonationAmountMerchantSalesUplift = changeup.amountSalesUplift ? changeup.amountSalesUplift : '0';
    }
    else {
        basket.custom.changeupDonationSalesUpliftOrgUUID = '';
    }
  });
}

function addBasketDonationAttributes(basket, changeup, supersize_amount_formated) {
  var prefs = require('dw/system/Site').current.preferences.custom;
  
  basket.custom.changeupDonationOrgUUID = changeup['causeId'];
  
  if (changeup.config && changeup.config.donation_type_checkout && changeup.config.donation_type_checkout) {
      if (!prefs.widgetChangeUpEnable){
          switch (changeup.config.donation_type_actor) {
              case 'customer':
                  if(supersize_amount_formated != ''){
                      basket.custom.changeupDonationAmountCustomer = changeup.amount;
                      basket.custom.changeupSupersizeAmountCustomer = supersize_amount_formated;
                      basket.custom.changeupAgreedToDonate = true;
                      basket.custom.changeupDonationAmountMerchant = '0';
                  } else if(basket.custom.changeupAgreedToDonate){
                      basket.custom.changeupDonationAmountCustomer = changeup.amount;
                      basket.custom.changeupSupersizeAmountCustomer = '0'
                      basket.custom.changeupDonationAmountMerchant = '0';
                  } else{
                      basket.custom.changeupDonationAmountCustomer = '';
                      basket.custom.changeupDonationAmountMerchant = '';
                  }
                  
                  break;
              case 'merchant':
                  if(supersize_amount_formated != ''){
                      basket.custom.changeupDonationAmountCustomer = '0'
                      basket.custom.changeupSupersizeAmountCustomer = supersize_amount_formated;
                  } else{
                      basket.custom.changeupDonationAmountCustomer = '0';
                      basket.custom.changeupSupersizeAmountCustomer = '0';
  
                  }
                  basket.custom.changeupDonationAmountMerchant = changeup.amount;
                  basket.custom.changeupAgreedToDonate = true;
                  break;
              case 'match':
                  if(supersize_amount_formated != ''){
                      basket.custom.changeupDonationAmountCustomer = changeup.amount;
                      basket.custom.changeupSupersizeAmountCustomer = supersize_amount_formated;
                      basket.custom.changeupAgreedToDonate = true;
                      basket.custom.changeupDonationAmountMerchant = changeup.amount;
                  } else if (basket.custom.changeupAgreedToDonate) {
                      basket.custom.changeupDonationAmountCustomer = changeup.amount;
                      basket.custom.changeupDonationAmountMerchant = changeup.amount;
                      basket.custom.changeupSupersizeAmountCustomer = '0';
                  }else{
                      basket.custom.changeupDonationAmountCustomer = '';
                      basket.custom.changeupDonationAmountMerchant = '';
                  }
                  break;
              default:
                  break;
          }
      }
      // If the widget is enabled, then we send the data as it is
      else { 
          basket.custom.changeupDonationAmountCustomer = changeup.amount;
          basket.custom.changeupSupersizeAmountCustomer = supersize_amount_formated;
          basket.custom.changeupAgreedToDonate = true;
          basket.custom.changeupDonationAmountMerchant = changeup.amount;
      }
  }
  else {
      basket.custom.changeupDonationAmountMerchant = '0';
      basket.custom.changeupDonationAmountCustomer = '0';
      basket.custom.changeupAgreedToDonate = false;
  }
}

module.exports = {
  addBasketUpliftAttributes : addBasketUpliftAttributes,
  addBasketDonationAttributes: addBasketDonationAttributes
}