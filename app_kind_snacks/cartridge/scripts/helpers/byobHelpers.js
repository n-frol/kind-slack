/* global empty, session */
'use strict';

/**
 * byobHelpers.js
 *
 * Exports CommonJS helper functions for working with BYOB lists and other BYOB
 * associated functionality.
 */

// SFCC API imports
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');
var Resource = require('dw/web/Resource');
var ProductList = require('dw/customer/ProductList');
var ProductListMgr = require('dw/customer/ProductListMgr');
var ProductMgr = require('dw/catalog/ProductMgr');
var Transaction = require('dw/system/Transaction');

// Module level declarations
var byobLog = Logger.getLogger('byob', 'byob');

/**
 * Add a BYOB ProductList to the current customer's cart
 *
 * @param {ProductList} list - The product list to add to the cart.
 * @return {dw.order.Basket} - Returns the Basket that the items were added to.
 */
function addListToCart(list) {
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var cartHelpers = require('*/cartridge/scripts/cart/cartHelpers');
    var basket = BasketMgr.getCurrentOrNewBasket();
    var boxPli;

    if (empty(basket)) {
        return {
            error: true,
            message: Resource.msg('error.byobaddtocart.missingbasket', 'search', null)
        };
    }

    if (empty(list)) {
        return {
            error: true,
            message: Resource.msg('error.byobaddtocart.missingproductlist', 'search', null)
        };
    }

    if (empty(list.custom.boxSku)) {
        return {
            error: true,
            message: Resource.msg('error.byobaddtocart.missingboxsku', 'search', null)
        };
    }

    var shipment = basket.getDefaultShipment();

    if (empty(shipment)) {
        return {
            error: true,
            message: Resource.msg('error.byobaddtocart.missingshipment', 'search', null)
        };
    }

    // Don't allow more than the max order quantity
    var boxProduct = ProductMgr.getProduct(list.custom.boxSku);
    var qtyInCart = cartHelpers.getQtyAlreadyInCart(list.custom.boxSku, basket.getAllProductLineItems());
    if (qtyInCart >= boxProduct.custom.maxOrderQuantity) {
        return {
            error: true,
            message: Resource.msg('error.byobaddtocart.alreadyincart', 'search', null)
        };
    }

    Transaction.wrap(function () {
        boxPli = basket.createProductLineItem(list.custom.boxSku, shipment);
        boxPli.custom.isByobMaster = true;
        boxPli.custom.boxID = list.ID;
        var boxContents = [];
        var itemIterator = list.getItems().iterator();

        while (itemIterator.hasNext()) {
            var item = itemIterator.next();
            var pli = basket.createProductLineItem(item.productID, shipment);

            pli.setQuantityValue(item.getQuantityValue());
            pli.custom.boxID = list.ID;

            boxContents.push({ sku: item.product.ID, qty: item.getQuantityValue() });
        }

        boxPli.custom.boxContents = JSON.stringify(boxContents);
        list.custom.isAddedToCart = true;
        session.custom.currentByobId = null;

        basketCalculationHelpers.calculateTotals(basket);
    });

    return {
        error: false,
        message: Resource.msg('text.alert.addedtobasket', 'product', null),
        uuid: boxPli.UUID
    };
}

/**
 * Updates BYOB ProductList in the current customer's cart
 *
 * @param {ProductList} list - The product list to add to the cart.
 * @return {dw.order.Basket} - Returns the Basket that the items were added to.
 */
function updateListInCart(list) {
    var basket = BasketMgr.getCurrentOrNewBasket();

    if (empty(list) || empty(list.custom.boxSku) || empty(basket)) {
        return basket;
    }

    var shipment = basket.getDefaultShipment();

    if (empty(shipment)) {
        return basket;
    }

    Transaction.wrap(function () {
        var productLineItems = basket.productLineItems;
        var itemIterator = productLineItems.iterator();

        while (itemIterator.hasNext()) {
            var pli = itemIterator.next();

            if (!empty(pli.custom.boxID) && pli.custom.boxID === list.ID) {
                basket.removeProductLineItem(pli);
            }
        }
    });

    addListToCart(list);

    return basket;
}

