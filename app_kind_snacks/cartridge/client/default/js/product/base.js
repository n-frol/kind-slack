'use strict';

var processInclude = require('base/util');
var baseBase = require('base/product/base');


function initializeByobProduct() {
    processInclude(require('../byob/byobProduct'));
}

/**
 * Retrieves the relevant pid value
 * @param {jquery} $el - DOM container for a given add to cart button
 * @return {string} - value to be used when adding product to cart
 */
function getPidValue($el) {
    var pid;

    if ($('#quickViewModal').hasClass('show') && !$('.product-set').length) {
        pid = $($el).closest('.modal-content').find('.product-quickview').data('pid');
    } else if ($('.product-set-detail').length || $('.product-set').length) {
        pid = $($el).closest('.product-detail').find('.product-id').text();
    } else if ($($el).hasClass('js-order-item') || $($el).hasClass('js-byob-get-started')) {
        pid = $($el).data('pid');
    } else {
        pid = $('.product-detail:not(".bundle-item")').data('pid');
    }

    return pid;
}

/**
 * Retrieve contextual quantity selector
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {jquery} - quantity selector DOM container
 */
function getQuantitySelector($el) {
    var $qty = $el
        ? $($el).closest('.product-detail, .js-product-detail').find('.quantity-select')
        : $('.quantity-select');

    if (!$qty.length) {
        $qty = $('.quantity-select');
    }

    return $qty;
}

/**
 * Retrieves the value associated with the Quantity pull-down menu
 * @param {jquery} $el - DOM container for the relevant quantity
 * @return {string} - value found in the quantity input
 */
function getQuantitySelected($el) {
    return getQuantitySelector($el).val();
}

/**
 * Process attribute values associated with an attribute that does not have image swatches
 *
 * @param {Object} attr - Attribute
 * @param {string} attr.id - Attribute ID
 * @param {Object[]} attr.values - Array of attribute value objects
 * @param {string} attr.values.value - Attribute coded value
 * @param {string} attr.values.url - URL to de/select an attribute value of the product
 * @param {boolean} attr.values.isSelectable - Flag as to whether an attribute value can be
 *     selected.  If there is no variant that corresponds to a specific combination of attribute
 *     values, an attribute may be disabled in the Product Detail Page
 * @param {jQuery} $productContainer - DOM container for a given product
 */
function processNonSwatchValues(attr, $productContainer) {
    var $attr = '[data-attr="' + attr.id + '"]';
    var $defaultOption = $productContainer.find($attr + ' .select-' + attr.id + ' option:first');
    $defaultOption.attr('value', attr.resetUrl);

    attr.values.forEach(function (attrValue) {
        var $attrValue = $productContainer
            .find($attr + ' [data-attr-value="' + attrValue.value + '"]');
        $attrValue.attr('value', attrValue.url)
            .removeAttr('disabled');

        if (!attrValue.selectable) {
            $attrValue.attr('disabled', true);
        }
    });
}

/**
 * Retrieves url to use when adding a product to the cart
 *
 * @return {string} - The provided URL to use when adding a product to the cart
 */
function getAddToCartUrl() {
    return $('.add-to-cart-url').val();
}

function getOGUpdateListUrl() {
    return $('.og-update-list-url').val();
}

/**
 * Retrieves url to use when adding a product to the cart
 * @param {Object} $button - button containing data attribute
 *
 * @return {string} - The provided URL to use when adding a product to the cart
 */
function getByobPostAddToCartRedirectUrl($button) {
    return $button.data('byob-post-add-to-cart-redirect-url');
}

/**
 * Parses the html for a modal window
 * @param {string} html - representing the body and footer of the modal window
 *
 * @return {Object} - Object with properties body and footer.
 */
function parseHtml(html) {
    var $html = $('<div>').append($.parseHTML(html));

    var body = $html.find('.choice-of-bonus-product');
    var footer = $html.find('.modal-footer').children();

    return { body: body, footer: footer };
}

