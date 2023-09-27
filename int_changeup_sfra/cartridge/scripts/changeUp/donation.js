'use strict';

var config = require('~/cartridge/models/config').getConfig();

/**
 * Calculates the donation based on rules from BM.
 * @param {Object} lineItemCtnr Basket
 * @returns {Object} Donation amount.
 */
function calculateDonation(lineItemCtnr, selectShippingMethod) {
    var Money = require('dw/value/Money');

    var total = null;
    var amount = new Money(0, session.currency);

    if (config) {
        var donationPLI = lineItemCtnr.getProductLineItems('changeup-donation');
        switch (config.donation_type_option) {
            case 'fixed':
                amount = new Money(parseFloat(config.donation_type_amount), session.currency);
                break;
            case 'percentage':
                total = lineItemCtnr.adjustedMerchandizeTotalPrice.value;
                if (donationPLI && donationPLI.length) {
                    total -= donationPLI[0].adjustedGrossPrice.value;
                }
                amount = new Money((parseInt(config.donation_type_amount) / 100) * total, session.currency);
                break;
            case 'roundup':
                if (donationPLI && donationPLI.length && !selectShippingMethod) {
                    if(session.custom.supersize_value){
                        amount =new Money(parseFloat(session.custom.donation_amount), session.currency);
                    } else {
                        amount = donationPLI[0].adjustedGrossPrice;
                    }
                } else {
                    total = lineItemCtnr.totalGrossPrice.value;
                    if (!total) {
                        total = lineItemCtnr.adjustedMerchandizeTotalPrice.value;
                    }
                    amount = new Money((Math.ceil(total) - total).toFixed(2), session.currency);
                    session.custom.donation_amount = (Math.ceil(total) - total).toFixed(2);
                }
                break;
            default:
                break;
        }
    }

    return amount;
}

module.exports = function (lineItemCtnr, selectShippingMethod) {
    var Transaction = require('dw/system/Transaction');
    var HookMgr = require('dw/system/HookMgr');

    var amount = calculateDonation(lineItemCtnr, selectShippingMethod);
    var merchantDonate = config.donation_type_actor === 'merchant';

    if (!merchantDonate && lineItemCtnr.custom.changeupAgreedToDonate) {
        Transaction.wrap(function () {
            var pli = null;

            pli = lineItemCtnr.getProductLineItems('changeup-donation');

            if (!pli || !pli.length) {
                pli = lineItemCtnr.createProductLineItem('changeup-donation', lineItemCtnr.defaultShipment);
            } else {
                // original code has bug , if the line item quantity or basket quantity changes
                // calculation was using always pre-calculated value instead of update it.
                // Fix is to remove change up item from basket. Re-calculated gross price and after
                // add change up item with recent price.
                lineItemCtnr.removeProductLineItem(pli[0]);
                HookMgr.callHook('dw.order.calculate', 'calculate', lineItemCtnr);
                amount = calculateDonation(lineItemCtnr, selectShippingMethod);
                pli = pli = lineItemCtnr.createProductLineItem('changeup-donation', lineItemCtnr.defaultShipment);
            }

            pli.setPriceValue(parseFloat(amount));
            pli.setQuantityValue(1);
            pli.custom.excludeFromShipping = true;
            if(config.donation_type_option == 'roundup' && selectShippingMethod){
                var Money = require('dw/value/Money');
                var total = lineItemCtnr.totalGrossPrice.value - pli.adjustedGrossPrice.valueOrNull;
                var newDonationPLIPrice = new Money((Math.ceil(total) - total).toFixed(2), session.currency);
                pli.setPriceValue(parseFloat(newDonationPLIPrice.valueOrNull));
                pli.setGrossPrice(newDonationPLIPrice);
                amount = newDonationPLIPrice;
                session.custom.donation_amount = amount;

            }
            HookMgr.callHook('dw.order.calculate', 'calculate', lineItemCtnr);
        });
    }

    return {
        config: config,
        agreedToDonate: merchantDonate || lineItemCtnr.custom.changeupAgreedToDonate,
        amount: amount.toFormattedString(),
        amount_donation: amount.valueOrNull,
        percentOfTotal: ((amount.value / lineItemCtnr.totalGrossPrice.value).toPrecision(2) * 100) + '%'
    };
};
