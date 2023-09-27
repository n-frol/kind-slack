'use strict';

var base = module.superModule;

/**
 * A recursive method for getting the level of a category within the category
 * hierarchy (0 = root).
 *
 * @param {dw.catalog.Category} category - The category ID.
 * @param {number} [level] - Specify the number of levels already traversed.
 * @returns {number} - The level in the category heirarchy.
 */
function getCategoryLevel(category, level) {
    var lvl = empty(level) ? 0 : level;

    if (category.ID !== 'root' && !empty(category.parent)) {
        lvl ++;
        return getCategoryLevel(category.parent, lvl);
    }

    return lvl;
}

/**
 * @constructor
 * @classdesc ProductSearch class
 *
 * @param {dw.catalog.ProductSearchModel} productSearch - Product search object
 * @param {Object} httpParams - HTTP query parameters
 * @param {string} sortingRule - Sorting option rule ID
 * @param {dw.util.ArrayList.<dw.catalog.SortingOption>} sortingOptions - Options to sort search
 *     results
 * @param {dw.catalog.Category} rootCategory - Search result's root category if applicable
 */
function ProductSearch(
    productSearch,
    httpParams,
    sortingRule,
    sortingOptions,
    rootCategory
) {
    base.apply(this, [
        productSearch,
        httpParams,
        sortingRule,
        sortingOptions,
        rootCategory
    ]);

    this.productListName = 'Search Results';

    if (productSearch.isCategorySearch() && !empty(productSearch.category)) {
        this.productListName = 'Category L' + getCategoryLevel(productSearch.category);
    }
}

module.exports = ProductSearch;