/**
 * Convenience method to get the total count of items in a BYOB ProductList in
 * when factoring in the quantities.
 *
 * @param {dw.customer.ProductList} byobList - The ProductList instance.
 * @return {number} - Returns the total number of items that have been added
 *      to the box. This can be used to check against the `custom.boxSize`
 *      custom attribute to know how many items can be added.
 */
function getBYOBListItemCount(byobList) {
    var itemCount = 0;
    if (!byobList.productItems.empty) {
        byobList.productItems.toArray().forEach(function (listItem) {
            if (listItem.quantity.available) {
                itemCount += listItem.quantityValue;
            }
        });
    }

    return itemCount;
}

/**
 * Helper method to for getting a BYOB list item
 *
 * @param {dw.customer.ProductList} byobList - The BYOB product list.
 * @param {string} pid - The product ID to get from the list
 * @returns {dw.customer.ProductListItem} the matching product item if found, else false
 */
function getByobListItem(byobList, pid) {
    if (empty(byobList)) {
        return false;
    }

    var items = byobList.productItems;

    if (!items.empty) {
        var i = 0;
        // Loop through the items in the list and check for a matching item.
        while (i < items.length) {
            // Check if the product ID matches.
            if (!empty(items[i].productID) && items[i].productID === pid) {
                return items[i];
            }

            i++;
        }
    }

    return false;
}

/**
 * Returns the quantity of the specified product added to the specified
 * ProductList instance.
 *
 * @param {dw.customer.ProductList} byobList - The BYOB product list.
 * @param {string} pid - The ID of the SFCC Product.
 * @return {number} - Returns the count of the specified product that has been
 *      added to the BYOB List.
 */
function getBYOBListQuantity(byobList, pid) {
    var quantity = 0;
    var byobItem = getByobListItem(byobList, pid);

    if (byobItem !== false) {
        quantity = byobItem.quantityValue;
    }

    return parseInt(quantity, 10);
}

/** @typedef {{quantity: number}} ProductAddData */

/**
 * Adds the specified product to the product list and returns the total number
 * of items in the list.
 *
 * @param {dw.customer.ProductList} byobList - The product list to add
 *      the products to.
 * @param {Object.<string, ProductAddData>} productData - A JS object literal
 *      with a key for each product ID, and a corresponding value object
 *      containing the quantity and any other options a product to add to the
 *      BYOB ProductList instance.
 * @return {{success: boolean, errorMessage: string}} - Returns a results object
 *      with a success flag and a string for any error messaging.
 */
