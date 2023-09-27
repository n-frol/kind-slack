'use strict';

var URLUtils = require('dw/web/URLUtils');
var ACTION_ENDPOINT = 'Product-Show';

function ProductSearch(sku, value) {
  var ProductSearchModel = require('dw/catalog/ProductSearchModel');
  var searchModel = new ProductSearchModel();
  var Transaction = require('dw/system/Transaction');
  var result = ''
  var categories = []
  
  searchModel.setCategoryID(sku);
  searchModel.search();
  let change = searchModel.category;
  

  Transaction.wrap(function () {
    value == 'true' ? change.custom.salesUpliftDonation = true : change.custom.salesUpliftDonation = false;
  });
  return change.custom.salesUpliftDonation;
}

module.exports = ProductSearch;