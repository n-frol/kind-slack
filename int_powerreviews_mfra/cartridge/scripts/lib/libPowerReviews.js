'use strict';

/**
 * libPowerReviews.js
 *
 * The main library that includes getter/setters for PowerReviews configuration data
 * and exports util methods used by other modules.
 * @module libPowerReviews
 */

/* API Includes */
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var Logger = require('dw/system/Logger').getLogger('powerreviews');
var Status = require('dw/system/Status');
var Site = require('dw/system/Site');
var dwUtil = require('dw/util');

/**
 *   Initialize private PowerReviews configuration variables.
 *   The data is accessible only via getter/setter methods.
 *   @constructor
 *   @param {string} locale parameter
 */
function PRSitePrefs(locale) {
    this.siteConfig = Site.getCurrent().getCustomPreferenceValue('PR');
    this.groupId = Site.getCurrent().getCustomPreferenceValue('PRID');
    this.siteId = '1';
    this.categorySeparator = '>';
    this.productFeedFileName = Site.getCurrent().getCustomPreferenceValue('PRProductFeedFileName');
    this.catalogId = Site.getCurrent().getCustomPreferenceValue('defaultCatalogId');
    this.loginRequired = Site.getCurrent().getCustomPreferenceValue('PR_Sign_In');
    this.showVariants = Site.getCurrent().getCustomPreferenceValue('PRProductVariantShow');
    this.orderFeedFileName = Site.getCurrent().getCustomPreferenceValue('PROrderFeedFileName');
    this.defaultLocaleValue = Site.getCurrent().getCustomPreferenceValue('PRDefaultLocale');
    this.onlineStatus = Site.getCurrent().getCustomPreferenceValue('PR_Online_Status');
    this.apiKey = Site.getCurrent().getCustomPreferenceValue('PRApiKey');
    this.sftp = null;
    this.customObject = null;
    this.mappedLocale = null;

    if (!empty(locale)) {
        this.initConfig(locale);
    }
}

/**
 *    The method updates site preferences based on given locale
 *    @param {string} locale request locale
 */
PRSitePrefs.prototype.initConfig = function (locale) {
    var configs = Site.getCurrent().getCustomPreferenceValue('PRLocalesConfigs');

    for (var i = 0; i < configs.length; i++) {
        var config = configs[i].split('|');
        if (config.length === 3) {
            if (dwUtil.StringUtils.trim(config[0]) === locale) {
                this.siteId = dwUtil.StringUtils.trim(config[1]);
                this.merchantId = dwUtil.StringUtils.trim(config[2]);
            }
        } else if (dwUtil.StringUtils.trim(config[0]) === 'default' && config.length === 4) {
            if (locale === 'default') {
                this.siteId = dwUtil.StringUtils.trim(config[1]);
                this.merchantId = dwUtil.StringUtils.trim(config[2]);
                this.mappedLocale = dwUtil.StringUtils.trim(config[3]);
            }
        } else {
            Logger.error('PowerReviews: Locale Config isn\'t correct - {0}', config[i].join('|'));
        }
    }
};

/**
 *    Getter for groupId Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getGroupId = function () {
    return !empty(this.groupId) ? this.groupId : '';
};

/**
 *    Getter for merchantId Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getMerchantId = function () {
    return this.merchantId;
};


/**
 *   Getter for mappedLocale Site Pref
 *   @return {string} Site Pref value
 */
PRSitePrefs.prototype.getMappedLocale = function () {
    return this.mappedLocale;
};

/**
 *    Getter for separator Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getCategorySeparator = function () {
    return this.categorySeparator;
};

/**
 *    Getter for Product Feed name Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getFeedFileName = function () {
    return this.productFeedFileName;
};

/**
 *    Getter for Site ID Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getSiteId = function () {
    return !empty(this.siteId) ? this.siteId : '';
};

/**
 *    Getter for Trigger File Name Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getTriggerFileName = function () {
    return this.triggerFileName;
};

/**
 *    Getter for Trigger File Action Site Pref
 *    @return {boolean} Site Pref value
 */
PRSitePrefs.prototype.getTriggerFileAction = function () {
    return (this.triggerFileAction.getValue() === 'yes');
};

/**
 *    Getter for Zip File Name Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getZipFileName = function () {
    return !empty(this.zipFileName) ? this.zipFileName : 'pwr.zip';
};

/**
 *    Getter for Catalog ID Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getCatalogId = function () {
    return this.catalogId;
};

/**
 *    Getter for Show Variant Site Pref
 *    @return {boolean} Site Pref value
 */
PRSitePrefs.prototype.getShowVariants = function () {
    return !empty(this.showVariants) ? this.showVariants : false;
};

/**
 *    Getter for Show Variant Site Pref
 *    @return {boolean} Site Pref value
 */
PRSitePrefs.prototype.getOnlineStatus = function () {
    return !empty(this.onlineStatus) ? this.onlineStatus : false;
};

/**
 *    Getter for Show API Key Pref
 *    @return {boolean} Site Pref value
 */
PRSitePrefs.prototype.getApiKey = function () {
    return !empty(this.apiKey) ? this.apiKey : false;
};

/**
 *    Getter for Order File Name Site Pref
 *    @return {string} Site Pref value
 */
