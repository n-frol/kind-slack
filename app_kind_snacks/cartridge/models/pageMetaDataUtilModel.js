/* global empty */

var ProductMgr = require('dw/catalog/ProductMgr');

/*
 * Encapsulates utility functionality with available view data
 */
function PageMetaDataUtilModel(viewData) {
    this.viewData = viewData;
    if (!empty(this.viewData.product)) {
        this.product = ProductMgr.getProduct(this.viewData.product.id);
    }
    return this;
}

/**
 * Summary a blog of text by reducing it's length
 *
 * @arg {string} str text to reduce
 * @arg {number} maxLength (optional) maximum length
 * @arg {string} trail (optional) trailing character(s) to add
 * @returns {string} reduced string
 */
PageMetaDataUtilModel.prototype.Summarize = function (str, maxLength, trail) {
    maxLength = maxLength || 155; // eslint-disable-line
    trail = trail || '...'; // eslint-disable-line

    if (str.length <= maxLength) {
        return str;
    }
    var summary = str.substr(0, maxLength);
    summary = summary.substr(0, summary.lastIndexOf(' ')) + trail;
    return summary;
};

/**
 * Get's a product's custom attribute from the viewData product
 *
 * NOTE: Page meta tags supports this natively BUT they do not support spaces or
 * special characters, hence this helper.
 *
 * Recommend putting this value on the product model instead if it's required.
 *
 * @arg {string} attributeID attribute to return
 * @arg {string} fallback optional fallback
 * @returns {string} the value or empty string
 */
PageMetaDataUtilModel.prototype.productCustomAttribute = function (attributeID, fallback) {
    fallback = fallback || ''; //eslint-disable-line
    if (empty(this.product)) {
        return fallback;
    }

    return this.product.custom[attributeID];
};

PageMetaDataUtilModel.prototype.productLongDescription = function () {
    if (empty(this.product)) {
        return false;
    }

    return this.Summarize(this.product.longDescription.markup); //eslint-disable-line
};

PageMetaDataUtilModel.prototype.productShortDescription = function () {
    if (empty(this.product)) {
        return false;
    }

    return this.Summarize(this.product.shortDescription.markup); //eslint-disable-line
};
/**
 * Retrieves the current categories parent display name from the view
 *
 * @returns {string} display name or empty
 */
PageMetaDataUtilModel.prototype.parentCategoryName = function () {
    if (this.viewData.productSearch &&
        this.viewData.productSearch.productSearch &&
        this.viewData.productSearch.productSearch.category &&
        !this.viewData.productSearch.productSearch.category.parent.root &&
        !empty(this.viewData.productSearch.productSearch.category.parent.displayName)) {
        return this.viewData.productSearch.productSearch.category.parent.displayName;
    }
    return false;
};

module.exports = PageMetaDataUtilModel;