function addToBYOBList(byobList, productData) {
    var boxSize = byobList.custom.boxSize;
    var success = true;
    var errMsg = Resource.msg('error.update.technicalissue', 'search', null);
    var comboName = '';  // The name of the starter combo, if one is being added

    // Get an array of the product IDs to update from the productData keys.
    var pIds = Object.keys(productData);

    if (!empty(pIds)) {
        // Loop through the product IDs and add to the list unless the box size
        // limit will not allow any more items.
        var i = 0;
        while (i < pIds.length) {
            var pid = pIds[i];
            var product = ProductMgr.getProduct(pIds[i]);

            // If this is not a starter combo, then add each item in the list.
            if (!empty(product) && !product.bundle) {
                var addQuantity = !empty(product) &&
                    product.minOrderQuantity.available ?
                    product.minOrderQuantity.value : 1;

                // Get the total number of items in the list.
                var itemCount = getBYOBListItemCount(byobList);

                // If the quantity is specified use the number passed.
                if (!empty(productData[pid].quantity)) {
                    addQuantity = productData[pid].quantity;
                }

                // Check for error conditions.
                if (empty(boxSize)) {
                    // Log the error.
                    byobLog.error('custom.boxSize attribute not set.');

                    // Return the error flag and an error message.
                    return {
                        success: false,
                        errorMessage: Resource.msg(
                            'error.update.technicalissue', 'search', null)
                    };
                } else if (boxSize < (itemCount + addQuantity)) {
                    // Log the error.
                    byobLog.warn('Box is full, can not add product id: {0}, ' +
                        'in the specified quantity: {1}.', pid, addQuantity);

                    // Return the error flag and an error message.
                    return {
                        success: false,
                        errorMessage: Resource.msg(
                            'error.update.boxfull', 'search', null)
                    };
                }

                try {
                    // Begin the transactional state.
                    Transaction.begin();

                    // Create the new ProductList item & set the quantity.
                    var newPLI = byobList.createProductItem(product);
                    newPLI.setQuantityValue(addQuantity);

                    // Commit the transaction.
                    Transaction.commit();
                } catch (e) {
                    // Rollback any failed transactions.
                    Transaction.rollback();

                    // Log the entire error object then return false.
                    errMsg = 'ERROR adding product ID: {0} to the cart:';
                    errMsg += Object.keys(e).map(function (key) {
                        return '\n\t' + key + ': ' + e[key];
                    }).join();
                    byobLog.error(errMsg, pid);
                    success = false;
                }
            } else if (!empty(product) && !empty(product.bundledProducts)) {
                // Create a map object literal for passing to the add helper.
                var updateData = {};
                var j = 0;

                // Loop through the product bundle items.
                while (success && j < product.bundledProducts.length) {
                    var bundleProduct = product.bundledProducts[j];
                    var qty = product.getBundledProductQuantity(
                        bundleProduct);

                    if (qty.available) {
                        // Add the mapping for the product ID & quantity.
                        updateData[bundleProduct.ID] = { quantity: qty.value };
                    } else {
                        success = false;
                        byobLog.error('Invalid quantity - bundle product id: ' +
                            '{0}\nProduct bundle id: {1}',
                            bundleProduct.ID,
                            product.ID
                        );
                    }

                    j++;
                }

                if (success) {
                    // Add the array of product ids.
                    var result = addToBYOBList(byobList, updateData);
                    if (!result.success) {
                        errMsg = result.errorMessage;
                        success = false;
                    } else {
                        comboName = product.name;
                    }
                }
            } else {
                success = false;
                errMsg = 'Could not find product with id: ' + pIds[i];
                byobLog.error(errMsg);
            }

            i++;
        }
    } else {
        success = false;
        byobLog.error('No product Id(s) passed in request.');
    }

    return {
        success: success,
        errorMessage: !success ? errMsg : '',
        comboName: comboName
    };
}

/**
 * Gets the customer's ProductList that is used for keeping track of their BYOB
 * box items, or null if one is not found for the specified customer.
 *
 * @param {dw.customer.Customer} currentCustomer - The current customer, or customer to
 *      get the current BYOB list for.
 * @return {dw.customer.ProductList} - Returns the ProductList instance for the
 *      customer that is of type `ProductList.TYPE_CUSTOM_1` or null if one has
 *      not been created for the customer yet.
 */
function getBYOBList(currentCustomer) {
    var byobList = null;

    // Check if there is a list ID stored on the session custom attribute.
    var byobListId = session.custom.currentByobId;
    if (!empty(byobListId)) {
        // Get the list from the list ID.
        byobList = ProductListMgr.getProductList(byobListId);
    }

    // If there is no list in the session, then loop through the customer's
    // ProductLists and try to find one of the correct type.
    if (empty(byobList)) {
        var byobListCollection = ProductListMgr.getProductLists(
            currentCustomer,
            ProductList.TYPE_CUSTOM_1
        );

        if (!byobListCollection.empty) {
            // Find a list that is not added to the cart.
            var i = 0;
            while (i < byobListCollection.length) {
                var list = byobListCollection[i];

                if (!empty(list.custom.isAddedToCart) &&
                    !list.custom.isAddedToCart
                ) {
                    byobList = list;
                    break;
                }

                i++;
            }
        }
    }

    if (!empty(byobList)) {
        // If a list was found, make sure it is set in the session variable.
        session.custom.currentByobId = byobList.ID;
    } else {
        // Log that a list was not found.
        byobLog.info('No BYOB ProductList created for customer: {0}',
            !empty(currentCustomer.profile) ?
            currentCustomer.profile.customerNo : 'unregistered');
    }

    return byobList;
}

