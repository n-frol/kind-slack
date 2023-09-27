'use strict';

var config = require('~/cartridge/models/config').getConfig();

/**
 * Calculates the donation based on rules from BM.
 * @param {Object} lineItemCtnr Basket
 * @returns {Object} Donation amount.
 */
function calculateDonation(lineItemCtnr) {
    var Money = require('dw/value/Money');
    var total = null;
    var amount = new Money(0, session.currency);
    if (config) {
        var donationPLI = lineItemCtnr.getProductLineItems('changeup-donation');
        if (config.donation_type_checkout) {
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
                    total = lineItemCtnr.totalGrossPrice.value;
                    if (!total) {
                        total = lineItemCtnr.adjustedMerchandizeTotalPrice.value;
                    }
                    amount = new Money((Math.ceil(total) - total).toFixed(2), session.currency);
                    break;
                
                default:
                    break;
            }
        }
    }

    return amount;
}

function calculateDonationSalesUplift(lineItemCtnr) {
    var Money = require('dw/value/Money');
    var total = 0;
    var amount = new Money(0, session.currency);
    var products = lineItemCtnr.getAllProductLineItems();
    var donation = null;
    if (config) {
    switch (config.donation_type_option_salesUplift) {
        case 'all':
            for (let i = 0; i < products.getLength();i++) {
                donation = products[i].productID;
                if (donation != 'changeup-donation') {
                    total += products[i].adjustedNetPrice.value;
                }
                
            }
            amount = new Money(parseFloat(parseFloat((config.salesuplift_donation / 100)) * parseFloat(total) ), session.currency);
            break;
            
        case 'category': 
                let warranty_category = false;         
                for (let i = 0; i < products.getLength(); i++) {

                    if (products[i].bundledProductLineItems.getLength()) {
                            var category = products[i].getProduct().getAllCategories();
                            for (let j = 0; j < category.getLength(); j++) {
                                if (category[j].custom.salesUpliftDonation) {
                                    total += products[i].adjustedNetPrice.value;
                                }
                            }
                        
                    } else if (products[i].optionProductLineItems.getLength()) {
                            var category = products[i].getProduct().getAllCategories();
                            for (let j = 0; j < category.getLength(); j++) { 
                                if (category[j].custom.salesUpliftDonation) {
                                    total += products[i].adjustedNetPrice.value;
                                    warranty_category = true;
                                }else {
                                    warranty_category = false;
                                }

                            }
                        
                        
                    } else if(products[i].getProduct()){
                        var ProductMgr = require('dw/catalog/ProductMgr');
                        var CatalogMgr = require('dw/catalog/CatalogMgr');

                        var ProductId = products[i].getProduct().variant ?  products[i].getProduct().masterProduct.ID : products[i].getProduct().ID
                        var mainProduct = ProductMgr.getProduct(ProductId);
                        var categoryId = CatalogMgr.getCategory(mainProduct.primaryCategory.ID);
                            
                            if (categoryId.custom.salesUpliftDonation) {
                                total += products[i].adjustedNetPrice.value; 
                            }

                    } else if(warranty_category){
                        total += products[i].adjustedNetPrice.value;
                        warranty_category = false;
                    }
                }
                let donationTotal = parseFloat(parseFloat((config.salesuplift_donation / 100)) * parseFloat(total));
                let fixedDonation = parseFloat(donationTotal.toString().match(/^-?\d+(?:\.\d{0,2})?/)[0])
                amount = new Money(fixedDonation, session.currency);
                break;    
            break;
                break;    
        default:
            break;
    }
    }
    return amount;
}

function donationCalculate (lineItemCtnr, selectShippingMethod, calculated) {
    var Transaction = require('dw/system/Transaction');
    var HookMgr = require('dw/system/HookMgr');
    var amount = null;
    var Money = require('dw/value/Money');

    if(!calculated){
        amount = calculateDonation(lineItemCtnr);
    }
    else{
        amount = new Money(parseFloat(lineItemCtnr.custom.changeupDonationAmountCustomer.match(/\d+.\d{2}|0/)[0]), session.currency);
    }
    if(config) {
    var merchantDonate = config.donation_type_actor === 'merchant';
    }

    if (!merchantDonate && lineItemCtnr.custom.changeupAgreedToDonate) {

            Transaction.wrap(function () {
            if(config.donation_type_option == 'roundup' && selectShippingMethod){
                var Money = require('dw/value/Money');
                var total = lineItemCtnr.totalGrossPrice.value - pli.adjustedGrossPrice.valueOrNull;
                var newDonationPLIPrice = new Money((Math.ceil(total) - total).toFixed(2), session.currency);
                amount = newDonationPLIPrice;
            }
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

module.exports = {
    calculateDonationSalesUplift: calculateDonationSalesUplift,
    donationCalculate: donationCalculate
}