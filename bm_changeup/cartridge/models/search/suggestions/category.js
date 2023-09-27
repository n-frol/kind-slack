'use strict';

var URLUtils = require('dw/web/URLUtils');
var endpoint = 'Search-Show';
var allCategories = [];

/**
 * @constructor
 * @classdesc CategorySuggestions class
 *
 * @param {dw.suggest.SuggestModel} suggestions - Suggest Model
 * @param {number} maxItems - Maximum number of categories to retrieve
 */
function CategorySuggestions() {
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');
    var searchModel = new ProductSearchModel();
    var result = []
    var categories = []
    
    searchModel.setSearchPhrase(' ');
    searchModel.search();
    searchModel.deepestCommonCategory.onlineSubCategories;


    for (var i = 0; i < searchModel.deepestCommonCategory.onlineSubCategories.getLength(); i++) {

          let category = searchModel.deepestCommonCategory.onlineSubCategories[i];
          let o = 0;
          let res = getAllCategories(category);
          res.forEach(function(element){
            categories.push({
                name: element.name,
                sku: element.sku,
                donation: element.donation,
                products: element.products,
                imageUrl: element.image ? element.image.url : ''
            });
          });
    }
    return categories;
}

function getAllCategories(category){
    let res = [];
    let sub = category.onlineSubCategories.length;
    if (sub > 0){
        for (let index = 0; index < sub; index++) {
            let newCategories = getAllCategories(category.onlineSubCategories[index]);
            newCategories.forEach(function(element){
                res.push({
                    name: element.name,
                    donation: element.donation,
                    sku: element.sku,
                    products: element.products,
                    imageUrl: element.image ? element.image.url : ''
                });
              });
        }
    } else {
        res.push({
            name: category.displayName,
            donation: category.custom.salesUpliftDonation,
            sku: category.ID,
            products: category.getProducts().getLength(),
            imageUrl: category.image ? category.image.url : ''
        })
    }
        

    return res;
}

module.exports = CategorySuggestions;
