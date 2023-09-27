'use strict'

function changeupUpdateLineItem(basket, newAmount){
  let pli = createOrNewProductLineItem(basket);
  pli.setQuantityValue(1);
  pli.setGrossPrice(newAmount);
  pli.setPriceValue(parseFloat(newAmount.valueOrNull));
}

function existOrDeleteLineItem(basket){
  var donationPLI = basket.getProductLineItems('changeup-donation');
  if (donationPLI && donationPLI.length) {
      basket.removeProductLineItem(donationPLI[0]);
  }
}

function createOrNewProductLineItem(basket) {
  var pli = null;
  pli = basket.getProductLineItems('changeup-donation');
  if (!pli || !pli.length) {
      pli = basket.createProductLineItem('changeup-donation', basket.defaultShipment);
  } else {
      pli = pli[0];
  }
  return pli;
}

module.exports = {
  changeupUpdateLineItem : changeupUpdateLineItem,
  existOrDeleteLineItem : existOrDeleteLineItem
}