/**
 * Gets the size of a specified BYOB box product from the product's size attr.
 *
 * @param {dw.catalog.Product} boxProduct - The BYOB container product.
 * @return {number} - Returns the string for the number portion of the sze
 *      attribute value for the specified product.
 */
function getBYOBContainerSize(boxProduct) {
    // Get the product variation model.
    var variationModel = boxProduct.getVariationModel();
    var attribute = variationModel.getProductVariationAttribute('size');
    var size = null;

    // Get the value of the variant's size attribute to set the box size.
    if (!empty(attribute)) {
        var value = variationModel.getSelectedValue(attribute);
        var sizeString = value.displayValue.replace(/[^0-9]/g, '');

        if (!isNaN(parseInt(sizeString, 10))) {
            size = parseInt(sizeString, 10);
        }
    }

    return size;
}

/**
 * Checks if a specified category is either marked as a configuration category
 * (`Category.custom.isConfigurationCategory`) AND / OR matches the ID for the
 * root category specified in the site preference.
 *
 * @param {string} catId - The ID of the SFCC category.
 * @return {boolean} - Returns true if this is a BYOB category; otherwise false.
 */
function isBYOBCategory(catId) {
    var CatalogMgr = require('dw/catalog/CatalogMgr');
    var Site = require('dw/system/Site');
    var site = Site.getCurrent();
    var byobCategoryId = site.getCustomPreferenceValue('byobRootCategoryID');
    var category = CatalogMgr.getCategory(catId);
    var byobCategory = !empty(byobCategoryId) ?
        CatalogMgr.getCategory(byobCategoryId) : null;

    if (!empty(catId) &&
        !empty(byobCategoryId) &&
        catId === byobCategoryId
    ) {
        // Matches the configured ID for the BYOB root category.
        return true;
    } else if (!empty(category) &&
        !empty(byobCategory) &&
        category.isSubCategoryOf(byobCategory)
    ) {
        // Category is a sub-category of the BYOB root category.
        return true;
    } else if (!empty(category) &&
        !empty(category.custom.isConfigurationCategory) &&
        category.custom.isConfigurationCategory
    ) {
        // Category is marked as a configuration category.
        return true;
    }

    // If the conditions are not met, then this is not a BYOB Category.
    return false;
}

/**
 * Removes the specified items from the ProductList.
 * ProductListItem
 * @param {dw.customer.ProductList} byobList - The BYOB ProductList instance.
 * @param {string[]} pIds - An array of product IDs that should be removed from
 *      the list.
 * @return {{success: boolean, errorMessage: string}} - Returns a results object
 *      with a success flag and a string for any error messaging.
 */
function removeFromBYOBList(byobList, pIds) {
    var blArray = !byobList.productItems.empty ?
        byobList.productItems.toArray() : [];
    var success = true;
    if (!empty(pIds)) {
        try {
            // Begin Transactional State
            Transaction.begin();

            // Loop through the items in the list to find the matching id.
            if (!empty(blArray)) {
                blArray.forEach(function (byobListItem) {
                    // Cast to string to avoid issues with ID getting parsed as
                    // a Number type when reading from the querystring object.
                    if (pIds.indexOf(String(byobListItem.productID)) > -1) {
                        byobList.removeItem(byobListItem);
                    }
                });
            }

            // End Transactional State
            Transaction.commit();
        } catch (e) {
            // Rollback Failed Transaction
            Transaction.rollback();

            // Log entire error messgae.
            var errMsg = 'ERROR removing items from the BYOB list.';
            errMsg += Object.keys(e).map(function (key) {
                return '\n\t' + key + ': ' + e[key];
            }).join();
            byobLog.error(errMsg);
            success = false;
        }
    } else {
        success = false;
        byobLog.error('Unable to remove items from the product list' +
            '\nNo items in the list or no items specified for removal.');
    }

    // Return the number of items left in the ProductList.
    return {
        success: success,
        errorMessage: !success ?
            Resource.msg('error.update.technicalissue', 'search', null) : ''
    };
}

/**
 * Removes all products from the specified BYOB List instance but does NOT
 * remove the list from the profile.
 *
 * @param {dw.customer.ProductList} byobList - The customer's current BYOB box.
 * @return {{success: boolean, errorMessage: string}} - Returns a results object
 *      with a success flag and a string for any error messaging.
 */