PRSitePrefs.prototype.getOrderFeedFileName = function () {
    return this.orderFeedFileName;
};

/**
 *    Getter for Sign in required
 *    @return {boolean} is sign in required
 */
PRSitePrefs.prototype.getLoginRequired = function () {
    return this.loginRequired;
};

/**
 *    Getter for PowerReviews CO. In case object doesn't exist create new with predefined attributes
 *    @return {CustomObject} PowerReviews Custom Object
 */
PRSitePrefs.prototype.getCustomObject = function () {
    this.customObject = empty(this.customObject) ? CustomObjectMgr.queryCustomObject('COPowerReviews', '', null) : this.customObject;
    if (empty(this.customObject)) {
        Transaction.wrap(function () {
            this.customObject = CustomObjectMgr.createCustomObject('COPowerReviews', dwUtil.UUIDUtils.createUUID());
            this.customObject.custom.uuid = 'COPowerReviews' + Site.getCurrent().getID();
            this.customObject.custom.PowerReview_Order_Action = 1;
        });
    }

    return this.customObject;
};

/** Exported utility functions. */

/**
 *   @return {Object} Constants
 */
function getConstants() {
    return {
        IMPEX_POWERREVIEWS_PATH: 'powerreviews/',
        SRC_FOLDER: '/src/',
        DELIMITER: ',',
        EXTENSION: '.csv',
        IMAGE_SIZE: 'large',
        IN_STOCK: 'IN_STOCK',
        IN_STOCK_TRUE: 'True',
        IN_STOCK_FALSE: 'False',
        PRODUCT_ID_PARAM: 'pid',
        PRODUCT_URL_PIPELINE: 'Product-Show',
        ADD_TO_CART_PIPELINE: 'Cart-AddProduct'
    };
}

/**
 *    Function that validates Site Prefs
 *   @param {Object} sitePrefs of PRSitePrefs
 *    @return {Object} Status of validation
 */
function validateSitePrefs(sitePrefs) {
    var value = sitePrefs.getMerchantId() || false;

    value = sitePrefs.getGroupId() && value;
    value = sitePrefs.getCategorySeparator() && value;
    value = sitePrefs.getFeedFileName() && value;
    value = sitePrefs.getSiteId() && value;
    value = sitePrefs.getCatalogId() && value;

    if (!value) {
        return new Status(Status.ERROR);
    }
    return new Status(Status.OK);
}

/**
 *   Export function which takes optional locale value and initialize instance of PRSitePrefs
 *   based on its value and return object interface.
 *
 *   @param {string} locale request locale
 *   @return {Object} PowerReviews helper object
 */
module.exports = function (locale) {
    // Private instance of PowerReviews configuration data.
    var sitePrefs = new PRSitePrefs(locale);

    // Library interface.
    return {
        getConstants: getConstants,
        validateSitePrefs: function () {
            return validateSitePrefs(sitePrefs);
        },
        getMappedLocale: function () {
            return sitePrefs.getMappedLocale();
        },

        getCatalogId: function () {
            return sitePrefs.getCatalogId();
        },

        getCustomObject: function () {
            return sitePrefs.getCustomObject();
        },

        getOrderFeedFileName: function () {
            return sitePrefs.getOrderFeedFileName();
        },

        getFeedFileName: function () {
            return sitePrefs.getFeedFileName();
        },

        getCategorySeparator: function () {
            return sitePrefs.getCategorySeparator();
        },

        getOnlineStatus: function () {
            return sitePrefs.getOnlineStatus();
        },

        getLoginRequired: function () {
            return sitePrefs.getLoginRequired();
        },

        getApiKey: function () {
            return sitePrefs.getApiKey();
        },

        getSiteId: function () {
            return sitePrefs.getSiteId();
        },

        getGroupId: function () {
            return sitePrefs.getGroupId();
        },
        getMerchantId: function () {
            return sitePrefs.getMerchantId();
        },
        getProductDescription: function (product) {
            var ldesc = product.getShortDescription();
            var desc = '';
            if (ldesc instanceof dw.content.MarkupText) {
                desc = ldesc.getMarkup();
                return desc;
            } else if (ldesc instanceof String) {
                desc = ldesc;
            } else {
                desc = '';
            }

            try {
                desc = desc.replace(new RegExp(/(\n|\r|\t)/g));
            } catch (e) {
                Logger.error('PowerReviews: Product description string  regex error - {0}', e);
            }

            return desc;
        },
        getCategories: function (product) {
            var cats = product.getOnlineCategories();
            var desc = cats.toArray().map(function (category) {
                return category.displayName;
            }).join('>');

            return desc;
        },
        getPrice: function (product) {
            var priceM = product.getPriceModel();
            var price = priceM.getMinPrice().decimalValue;
            return price;
        },
        getManufacturerSKU: function (product) {
            if (!empty(product.getManufacturerSKU())) {
                var foo = product.getManufacturerSKU();
                return foo;
            }

            return '';
        },
        getBrand: function (product) {
            if (!empty(product.getBrand())) {
                return product.getBrand();
            }

            return '';
        },
        getUPC: function (product) {
            if (!empty(product.getUPC())) {
                return product.getUPC();
            }

            return '';
        }
    };
};
