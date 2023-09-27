'use strict';

var base = module.superModule;
var collections = require('*/cartridge/scripts/util/collections');
var formatMoney = require('dw/util/StringUtils').formatMoney;
var Money = require('dw/value/Money');
var donationProductID;
var donation;

function discountDonation(subTotalAmount, donationDiscount) {
  var newAmount = subTotalAmount - donationDiscount;
  return formatMoney(new Money(newAmount, session.currency));
}

/**
 * @constructor
 * @classdesc totals class that represents the order totals of the current line item container
 *
 * @param {dw.order.lineItemContainer} lineItemContainer - The current user's line item container
 */
function totals(lineItemContainer) {
  base.call(this, lineItemContainer);

  if (lineItemContainer) {
    this.subTotalRaw = lineItemContainer.getAdjustedMerchandizeTotalPrice(false);
    collections.forEach(lineItemContainer.productLineItems, function (lineItem) {
      if (lineItem.productID === 'changeup-donation') {
        donationProductID = formatMoney(lineItem.basePrice);
        donation = lineItem.basePrice ? lineItem.basePrice : 0;
      }
    });
    this.donationTotalAmount = donationProductID;
    if (donation) {
      this.subTotal = discountDonation(lineItemContainer.getAdjustedMerchandizeTotalPrice(false), donation);
    }
  } else {
    this.donationTotalAmount = '-';
  }
}

module.exports = totals;