function removeAllFromBYOBList(byobList) {
    if (!empty(byobList.productItems)) {
        var pidArray = byobList.productItems.toArray().map(
            function (productItem) {
                return productItem.productID;
            }
        );

        return removeFromBYOBList(byobList, pidArray);
    }

    return { success: true }; // If the box is already empty, then we can consider this a success
}

/**
 * Removes the BYOB list from the customers profile, and resets the session
 * variable.
 *
 * @param {dw.customer.ProductList} byobList - The current BYOB ProductList.
 * @return {{success: boolean, errorMessage: string}} - Returns a results object
 *      with a success flag and a string for any error messaging.
 */
function resetBYOBList(byobList) {
    session.custom.currentByobId = null;
    Transaction.wrap(function () {
        ProductListMgr.removeProductList(byobList);
    });

    return { success: true, errorMessage: '' };
}

/**
 * Updates the quantity, or options for existing ProductListItems in the BYOB
 * ProductList instnce, or adds new items if the matching items can't be found.
 *
 * @param {dw.customer.ProductList} byobList - The BYOB ProductList instance.
 * @param {Object} updateData - An object with key/val pairs for attribute values of
 *      the product list or the items in the list that need to be updated.
 * @param {Object[]} [updateData.items] - Update data for individual list items.
 * @param {string} [updateData.boxSku] - An optional parameter that can be used to
 *      update the boxSku of the current BYOB box.
 * @return {boolean} - Returns true for successfull update, otherwise false.
 */
function updateBYOBList(byobList, updateData) {
    // Function level declarations
    var success = true;
    var errMsg = Resource.msg('error.update.technicalissue', 'search', null);

    // Update Custom Attributes for new box sku
    if (!empty(updateData.boxSku)) {
        var skuProduct = ProductMgr.getProduct(updateData.boxSku);

        if (!empty(skuProduct)) {
            // Get the value of the variant's size attribute to set the box size.
            var size = getBYOBContainerSize(skuProduct);
            var currentSize = !isNaN(parseInt(byobList.custom.boxSize, 10)) ?
                parseInt(byobList.custom.boxSize, 10) : 0;

            if (!empty(size)) {
                // If the box is smaller than the previous size then clear the
                // items from the list.
                if (!empty(currentSize) && currentSize > size) {
                    var resetSuccess = removeAllFromBYOBList(byobList);

                    // If the removal of the items fails don't continue.
                    if (!resetSuccess.success) {
                        return {
                            success: false,
                            errorMessage: 'There was an error removing items ' +
                                'from the box.'
                        };
                    }
                }

                // Transaction: Update Attributes
                Transaction.wrap(function () {
                    byobList.custom.boxSize = size;
                    byobList.custom.boxSku = updateData.boxSku;
                    byobList.custom.ogEvery = updateData.every || 0;
                    byobList.custom.ogEveryPeriod = updateData.everyPeriod || 0;

                    if (!empty(updateData.ogPublicID)) {
                        byobList.custom.ogPublicID = updateData.ogPublicID;
                    }
                });
            } else {
                success = false;
                byobLog.error('Unable to update list custom.boxSku attribute: ' +
                    '\nCould not find size attribute of product id: {0}',
                    updateData.boxSku);
            }
        } else {
            success = false;
            byobLog.error('Unable to update list custom.boxSku attribute: ' +
                '\nCould not find product id: {0}', updateData.boxSku);
        }
    }

    // Update Line Items
    if (!empty(updateData) &&
        !empty(updateData.items) &&
        Array.isArray(updateData.items)
    ) {
        var boxSize = !empty(byobList.custom.boxSize) &&
            !isNaN(parseInt(byobList.custom.boxSize, 10)) ?
            parseInt(byobList.custom.boxSize, 10) : 0;

        // Loop through the product Ids to update.
        updateData.items.forEach(function (item) {
            // Get a number from the param.
            var qty = typeof item.quantity !== 'undefined' &&
                !empty(item.quantity) ?
                item.quantity : 0;
            var lineItem;

            // Loop through the existing ProductListItems and check for an
            // existing line item to update.
            if (!byobList.productItems.empty) {
                byobList.productItems.toArray().forEach(function (byobItem) {
                    if (!empty(byobItem.productID) &&
                        byobItem.productID === String(item.pid)
                    ) {
                        lineItem = byobItem;
                    }
                });
            }

            // Check if existing line item was found.
            if (success && empty(lineItem)) {
                // Create the data object in the proper format for the add call.
                var productData = {
                    quantity: qty
                };

                var pDataObj = {};
                pDataObj[item.pid] = productData;

                // If no line item was found, then create a new one.
                var addResult = addToBYOBList(byobList, pDataObj);
                success = addResult.success;

                // Handle any errors.
                if (!success && !empty(addResult.errorMessage)) {
                    errMsg = addResult.errorMessage;
                }
            } else if (success && !empty(boxSize) &&
                !empty(qty)
            ) {
                // Get the change from the current quantity to calculate if the
                // box will be full.
                var qtyChange = qty - lineItem.quantityValue;

                // Check to see if a valid quantity was passed and update item.
                var newBoxCount = qtyChange + getBYOBListItemCount(byobList);
                if (newBoxCount <= boxSize) {
                    Transaction.wrap(function () {
                        lineItem.setQuantityValue(qty);
                    });
                } else {
                    // Return the error flag and an error message.
                    success = false;
                    errMsg = Resource.msg(
                            'error.update.boxfull', 'search', null);
                }
            }
        });
    }

    return { success: success, errorMessage: !success ? errMsg : '' };
}


