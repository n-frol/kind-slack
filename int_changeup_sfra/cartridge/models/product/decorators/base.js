'use strict';

module.exports = function (object, apiProduct, type) {
  Object.defineProperty(object, 'uuid', {
    enumerable: true,
    value: apiProduct.UUID
});

Object.defineProperty(object, 'id', {
    enumerable: true,
    value: apiProduct.ID
});

Object.defineProperty(object, 'productName', {
    enumerable: true,
    value: apiProduct.name
});

Object.defineProperty(object, 'productType', {
    enumerable: true,
    value: type
});

Object.defineProperty(object, 'brand', {
    enumerable: true,
    value: apiProduct.brand
});
 
Object.defineProperty(object, 'categories', {
    enumerable: true,
    value: apiProduct.getAllCategories().getLength() ? apiProduct.getAllCategories() : apiProduct.masterProduct.getAllCategories()
});  
 
};