/**
 * Retrieves url to use when adding a product to the cart
 *
 * @param {Object} data - data object used to fill in dynamic portions of the html
 */
function chooseBonusProducts(data) {
    $('.modal-body').spinner().start();

    if ($('#chooseBonusProductModal').length !== 0) {
        $('#chooseBonusProductModal').remove();
    }
    var bonusUrl;
    if (data.bonusChoiceRuleBased) {
        bonusUrl = data.showProductsUrlRuleBased;
    } else {
        bonusUrl = data.showProductsUrlListBased;
    }

    var htmlString = '<!-- Modal -->'
        + '<div class="modal fade" id="chooseBonusProductModal" role="dialog">'
        + '<div class="modal-dialog choose-bonus-product-dialog" '
        + 'data-total-qty="' + data.maxBonusItems + '"'
        + 'data-UUID="' + data.uuid + '"'
        + 'data-pliUUID="' + data.pliUUID + '"'
        + 'data-addToCartUrl="' + data.addToCartUrl + '"'
        + 'data-pageStart="0"'
        + 'data-pageSize="' + data.pageSize + '"'
        + 'data-moreURL="' + data.showProductsUrlRuleBased + '"'
        + 'data-bonusChoiceRuleBased="' + data.bonusChoiceRuleBased + '">'
        + '<!-- Modal content-->'
        + '<div class="modal-content">'
        + '<div class="modal-header">'
        + '    <span class="">' + data.labels.selectprods + '</span>'
        + '    <button type="button" class="close pull-right" data-dismiss="modal"></button>'
        + '</div>'
        + '<div class="modal-body"></div>'
        + '<div class="modal-footer"></div>'
        + '</div>'
        + '</div>'
        + '</div>';
    $('body').append(htmlString);
    $('.modal-body').spinner().start();

    $.ajax({
        url: bonusUrl,
        method: 'GET',
        dataType: 'html',
        success: function (html) {
            var parsedHtml = parseHtml(html);
            $('#chooseBonusProductModal .modal-body').empty();
            $('#chooseBonusProductModal .modal-body').html(parsedHtml.body);
            $('#chooseBonusProductModal .modal-footer').html(parsedHtml.footer);
            $('#chooseBonusProductModal').modal('show');
            $.spinner().stop();
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

/**
 * Updates the Mini-Cart quantity value after the customer has pressed the "Add to Cart" button
 * @param {string} response - ajax response from clicking the add to cart button
 */
function handlePostCartAddCount(response) {
    $('.minicart').trigger('count:update', response);
}
/**
 * Generates the alert messages for the status of each product the user attempts to add to the cart
 * @param {string} response - ajax response from clicking the add to cart button
 */
function handlePostCartAddMessages(response) {
    $('.minicart').trigger('count:update', response);
    var messageType = response.error ? 'alert-danger c-alert--danger' : 'alert-success c-alert--success';
    // show add to cart toast
    if (response.newBonusDiscountLineItem
        && Object.keys(response.newBonusDiscountLineItem).length !== 0) {
        chooseBonusProducts(response.newBonusDiscountLineItem);
    } else {
        if ($('.add-to-cart-messages').length === 0) {
            $('body').append(
            '<div class="add-to-cart-messages c-alert__alerts-container"></div>'
            );
        }

        $('.add-to-cart-messages').append(
            '<div class="alert c-alert ' + messageType + ' add-to-basket-alert text-center" role="alert">'
            + response.message
            + '</div>'
        );

        setTimeout(function () {
            $('.add-to-basket-alert').remove();
        }, 5000);
    }
}

/**
 * Calls all of the handlePostCartAdd functions in on place
 * @param {string} response - ajax response from clicking the add to cart button
 */
function handlePostCartAdd(response) {
    handlePostCartAddCount(response);

    handlePostCartAddMessages(response);
}

/**
 * Retrieves the bundle product item ID's for the Controller to replace bundle master product
 * items with their selected variants
 *
 * @param {Object} $item - Optional jquery object to look in
 * @return {string[]} - List of selected bundle product item ID's
 */
function getChildProducts($item) {
    var childProducts = [];
    var $bundleItems = $('.bundle-item');

    if ($item) {
        $bundleItems = $item.find('.bundle-item');
    }

    $bundleItems.each(function () {
        childProducts.push({
            pid: $(this).find('.product-id').text(),
            quantity: parseInt($(this).find('label.quantity').data('quantity'), 10)
        });
    });

    return childProducts.length ? JSON.stringify(childProducts) : '[]';
}

/**
 * Retrieve product options
 *
 * @param {jQuery} $productContainer - DOM element for current product
 * @return {string} - Product options and their selected values
 */
function getOptions($productContainer) {
    var options = $productContainer
        .find('.product-option')
        .map(function () {
            var $elOption = $(this).find('.options-select');
            var urlValue = $elOption.val();
            var selectedValueId = $elOption.find('option[value="' + urlValue + '"]')
                .data('value-id');
            return {
                optionId: $(this).data('option-id'),
                selectedValueId: selectedValueId
            };
        }).toArray();

    return JSON.stringify(options);
}

/**
 * Function to run on add to cart trigger
 * Separated out so it can be removed from the listener to prevent overlap
 */
function doAddToCart() {
    var addToCartUrl;
    var ogUpdateListUrl;
    var byobPostAddToCartRedirectUrl;
    var pid;
    var pidsObj;
    var setPids;

    if ($(this)[0].hasAttribute("data-toggle")) {
        return;
    }

    $('body').trigger('product:beforeAddToCart', this);

    if ($('.set-items').length && $(this).hasClass('add-to-cart-global')) {
        setPids = [];

        $('.product-detail').each(function () {
            if (!$(this).hasClass('product-set-detail')) {
                setPids.push({
                    pid: $(this).find('.product-id').text(),
                    qty: $(this).find('.quantity-select').val(),
                    options: getOptions($(this))
                });
            }
        });
        pidsObj = JSON.stringify(setPids);
    }

    pid = getPidValue($(this));

    var $productContainer = $(this).closest('.product-detail');
    if (!$productContainer.length) {
        $productContainer = $(this).closest('.quick-view-dialog').find('.product-detail');
    }

    addToCartUrl = getAddToCartUrl();
    ogUpdateListUrl = getOGUpdateListUrl();
    byobPostAddToCartRedirectUrl = getByobPostAddToCartRedirectUrl($(this));

    var form = {
        pid: pid,
        pidsObj: pidsObj,
        childProducts: getChildProducts(),
        quantity: getQuantitySelected($(this))
    };

    if (!$('.bundle-item').length) {
        form.options = getOptions($productContainer);
    }

    $(this).trigger('updateAddToCartFormData', form);
    if (addToCartUrl) {
        $.ajax({
            url: addToCartUrl,
            method: 'POST',
            data: form,
            success: function (data) {
                if (data.error) {
                    handlePostCartAdd(data);
                } else {
                    handlePostCartAddCount(data);
                }
                $('body').trigger('product:afterAddToCart', data);
                if (typeof byobPostAddToCartRedirectUrl !== 'undefined') {
                    /**
                     * Need to give the hook manager enough time to finish running
                     * Ideally this would be done with an async/await, but SFRA backend doesn't currently support that
                     * It also lacks support for Promises, so even rigging a custom polyfill is out
                     *
                     * 450ms seems to be a safe margin even for slower browsers
                     */
                    setTimeout(function () {
                        window.location.href = byobPostAddToCartRedirectUrl;
                    }, 3000);
                } else {
                    $.spinner().stop();
                }

                // Don't open minicart if explicitly told not to
                if (!data.error && (data.openMinicart === true || typeof data.openMinicart === 'undefined')) {
                    $('.minicart').trigger('mouseenter');

                    window.miniCartTimeout = setTimeout(function () {
                        $('.minicart').trigger('mouseleave');
                    }, 5000);
                }
            },
            error: function () {
                $.spinner().stop();
            }
        });
    } else if (ogUpdateListUrl) {
        $.ajax({
            url: ogUpdateListUrl,
            method: 'POST',
            data: form,
            success: function (data) {
                if (typeof byobPostAddToCartRedirectUrl !== 'undefined') {
                    $('body').trigger('product:afterUpdateListInCart', data);
                    /**
                     * Need to give the hook manager enough time to finish running
                     * Ideally this would be done with an async/await, but SFRA backend doesn't currently support that
                     * It also lacks support for Promises, so even rigging a custom polyfill is out
                     *
                     * 450ms seems to be a safe margin even for slower browsers
                     */
                    setTimeout(function () {
                        window.location.href = byobPostAddToCartRedirectUrl;
                    }, 3000);
                }

                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    }
}

/**
 * Function to run on BYOB get started trigger
 * Separated out so it can be removed from the listener to prevent overlap
 */
function doByobGetStarted() {
    var $this = $(this);
    var addToCartUrl;
    var pid;

    // If we're showing the confirm empty dialog, don't continue with this action
    if ($this.attr('data-show-confirm-empty-dialog') === 'true') {
        return;
    }
    pid = getPidValue($this);

    var $productContainer = $this.closest('.product-detail');
    if (!$productContainer.length) {
        $productContainer = $this.closest('.quick-view-dialog').find('.product-detail');
    }

    addToCartUrl = getAddToCartUrl();

    var form = {
        every: $(this).data('og-every') || 0,
        everyPeriod: $(this).data('og-every-period') || 0,
        pid: pid
    };

    if (!$('.bundle-item').length) {
        form.options = getOptions($productContainer);
    }

    if (addToCartUrl) {
        $.ajax({
            url: addToCartUrl,
            method: 'POST',
            data: form,
            success: function (data) {
                if (data.forwardUrl) {
                    window.location = data.forwardUrl;
                }

                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    }
}

/**
 * Function to run on add to multiple products to cart
 * Separated out so it can be removed from the listener to prevent overlap
 * @param {function} callback - Optional callback function to be executed on success
 */
function doAddMultipleToCart(callback) {
    var addToCartUrl;
    var pid;
    var pidsObj;
    var setPids;
    var form = {};

    $('body').trigger('product:beforeAddToCart', this);

    const $orderItemsList = $(this).closest('.js-order-items');
    const $orderItems = $orderItemsList.find('.js-product-detail');

    $orderItems.each(function (ind, item) {
        let $item = $(item);

        if (($item.hasClass('set-items') || $item.find('.set-items').length) && $(this).hasClass('add-to-cart-global')) {
            setPids = [];

            $item.find('.product-detail').each(function () {
                if (!$(this).hasClass('product-set-detail')) {
                    setPids.push({
                        pid: $(this).find('.product-id').text(),
                        qty: $(this).find('.quantity-select').val(),
                        options: getOptions($(this))
                    });
                }
            });
            pidsObj = JSON.stringify(setPids);
        }

        pid = getPidValue($item);

        var $productContainer = $item;

        var formEntry = {
            pid: pid,
            pidsObj: pidsObj,
            childProducts: getChildProducts($item),
            quantity: getQuantitySelected($item),
            isByobMaster: $item.attr('data-is-byob-master') === 'true',
            isExcludeItem: $item.attr('data-is-exclude-to-add-basket') === 'true'
        };

        if (!$('.bundle-item').length) {
            formEntry.options = getOptions($productContainer);
        }

        // Stringify since SFRA is struggling with the nested JSON
        form[pid] = JSON.stringify(formEntry);
    });

    addToCartUrl = getAddToCartUrl();

    $(this).trigger('updateAddToCartFormData', form);
    if (addToCartUrl) {
        $.ajax({
            url: addToCartUrl,
            method: 'POST',
            data: form,
            success: function (data) {
                $.each(data.results, function (ind, result) {
                    var datum = Object.assign(data, result);

                    handlePostCartAdd(datum);
                    $('body').trigger('product:afterAddToCart', datum);
                });
                $.spinner().stop();
            },
            error: function () {
                $.spinner().stop();
            }
        });
    }
}

function selectBonusProduct() {
    $(document).on('click', '.select-bonus-product', function () { //eslint-disable-line
        var productRemoved = false;
        $(this).unbind('click');
        if ($('.selected-pid').length) {
            var $selectedProducts = $('.selected-pid');
            var selectedProduct;
            for (var i = 0; i < $selectedProducts.length; i++) {
                selectedProduct = $selectedProducts.eq(i).data('pid');
                if (selectedProduct == $(this).data('pid')) { //eslint-disable-line
                    productRemoved = true;
                    $selectedProducts.eq(i).click();
                    $(this).removeClass('selected');
                    $(this).text('select');
                    var maxPids = $('.choose-bonus-product-dialog').data('total-qty'); //eslint-disable-line
                    if ($selectedProducts.length > 0 && selectedProduct.length != maxPids) { //eslint-disable-line
                        $(".select-bonus-product:not(.selected").removeClass("notpicked");
                        $('.add-bonus-products').text('Remove Bonus');
                    }
                    return false;
                }
            }
        }
        if (!productRemoved) {
            var $choiceOfBonusProduct = $(this).parents('.choice-of-bonus-product');
            var pid = $(this).data('pid');
            var maxPids = $('.choose-bonus-product-dialog').data('total-qty'); //eslint-disable-line
            var submittedQty = parseInt($(this).parents('.choice-of-bonus-product').find('.bonus-quantity-select').val(), 10) || 1;
            var totalQty = 0; //eslint-disable-line
            $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
                totalQty += $(this).data('qty'); //eslint-disable-line
            });
            totalQty += submittedQty; //eslint-disable-line
            var optionID = $(this).parents('.choice-of-bonus-product').find('.product-option').data('option-id');
            var valueId = $(this).parents('.choice-of-bonus-product').find('.options-select option:selected').data('valueId');
            if (totalQty <= maxPids) { //eslint-disable-line
                var selectedBonusProductHtml = ''
                    + '<div style="visibility:none;" class="selected-pid row" '
                    + 'data-pid="' + pid + '"'
                    + 'data-qty="' + submittedQty + '"'
                    + 'data-optionID="' + (optionID || '') + '"'
                    + 'data-option-selected-value="' + (valueId || '') + '"'
                    + '>'
                    + '<div class="col-sm-11 col-9 bonus-product-name" >'
                    + $choiceOfBonusProduct.find('.product-name').html()
                    + '</div>'
                    + '<div class="col-1"><i class="fa fa-times" aria-hidden="true"></i></div>'
                    + '</div>'
                    ;
                $('#chooseBonusProductModal .selected-bonus-products').append(selectedBonusProductHtml);
                $('.pre-cart-products').html(totalQty);
                $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
                $(this).addClass('selected');
                $(this).text('remove');
                $('.add-bonus-products').text('  Add to Cart');
                totalQty = 0;
                $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
                    totalQty += $(this).data('qty');
                });
                if (totalQty == maxPids) { //eslint-disable-line
                    $(".select-bonus-product:not(.selected").addClass("notpicked");
                }
            } else {
                if ($('.bonusalert').length === 0) {
                    $(".modal-body").prepend("<div class='bonusalert alert-danger'>PLEASE REMOVE SELECTED ITEM BEFORE CHOOSING A NEW GIFT</div>");
                }
                $('.selected-bonus-products .bonus-summary').addClass('alert-danger');
            }
            $('.add-bonus-products').prop("disabled", false);
        }
    });
}
function removeBonusProduct() {
    $(document).on('click', '.selected-pid', function () {
        $(this).remove();
        var $selected = $('#chooseBonusProductModal .selected-bonus-products .selected-pid');
        var count = 0;
        if ($selected.length) {
            $selected.each(function () {
                var qty = $(this).data('qty') || 1;
                count += parseInt(qty, 10);
            });
        }

        $('.pre-cart-products').html(count);
        $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
    });
}
/**
 * Properly sets the product images after selecting an attribute
 * @param {Object} response - Ajax data from selecting attribute
 * @param {Object} $productContainer - Product container
 */
function resetSliderImages(response, $productContainer) {
    // Restart the carousel so SFRA's lazy way of updating the images doesn't cause issues with the infinite scroll
    var imageCarousel = require('./imageCarousel');
    $('.js-slider.slick-initialized').slick('unslick');

    // Update primary images
    var primaryImageUrls = response.responsiveImages;
    primaryImageUrls.forEach(function (image, idx) {
        $productContainer.find('.primary-images').find('img').eq(idx)
            .attr('src', image.normal.imageUrlDefault)
            .attr('srcset', image.small.imageUrlDefault + ' 375w, ' + image.small.imageUrlLarge + ' 750w, ' + image.normal.imageUrlDefault + ' 817w, ' + image.normal.imageUrlLarge + ' 1634w');
    });
    imageCarousel.init();
}

$(".editgift").click(function () {
    $(".freegift_link").click();
});
$(".removegift").click(function () {
    $(".freegift_link").click();
    // var url = "/on/demandware.store/Sites-KINDSnacks-Site/en_US/Cart-AddBonusProducts";
    // var queryString = "";
    // queryString += "?pids={'bonusProducts':[]}&uuid=a&pliuuid=a";
    // $.spinner().start();
    // $.ajax({
    //     url: url + queryString,
    //     method: 'POST',
    //     success: function (data) { }
    // });
});

var base = Object.assign({
    selectBonusProduct: function () {
        $(document).on('click', '.select-bonus-product', function () { //eslint-disable-line
            var productRemoved = false;
            $(this).unbind('click');
            if ($('.selected-pid').length) {
                var $selectedProducts = $('.selected-pid');
                var selectedProduct;
                for (var i = 0; i < $selectedProducts.length; i++) {
                    selectedProduct = $selectedProducts.eq(i).data('pid');
                    if (selectedProduct == $(this).data('pid')) { //eslint-disable-line
                        productRemoved = true;
                        $selectedProducts.eq(i).click();
                        $(this).removeClass('selected');
                        $(this).text('select');
                        var maxPids = $('.choose-bonus-product-dialog').data('total-qty'); //eslint-disable-line
                        if ($selectedProducts.length > 0 && selectedProduct.length != maxPids) { //eslint-disable-line
                            $(".select-bonus-product:not(.selected").removeClass("notpicked");
                            $('.add-bonus-products').text('Remove Bonus');
                        }
                        return false;
                    }
                }
            }
            if (!productRemoved) {
                var $choiceOfBonusProduct = $(this).parents('.choice-of-bonus-product');
                var pid = $(this).data('pid');
                var maxPids = $('.choose-bonus-product-dialog').data('total-qty'); //eslint-disable-line
                var submittedQty = parseInt($(this).parents('.choice-of-bonus-product').find('.bonus-quantity-select').val(), 10) || 1;
                var totalQty = 0; //eslint-disable-line
                $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
                    totalQty += $(this).data('qty'); //eslint-disable-line
                });
                totalQty += submittedQty; //eslint-disable-line
                var optionID = $(this).parents('.choice-of-bonus-product').find('.product-option').data('option-id');
                var valueId = $(this).parents('.choice-of-bonus-product').find('.options-select option:selected').data('valueId');
                if (totalQty <= maxPids) { //eslint-disable-line
                    var selectedBonusProductHtml = ''
                        + '<div style="visibility:none;" class="selected-pid row" '
                        + 'data-pid="' + pid + '"'
                        + 'data-qty="' + submittedQty + '"'
                        + 'data-optionID="' + (optionID || '') + '"'
                        + 'data-option-selected-value="' + (valueId || '') + '"'
                        + '>'
                        + '<div class="col-sm-11 col-9 bonus-product-name" >'
                        + $choiceOfBonusProduct.find('.product-name').html()
                        + '</div>'
                        + '<div class="col-1"><i class="fa fa-times" aria-hidden="true"></i></div>'
                        + '</div>'
                        ;
                    $('#chooseBonusProductModal .selected-bonus-products').append(selectedBonusProductHtml);
                    $('.pre-cart-products').html(totalQty);
                    $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
                    $(this).addClass('selected');
                    $(this).text('remove');
                    $('.add-bonus-products').text('  Add to Cart');
                    totalQty = 0;
                    $.each($('#chooseBonusProductModal .selected-bonus-products .selected-pid'), function () {
                        totalQty += $(this).data('qty');
                    });
                    if (totalQty == maxPids) { //eslint-disable-line
                        $(".select-bonus-product:not(.selected").addClass("notpicked");
                    }
                } else {
                    if ($('.bonusalert').length === 0) {
                        $(".modal-body").prepend("<div class='bonusalert alert-danger'>PLEASE REMOVE SELECTED ITEM BEFORE CHOOSING A NEW GIFT</div>");
                    }
                    $('.selected-bonus-products .bonus-summary').addClass('alert-danger');
                }
                $('.add-bonus-products').prop("disabled", false);
            }
        });
    },
    removeBonusProduct: function () {
        $(document).on('click', '.selected-pid', function () {
            $(this).remove();
            var $selected = $('#chooseBonusProductModal .selected-bonus-products .selected-pid');
            var count = 0;
            if ($selected.length) {
                $selected.each(function () {
                    var qty = $(this).data('qty') || 1;
                    count += parseInt(qty, 10);
                });
            }

            $('.pre-cart-products').html(count);
            $('.selected-bonus-products .bonus-summary').removeClass('alert-danger');
        });
    },
    enableBonusProductSelection: function () {
        $('body').on('bonusproduct:updateSelectButton', function (e, response) {
            $('button.select-bonus-product', response.$productContainer).attr('disabled',
                (!response.product.readyToOrder || !response.product.available));
            var pid = response.product.id;
            $('button.select-bonus-product').data('pid', pid);
        });
    },
    addBonusProductsToCart: function () {
        $(document).on('click', '.add-bonus-products', function () {
            var $readyToOrderBonusProducts = $('.choose-bonus-product-dialog .selected-pid');
            var queryString = '?pids=';
            var url = $('.choose-bonus-product-dialog').data('addtocarturl');
            var pidsObject = {
                bonusProducts: []
            };
            $.each($readyToOrderBonusProducts, function () {
                var qtyOption =
                    parseInt($(this)
                        .data('qty'), 10);

                var option = null;
                if (qtyOption > 0) {
                    if ($(this).data('optionid') && $(this).data('option-selected-value')) {
                        option = {};
                        option.optionId = $(this).data('optionid');
                        option.productId = $(this).data('pid');
                        option.selectedValueId = $(this).data('option-selected-value');
                    }
                    pidsObject.bonusProducts.push({
                        pid: $(this).data('pid'),
                        qty: qtyOption,
                        options: [option]
                    });
                    pidsObject.totalQty = parseInt($('.pre-cart-products').html(), 10);
                }
            });
            queryString += JSON.stringify(pidsObject);
            queryString = queryString + '&uuid=' + $('.choose-bonus-product-dialog').data('uuid');
            queryString = queryString + '&pliuuid=' + $('.choose-bonus-product-dialog').data('pliuuid');
            $.spinner().start();
            $.ajax({
                url: url + queryString,
                method: 'POST',
                success: function (data) {
                    $.spinner().stop();
                    if (data.error) {
                        $('.error-choice-of-bonus-products')
                            .html(data.errorMessage);
                    } else {
                        $('.configure-bonus-product-attributes').html(data);
                        $('.bonus-products-step2').removeClass('hidden-xl-down');
                        $('#chooseBonusProductModal').modal('hide');

                        if ($('.add-to-cart-messages').length === 0) {
                            $('body').append(
                                '<div class="add-to-cart-messages"></div>'
                            );
                        }
                        $('.minicart-quantity').html(data.totalQty);
                        if ($('.add-to-cart-messages .alert-success').length == 0) { //eslint-disable-line
                            $('.add-to-cart-messages').append(
                                '<div class="alert alert-success add-to-basket-alert text-center"'
                                + ' role="alert">'
                                + data.msgSuccess + '</div>'
                            );
                        }
                        setTimeout(function () {
                            $('.add-to-basket-alert').remove();
                            if ($('.cart-page').length) {
                                location.reload();
                            }
                        }, 3000);
                    }
                },
                error: function () {
                    $.spinner().stop();
                }
            });
        });
    }
}, baseBase);

base.methods = {
    doAddToCart: doAddToCart,
    doAddMultipleToCart: doAddMultipleToCart,
    editBonusProducts: function (data) {
        chooseBonusProducts(data);
    }
};

base.init = function () {
    // Make sure color is set as a non-swatch
    $('body').on('product:afterAttributeSelect', function (e, eData) {
        var data = eData.data;

        resetSliderImages(data, eData.container);

        if (!data.product || !data.product.variationAttributes) {
            return;
        }

        var variationAttributes = data.product.variationAttributes;
        var len = variationAttributes.length;

        for (var i = 0; i < len; i++) {
            let variation = variationAttributes[i];

            if (variation.attributeId === 'color') {
                processNonSwatchValues(variation, eData.container);

                return;
            }
        }
    });
};
base.addToCart = function () {
    // Remove doAddToCart from listener before adding it
    // This ensures it's always available where needed, but ultimately only attached to the listener once
    $(document).off('click', 'button.add-to-cart:not(.js-byob-get-started), button.add-to-cart-global', doAddToCart)
        .off('click', 'button.js-byob-get-started', doByobGetStarted)
        .on('click', 'button.add-to-cart:not(.js-byob-get-started), button.add-to-cart-global', doAddToCart)
        .on('click', 'button.js-byob-get-started', doByobGetStarted);
};

/**
 * handleVariantResponse can't truly overwritten here (without taking on too much code debt), but we can add onto it using the hook
 * Updates data not updated by default handler
 */
base.customHandleVariantResponse = function () {
    const textUtils = require('../components/textUtils');

    $('body').on('product:afterAttributeSelect', function (e, fullData) {
        var data = fullData.data;
        var $container = fullData.container;

        if (data && $container.length) {
            var productData = data.product;

            if (productData) {
                $container.find('.js-product-name').html(productData.productName);

                var $qty = $container.find('.js-qty__input');
                var $qtyLabel = $container.find('.js-qty__label');
                var $numItems = $container.find('.js-qty__num-items');

                // Clear out fields so that we don't show an old value if there's nothing that goes inside
                $qty.data('totalitemquantity', '');
                $qtyLabel.empty();
                $numItems.empty();

                // Clean up the mess created by SFRA assuming quantity field is dropdown without doing a load of overrides
                $qty.find('option').remove();

                var labelText = '';

                if (productData.totalItemQuantity) {
                    labelText = productData.totalItemQuantity;

                    if (productData.productTypeDetail) {
                        labelText += ' ' + productData.productTypeDetail;
                    }
                    if (productData.containerType) {
                        labelText += ' /' + productData.containerType;
                    }
                }
                $qtyLabel.html(labelText);

                $('.add-to-cart').attr('data-pid', productData.id);
                $('.js-product-variation-details').html(productData.detailsHtml);

                if (window.OG && window.OG.setProduct) {
                    window.OG.setProduct({
                        id: $('.product-detail').data('pid'),
                        module: $('.og-offer').data('og-module'),
                        quantity: $('.product-detail').find('.quantity-select').val()
                    });
                }

                if (productData.containerType) {
                    $numItems.html(`<span class="js-qty__num-items__container" data-container="${productData.containerType}">${$qty.val() === 1 || $qty.val() === "1" ? productData.containerType : textUtils.pluralize(productData.containerType)}</span>`);
                }
            }
        }
    });
};

base.initializeByobProduct = initializeByobProduct;
base.selectBonusProduct = selectBonusProduct;
base.removeBonusProduct = removeBonusProduct;
module.exports = base;