/**
 * Returns the count for a given category, including subcategories
 * @param {Object} category - The cateory to provide the count for
 * @returns {number} the category count
 */
function getByobCategoryCount(category) {
    var ProductSearchModel = require('dw/catalog/ProductSearchModel');

    if (empty(category)) {
        return 0;
    }

    var apiProductSearch = new ProductSearchModel();
    apiProductSearch.setRecursiveCategorySearch(true);
    apiProductSearch.setCategoryID(category.ID);
    apiProductSearch.search();

    return apiProductSearch.getProductSearchHits().asList().length;
}


/**
 * Creates a new product list (if not already created)
 * @param {Object} pid - The PID for the BYOB box
 * @returns {ProductList} The newly created product list
 */
function createProductList(pid) {
    var ProductFactory = require('*/cartridge/scripts/factories/product');
    var byobList = getBYOBList(session.customer);

    if (!empty(pid)) {
        // If there is a current list, update the list from the current variant.
        if (!empty(byobList)) {
            updateBYOBList(byobList, { boxSku: pid });
        } else {
            var product = ProductFactory.get({ pid: pid });

            Transaction.wrap(function () {
                if (!empty(product.variationAttributes)) {
                    byobList = ProductListMgr.createProductList(session.customer, ProductList.TYPE_CUSTOM_1);
                    byobList.custom.boxSku = product.id;
                    byobList.custom.isAddedToCart = false;

                    var len = product.variationAttributes.length;
                    for (var i = 0; i < len; i++) {
                        var attribute = product.variationAttributes[i];

                        if (attribute.attributeId === 'size') {
                            var size = attribute.displayValue.replace(/[^0-9]/g, '');
                            byobList.custom.boxSize = size;
                            break;
                        }
                    }
                }
            });
        }
    }

    return byobList;
}

module.exports = {
    addListToCart: addListToCart,
    addToBYOBList: addToBYOBList,
    getBYOBContainerSize: getBYOBContainerSize,
    getBYOBList: getBYOBList,
    getByobListItem: getByobListItem,
    getBYOBListItemCount: getBYOBListItemCount,
    getBYOBListQuantity: getBYOBListQuantity,
    isBYOBCategory: isBYOBCategory,
    removeAllFromBYOBList: removeAllFromBYOBList,
    removeFromBYOBList: removeFromBYOBList,
    resetBYOBList: resetBYOBList,
    updateBYOBList: updateBYOBList,
    updateListInCart: updateListInCart,
    getByobCategoryCount: getByobCategoryCount,
    createProductList: createProductList
};
