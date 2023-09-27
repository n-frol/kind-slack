'use strict';

function getCookie(name) {
    const nameEQ = name + "=";
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) == ' ') cookie = cookie.substring(1, cookie.length);
        if (cookie.indexOf(nameEQ) == 0) return cookie.substring(nameEQ.length, cookie.length);
    }
    return null;
}

function addToDataLayer(data) {
    window.gtmDataLayer = window.gtmDataLayer || [];

    if (data.gtmPageData instanceof Array) {
        data.gtmPageData.forEach(function (gtmEvent) {
            gtmDataLayer.push(gtmEvent);
        });
    } else if (data.gtmPageData) {
        gtmDataLayer.push(data.gtmPageData);
    }

    if (data.gtmPageData2) {
        gtmDataLayer.push(data.gtmPageData2);
    }
}

function prepareTopNavEvent(navElement) {
    return {
        gtmPageData: {
            event: 'top_nav',
            nav_element: navElement
        }
    };
}

function prepareSelectContentEvent(contentType, eventItems) {
    return {
        gtmPageData: {
            event: "select_content",
            content_type: contentType,
            event_items: eventItems
        }
    }
}

function prepareSelectContentEventShorter(contentType) {
    return {
        gtmPageData: {
            event: "select_content",
            content_type: contentType,
        }
    }
}

function pushGtmWhenDoneTyping(searchBar) {
    if ($(searchBar).val().length >= 3) {
        addToDataLayer({
            gtmPageData: {
                event: "search",
                search_term: $(searchBar).val()
            }
        });
    }
}

function quickShopEvent(event) {
    if (event.target.innerText.toLowerCase() === 'quick shop') {
        addToDataLayer(prepareSelectContentEventShorter('Quick Shop'));
    }
}

function bestSellerNewArrivalEvent($tile) {
    const $btn = $tile.find('.quickview');
    if (!$btn) {
        return;
    }

    const badgeName = $btn.attr('data-gtm-badge-name');
    if (badgeName && badgeName !== 'null') {
        addToDataLayer(prepareSelectContentEventShorter(badgeName));
    }
}

function listenOnDatasetAttributes(datasetAttribute, callbackFunction) {
    const els = document.querySelectorAll("[" + datasetAttribute + "]");

    [...els].forEach(function (el) {
        el.addEventListener('click', callbackFunction, true);
    });
}

function prepareByobEvent(contentType, packSize, packType) {
    return {
        gtmPageData: {
            event: 'select_content',
            content_type: 'BYOB ' + contentType,
            event_items: 'N/A',
            event_promotion: packType ? [packSize, packType] : packSize
        }
    }
}
function continueByobEvent() {
    const $continueBtn = $('.js-snackbox-continue-btn');
    $continueBtn.on('click', function () {
        const packType = $(this).attr('data-gtm-pack-type');
        const cookieSnackSize = getCookie("gtmBYOBsize");
        if (packType && cookieSnackSize) {
            document.cookie = "gtmBYOBtype" + "=" + packType.replace(/ /g, "_") + "" + "; path=/";
            addToDataLayer(prepareByobEvent('Continue', cookieSnackSize.replace(/_/g, ' '), packType));
        }
    });
}

module.exports = {
    initAjaxSuccess: function () {
        $(document).ajaxSuccess(function (event, xhr, settings, args) {
            if (args.gtmPageData) {
                addToDataLayer(args);
            }
        });
    },
    /*
        [addToCartUrl] is used to capture subscription
        [updateProductSubscriptionUrl] is used to capture updated
        subscription when changing the value on the cart page.
        [radioButtonValue] for gtm event when adding to cart.
    */
    changeAddToCartUrl: function () {
        $('body').on('change', '.og-radio-cont input', function (e) {
            const addToCartUrl = $('.add-to-cart-url').attr('value');
            const updateProductSubscriptionUrl = $('.update-product-subscription').attr('value');
            if (addToCartUrl) {
                const subscribedQueryString = addToCartUrl.split("?subscribed=");
                const radioButtonValue = $(this).val();

                if (subscribedQueryString.includes(radioButtonValue)) {
                    return $('.add-to-cart-url').attr('value', addToCartUrl.replace("subscribed=" + subscribedQueryString[1], "subscribed=" + radioButtonValue));
                }

                $('.add-to-cart-url').attr('value', addToCartUrl + '?subscribed=' + radioButtonValue);
                $('.update-product-subscription').attr('value', updateProductSubscriptionUrl + '?subscribed=' + radioButtonValue);

                const cartPage = $(".cart-page");

                if (cartPage && updateProductSubscriptionUrl) {
                    const productID = $(this).closest(".og-offer").attr("data-og-product").toString();

                    $.ajax({
                        url: updateProductSubscriptionUrl,
                        method: 'POST',
                        data: {
                            subscribed: radioButtonValue,
                            productID: productID
                        },
                        success: function (data) {
                            $('body').trigger('product:afterAddToCart', data);
                        },
                        error: function () {
                            $.spinner().stop();
                        }
                    });
                }
            }
        });
    },
    /*
        Get site-section from data-site-section that is set in BM for content asset <a> tags
        and set it to a cookie to get value on the backend for the page info gtm event. 
        The cookie is removed right after setting page info site section.
    */
    addSiteSectionToContentAssetLinks: function () {
        $('body').on('click', '.js-content-asset-link', function (e) {
            const siteSection = $(this).attr("data-site-section");

            if (siteSection) {
                document.cookie = "site-section" + "=" + (siteSection || "") + "" + "; path=/";
            }
        });
    },
    setGTMItemListName: function () {
        listenOnDatasetAttributes('data-gtm-item-list-name', function (event) {
            document.cookie = "gtmItemListName" + "=" + event.currentTarget.dataset.gtmItemListName.replace(/ /g, "_") + "" + "; path=/";
        });
    },
    setSelectItemToGtm: function () {
        $('body').on('click', '.js-gtm-select-product', function (e) {
            const cookieValue = e.currentTarget.dataset.gtmItemListName !== undefined ? e.currentTarget.dataset.gtmItemListName : e.currentTarget.dataset.gtmProductListname;
            document.cookie = "gtmItemListName" + "=" + cookieValue.replace(/ /g, "_") + "" + "; path=/";

            quickShopEvent(e);
            bestSellerNewArrivalEvent($(this));

            const product = $(this);
            const selectedProduct = {
                'item_id': product.attr('data-gtm-product-id'),
                'item_name': product.attr('data-gtm-product-name'),
                'item_category': product.attr('data-gtm-product-category'),
                'price': product.attr('data-gtm-product-price'),
                'item_list_name': product.attr('data-gtm-product-listname'),
                'index': product.closest('[data-gtm-product-index]') ? parseInt(product.closest('[data-gtm-product-index]').attr('data-gtm-product-index'), 10) + 1 : '',
            }

            addToDataLayer({
                gtmPageData: {
                    event: 'select_item',
                    items: [
                        selectedProduct
                    ]
                }
            });
        });
    },
    setSelectNavBar: function () {
        $('body').on('click', '.js-gtm-nav-click', function (e) {
            const targetDataset = e.currentTarget.dataset;
            const nav_element = 'Shop > Products > ' + targetDataset.gtmProductCategory + " > " + targetDataset.gtmProductName;
            addToDataLayer(prepareTopNavEvent(nav_element));
        });

        $('body').on('click', '.js-gtm-nav-category-click', function (e) {
            const targetDataset = e.currentTarget.dataset;
            document.cookie = "gtmItemListName" + "=" + "Top_Nav" + "" + "; path=/";
            const nav_element = 'Shop > Products > ' + targetDataset.name;
            addToDataLayer(prepareTopNavEvent(nav_element));
        });

        $('body').on('click', "[class='nav-item']", function (e) {
            const contentText = e.currentTarget.innerText;
            if (contentText.includes('build') || contentText.includes('variety')) {
                document.cookie = "gtmItemListName" + "=" + "Top_Nav" + "" + "; path=/";
            }
            addToDataLayer(prepareTopNavEvent(contentText));
        });

        $('body').on('click', ".wholesale-link", function (e) {
            addToDataLayer(prepareTopNavEvent(e.currentTarget.innerText));
        });

        $('.right-menu').on('click', function (e) {
            addToDataLayer(prepareTopNavEvent('Shop > ' + e.target.dataset.gtmTopNavSection + ' > ' + e.target.innerText));
        });

        $('body').on('click', ".suggestall", function (e) {
            addToDataLayer(prepareTopNavEvent('Shop > Products > ' + e.target.dataset.gtmShopAllCategory + ' > Shop All'));
        });

    },
    gtmInternalSearch: function () {
        const debounce = require('lodash/debounce');
        const debounceGtmSearchData = debounce(pushGtmWhenDoneTyping, 3000);

        $('input.search-field').on('keyup', function () {
            debounceGtmSearchData(this);
        });
    },
    sortFilter: function () {
        $(document).on("gtm:sortFilter", function (event, contentType, eventItems) {
            addToDataLayer(prepareSelectContentEvent(contentType, eventItems));
        });
    },
    saveLoginSection: function () {
        $(document).on("gtm:loginSection", function (event, gtmLoginSection) {
            addToDataLayer({
                gtmPageData: {
                    event: 'login',
                    event_method: gtmLoginSection !== "null" ? gtmLoginSection : 'Header'
                }
            });
        });
    },
    subscribeEvent: function () {
        $('body').on('click', ".js-gtm-subscribe", function (e) {
            //Klaviyo Subscribe
            addToDataLayer(prepareSelectContentEvent('Subscribe', 'Footer'))
        });

        $('.js-subscription-submit').on('click', function (e) {
            //Marketing Cloud Subscribe
            addToDataLayer(prepareSelectContentEvent('Subscribe', 'Footer'))
        });
    },
    signUpRewardsEvent: function () {
        $('body').on('click', ".yotpo-submit-button", function (e) {
            //Yotpo Reward Points part
            const parent = $(this).closest('.yotpo-campaign-switcher-wrapper');
            const selectedValue = parent.find('.yotpo-title-text');
            if (selectedValue && selectedValue[0]) {
                addToDataLayer(prepareSelectContentEvent('Rewards Sign Up_' + selectedValue[0].innerHTML, 'Rewards Page'));
            }
        });

        $('body').on('click', ".js-gtm-rewards-sign-up", function (e) {
            addToDataLayer(prepareSelectContentEvent('Rewards Sign Up', 'Rewards Page'));
        });

        $(document).on("gtm:registerSubscribe", function (event, registrationForm) {
            const form = registrationForm.form;
            if (form) {
                const newsletterSubscribe = form.find('.loginradius-cf_newsletter_signup');
                if (newsletterSubscribe && newsletterSubscribe[0].checked === true) {
                    addToDataLayer(prepareSelectContentEvent('Subscribe', 'Registration Page'));
                }
                addToDataLayer(prepareSelectContentEvent('Register', 'Registration Page'));
            }
        });
    },
    applyNowB2B: function () {
        $('.container').on('click', ".loginbutton", function (e) {
            addToDataLayer(prepareSelectContentEvent('Apply Now Wholesale', 'Home Page Top'))
        });

        $('.b2bhomeban').on('click', ".js-gtm-apply-mid", function (e) {
            addToDataLayer(prepareSelectContentEvent('Apply Now Wholesale', 'Home Page Mid'))
        });

        $('body').on('click', ".js-gtm-apply", function (e) {
            const clickPlace = $(this).closest('.product-quickview').length ? 'PLP' : 'PDP';
            addToDataLayer(prepareSelectContentEvent('Apply Now Wholesale', 'Apply Now From ' + clickPlace));
        });
    },
    clicksOnPromotion: function () {
        $(document).on('click', '.js-gtm-promotion', function (e) {
            if (e.currentTarget.className.includes('c-marketing-tile__wrapper')) {
                const headingMarketingTile = $(this).find('.c-marketing-tile__heading');
                if (headingMarketingTile && headingMarketingTile[0]) {
                    return addToDataLayer(prepareSelectContentEventShorter("Marketing Tile " + headingMarketingTile[0].innerText));
                }
                if (e.target.dataset.gtmLearnMore) {
                    return addToDataLayer(prepareSelectContentEventShorter(e.target.dataset.gtmLearnMore));
                }
            }
        });

        listenOnDatasetAttributes('data-gtm-promotion', function (event) {
            addToDataLayer(prepareSelectContentEventShorter(event.currentTarget.dataset.gtmPromotion));
        });

        $(document).on('click', '.experience-assets-htmlwidthconfig', function (e) {
            if (e.target && e.target.dataset.gtmLearnMore) {
                addToDataLayer(prepareSelectContentEventShorter(e.target.dataset.gtmLearnMore));
            }
        });
        
    },
    byobEvents: function () {
        const products = document.querySelectorAll('[data-gtm-pack-size]');

        $('body').on('click', '.js-byob-get-choose-variant', function (e) {
            if (products.length) {
                const selectedProduct = Array.from(products).find(function (product) {
                    return product.dataset.pid === e.currentTarget.dataset.pid;
                });
                if (selectedProduct) {
                    const packSize = selectedProduct.dataset.gtmPackSize;
                    document.cookie = "gtmBYOBsize" + "=" + packSize.replace(/ /g, "_") + "" + "; path=/";
                    addToDataLayer(prepareByobEvent('Get Started', packSize));
                }
            }
        });

        continueByobEvent();
    }
};
