/* eslint-disable no-unused-expressions */
/* eslint-disable */
'use strict';

var debounce = require('lodash/debounce');

/**
 * byobList.js
 *
 * Provides client side funtionality for interaction with a customer's BYOB
 * Product List.
 */

/* ========================================================================
 * Define Member Functions - Not invoked at page load
 * ======================================================================== */


/**
 * Displays the specified error text in an alert modal for the BYOB config page.
 *
 * @param {string} errMsg - The error message to display in the alert modal.
 * @param {JQuery} [$errorContainer] - A jQuery reference to the error messaging
 *      container to add the modal markup to.
 */
var hideBYOBListAlertTimeout = null;
var DISMISS_ALERT_TIMEOUT = 5000;
function showBYOBListAlert(errMsg, $errorContainer) {
    const $errContainer = $errorContainer || $('.js-byob-error-container');
    const genericError = $errContainer.attr('data-byob-generic-error');
    const errorMessage = errMsg.trim() !== '' ? errMsg : genericError;
    const markupString = `
        <div class="alert c-alert alert-danger c-alert--danger alert-dismissible fade show" role="alert">
            <button type="button" class="close js-byob-close-alert" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
            <span class="js-byob-error-msg">${errorMessage}</span>
        </div>`;

    $errContainer.html(markupString);
    $errContainer.removeClass('d-none');
    clearTimeout(hideBYOBListAlertTimeout);
    hideBYOBListAlertTimeout = setTimeout(function () {
        $errContainer.addClass('d-none');
    }, DISMISS_ALERT_TIMEOUT);
}

var quantityTimeout; // Variable to track the quantity timeout, so we don't have overlapping timeouts if the customer updates quickly

/**
 * Updates the display of the quantity of items in the BYOB box incrementally
 *
 * @param {integer} newQuantity - The target quantity for the list
 * @param {integer} maxTimeout - The maximum possible time between iterations
 * @param {integer} numSteps - Total number of iterations to complete
 * @param {integer} currentStep - Position in set of iterations
 */
function updateByobListQuantityDisplay(newQuantity, maxTimeout, numSteps, currentStep) {
    const $counter = $('.js-byob-list-count');
    var currentQuantity = parseInt($counter.html(), 10);
    var bellCurveSpeed = 1 - Math.pow(Math.E, -Math.pow((currentStep - (numSteps * 0.5)), 2) / (numSteps * 2.4)); // Apply a bell curve for a more appealing transition
    var nextTimeout = Math.max(Math.ceil(bellCurveSpeed * maxTimeout), 20); // The actual speed for the next iteration, should we need it.  Never goes below 20, so there's always some animation

    window.totalTime = window.totalTime || 0;
    window.totalTime += nextTimeout;
    // Prevent overlapping of timeouts
    if (quantityTimeout) {
        clearTimeout(quantityTimeout);
    }

    if (!isNaN(currentQuantity) && currentQuantity !== newQuantity) {
        if (currentQuantity < newQuantity) {
            currentQuantity++;
            $counter.html(currentQuantity);

            // If the current quanntity being displayed is still less than the quantity in box, wait and then increment again
            // Picks up speed as it goes, to reduce time waiting
            if (currentQuantity < newQuantity) {
                quantityTimeout = setTimeout(updateByobListQuantityDisplay, nextTimeout, newQuantity, maxTimeout, numSteps, currentStep + 1);
            }
        } else {
            currentQuantity--;
            $counter.html(currentQuantity);

            // If the current quanntity being displayed is still greater than the quantity in box, wait and then increment again
            // Picks up speed as it goes, to reduce time waiting
            if (currentQuantity > newQuantity) {
                quantityTimeout = setTimeout(updateByobListQuantityDisplay, nextTimeout, newQuantity, maxTimeout, numSteps, currentStep + 1);
            }
        }
    }
}

/**
 * Dynamically updates the content of the BYOB list on the page
 * Made a distinct function to be accessible regardless of the AJAX call
 *
 * @param {*} respData - The data returned from the AJAX call
 * @param {string} pid - The Product ID of the product whose quantity is being updated
 * @param {Object} $ele - jQuery object of the target element of the event
 */
function updateByobListDisplay(respData, pid, $ele) {
    const $listContainer = $('.js-byob-list-body-wrap');

    var $list = $('.js-byob-list');
    var $activeListItem = $('.c-byob-product-list__item--active');
    var activeListItemPid = $activeListItem.length ? $activeListItem.first().attr('data-itemid') : null; // Store PID of active item, so we can reactivate it

    $listContainer.empty().html(respData);

    // Reset the reference to the list.
    $list = $('.js-byob-list');

    // Keep the list items that was previously open (if any was), open
    if (activeListItemPid !== null) {
        var $newActiveListItem = $(`.js-byob-list-item[data-itemid=${activeListItemPid}]`); // Because the list was re-loaded, we need to re-get the element

        if ($newActiveListItem.length) {
            $newActiveListItem.addClass('c-byob-product-list__item--active');
        }
    }

    const curBoxQuantity = parseInt($('.js-byob-list-count').html(), 10);
    var newBoxQuantity = $listContainer.find('.js-byob-list-body').attr('data-total-quantity');

    $('.js-byob-grid').attr('data-byob-count', newBoxQuantity);


    // Call function to incrementally update display of quantity in box
    if (newBoxQuantity && !isNaN(parseInt(newBoxQuantity, 10))) {
        newBoxQuantity = parseInt(newBoxQuantity, 10);
        updateByobListQuantityDisplay(newBoxQuantity, 60, Math.abs(curBoxQuantity - newBoxQuantity), 1);

        var maxBoxQuantity = $listContainer.find('.js-byob-list-body').attr('data-max-quantity');

        if (maxBoxQuantity && !isNaN(parseInt(maxBoxQuantity, 10))) {
            maxBoxQuantity = parseInt(maxBoxQuantity, 10);

            const $innerHeader = $('.js-byob-list-header-inner');
            if (newBoxQuantity === maxBoxQuantity) {
                var mobileMenu = $('.mobile-menu--expand');
                if (mobileMenu.is(':visible')) {
                    mobileMenu.find('.js-expand-mobile-menu').click();
                }
                if (!$list.hasClass('c-byob-product-list--full')) {
                    $list.addClass('c-byob-product-list--full');
                    $innerHeader.removeClass('c-byob-product-list__header-inner--init'); // This class prevents the wipe animation from happening on load.  It can happen now that we're changing states
                }
            } else if ($list.hasClass('c-byob-product-list--full')) {
                $list.removeClass('c-byob-product-list--full');
                $innerHeader.removeClass('c-byob-product-list__header-inner--init'); // This class prevents the wipe animation from happening on load.  It can happen now that we're changing states
            }
        }
    }
}

/**
 * Shows a modal window for the user to confirm that they would like to
 * empty their BYOB box and replace it with the items in the specified combo.
 *
 * @param {JQuery} $ele - A jQuery element with data attributes for the product
 *      ID (`data-itemid`) & the URL to get the confirm modal
 *      (`data-confirmempty-url`).
 */
function showConfirmEmptyModal($ele) {
    const $modalContainer = $('.js-byob-alert');

    if ($ele.length &&
        $ele.attr('data-confirmempty-url') &&
        $modalContainer.length
    ) {
        const emptyPrompt = $ele.data('empty-prompt') || '';
        const emptyButtonText = $ele.data('empty-button-text') ? encodeURI($ele.data('empty-button-text')) : '';

        $('body').spinner().start();
        $.ajax({
            url: $ele.attr('data-confirmempty-url'),
            method: 'GET',
            data: {
                emptyButtonText: emptyButtonText,
                emptyPrompt: emptyPrompt
            }
        })
            .done(function (confirmRespData, status, xhr) {
                var respType = xhr.getResponseHeader('content-type') || '';
                // Check if the response type is JSON or HTML.
                if (respType.indexOf('html') > -1) {
                    // If response is HTML render the confirm-empty modal.
                    $modalContainer.html(confirmRespData);
                    $modalContainer.modal('show').removeClass('d-none');
                    // eslint-disable-next-line no-use-before-define
                    addConfirmEmptyHanlders($modalContainer);
                } else {
                    showBYOBListAlert(confirmRespData.errorMessage, $modalContainer);
                }
            })
            .fail(function (err) {
                showBYOBListAlert(err.message ||
                    $modalContainer.attr('data-byob-generic-error'),
                    $modalContainer);
            })
            .always(function () {
                $('body').spinner().stop();
            });
    }
}

function addOrRemoveBlueColor(action) {
    const myBoxTitleWrap = $('.js-byob-list-header-inner');
    const myBoxTitle = myBoxTitleWrap.find(".js-byob-list-title");

    if (action) {
        myBoxTitle.text(myBoxTitle.data('box-full-label'));
        myBoxTitleWrap.addClass('active-blue--color');
    } else {
        myBoxTitle.text(myBoxTitle.data('box-default-label'));
        myBoxTitleWrap.removeClass('active-blue--color');
    }
}

/**
 * Calls the specified URL to add the starter combo to the list and redirect the
 * user to the BYOB category page on success.
 *
 * @param {string} url - The URL for adding the product to the BYOB ProductList.
 * @param {Function} cb - Callback after successfull adding of starter combo
 */
function addStarterCombo(url, cb) {
    const $alertContainer = $('.js-byob-alert');
    const $modalContainer = $('.js-byob-combo-container');
    const errMsg = $modalContainer.length &&
        $modalContainer.attr('data-byob-generic-error') ?
        $modalContainer.attr('data-byob-generic-error') :
        'Sorry, an error occurred while adding the starter combo to your box.';
    $.ajax({
        url: url,
        method: 'GET',
        data: {
            isAjax: true
        }
    })
    .done(function (addRespData, status, xhr) {
        var respType = xhr.getResponseHeader('content-type') || '';
        const dataGTMpush = $(addRespData).find('#js-gtm-push');

        if (dataGTMpush) {
            $('body').append(dataGTMpush);
        }

        if (cb) {
            cb();
        }
        if (respType.indexOf('html') > -1) {
            updateByobListDisplay(addRespData);
        } else {
            showBYOBListAlert(errMsg, $alertContainer);
        }
    })
    .fail(function (err) {
        showBYOBListAlert(errMsg, $alertContainer);
    });
}

/**
 * Handler for the quantity fields for BYOB line items in the
 * customer's box. The listener makes Ajax calls to BYOB-List to update the
 * quantity in the ProductList instance.
 *
 * @returns {boolean} Whether or not to continue with events
 */
function doQuantityChange() {
    const $this = $(this);
    let $list = $('.js-byob-list');
    let $productTile = $this.closest('.js-product-tile');
    const $qtyInput = $this.closest('.js-qty').find('input[name=Quantity]');
    const $errorContainer = $('.js-byob-error-container');
    const url = $list.attr('data-byob-list-url');
    var $byobLI = $this.closest('.js-byob-list-item');
    var maxQuantity = $qtyInput.attr('max');
    var minQuantity = $qtyInput.attr('min');
    var qty = parseInt($qtyInput.val(), 10);

    const gtmUpdate = $this.attr('data-gtm-update');

    if (isNaN(qty)) {
        qty = 0;
    }
    if ($this.closest('.js-qty').hasClass('c-qty__add-to-box-btn--enabled')) {
        $this.closest('.js-qty').removeClass('c-qty__add-to-box-btn--enabled');
    }

    if ($this.hasClass('js-byob-qty__btn')) {
        qty += parseInt($this.val(), 10);
    }

    if (minQuantity && !isNaN(parseInt(minQuantity, 10))) {
        minQuantity = parseInt(minQuantity, 10);
    } else {
        minQuantity = 1;
    }

    // Prevent users from going too low if they click fast enough
    if (qty < 0) {
        return false;
    }

    if (qty > maxQuantity) {
        qty = parseInt(maxQuantity, 10);
    }

    // if (qty < minQuantity) {
    //     qty = minQuantity;
    // }

    const generalErrorMsg = $list.attr('data-errormessage');

    // Get the product ID from either the parent container, either a
    // product tile, or a BYOB list item.
    let pid = $productTile.length ? $productTile.attr('data-itemid') :
        $byobLI.attr('data-itemid');

    // Get the current quantity to reset on server error.
    var currentQuantity = $byobLI.length ?
        $byobLI.attr('data-quantity') :
        $productTile.attr('data-quantity');

    if (isNaN(qty)) {
        qty = minQuantity;
        $qtyInput.val(qty); // If field is cleared set it to minimum
    }

    if (qty <= 0) {
        // Trigger removal if item quantity has changed to none
        if (qty !== currentQuantity) {
            $byobLI = $byobLI.length ? $byobLI : $(`.js-byob-list-item[data-itemid=${pid}]`);

            if ($byobLI.length) {
                const $removeBtn = $byobLI.find('.js-byob-remove-item');

                if ($removeBtn.length) {
                    $qtyInput.val(currentQuantity); // In case the user cancels out, set quantity back to what it was.  If they don't, will get re-zeroed
                    $removeBtn.trigger('click');
                }
            }
        }
        return false;
    }

    $.ajax({
        url: url,
        data: {
            action: 'update',
            gtmAction: gtmUpdate,
            isAjax: true,
            update: JSON.stringify({
                items: [{
                    pid: pid,
                    quantity: qty
                }]
            })
        }
    })
        .done(function (respData, status, xhr) {
            var respType = xhr.getResponseHeader('content-type') || '';

            // Check if the response type is JSON or HTML.
            if (respType.indexOf('html') > -1) {
                if (qty > 0 && !$productTile.hasClass('c-byob-product-tile--active')) {
                    $productTile.addClass('c-byob-product-tile--active');
                } else if (qty <= 0 && $productTile.hasClass('c-byob-product-tile--active')) {
                    $productTile.removeClass('c-byob-product-tile--active');
                }

                // If the returned type is HTML, update the BYOB list with
                // the returned markup
                updateByobListDisplay(respData, pid, $this);
                // Trigger event for updating quantities of search grid.
                $('body').trigger(
                    'byob:updateList',
                    { pid: pid, qty: qty }
                );
            } else if (respData.error && respData.errorMessage) {
                // Make sure currentQuantity is up-to-date.  Prevents race conditions
                currentQuantity = $byobLI.length ?
                    $byobLI.attr('data-quantity') :
                    $productTile.attr('data-quantity');

                // Set the input & data attribute back to original value.
                $productTile.attr('data-quantity', currentQuantity);
                $qtyInput.val(currentQuantity);
                showBYOBListAlert(respData.errorMessage, $errorContainer);
            } else {
                // Make sure currentQuantity is up-to-date.  Prevents race conditions
                currentQuantity = $byobLI.length ?
                    $byobLI.attr('data-quantity') :
                    $productTile.attr('data-quantity');

                // Set the input & data attribute back to original value.
                $qtyInput.val(currentQuantity);
                $productTile.attr('data-quantity', currentQuantity);
                showBYOBListAlert(generalErrorMsg, $errorContainer);
            }
        })
        .fail(function (err) {
            // Set the input & data attribute back to original value.
            $qtyInput.val(currentQuantity);
            $productTile.attr('data-quantity', currentQuantity);

            // If an error message was returned then show the message.
            if ('responseJSON' in err) {
                showBYOBListAlert(err.responseJSON.message, $errorContainer);
            } else {
                showBYOBListAlert(generalErrorMsg, $errorContainer);
            }
        }).always(function () {
            var totalItemsInSession = 0;
            $('.js-byob-list-body .js-byob-list-item .js-byob-qty__input').each(function (index, el) {
                totalItemsInSession += parseInt($(this).val(), 10);
            });
            addOrRemoveBlueColor(totalItemsInSession === parseInt(maxQuantity, 10));
            $('body').trigger('byob:afterQuantityChange');
        });
    return true;
}

/**
 * Adds a listener for the continue action of the Confirm-Empty modal window
 * that asks the user to confirm emptying their current BYOB box.
 *
 * @param {JQuery} $modalContainer - The container element of the modal.
 */
function addConfirmEmptyHanlders($modalContainer) {
    /**
     * Click handler method for confirmation to empty box.
     */
    $modalContainer.on('click.byob', '.js-byob-confirm-empty', function (e) {
        // Remove the click handler.
        $modalContainer.off('click.byob');
        $modalContainer.modal('hide');
        $modalContainer.addClass('d-none');
        $modalContainer.html('');

        const $this = $(this);
        const $tileContainer = $('.js-byob-grid');
        const removeItemsUrl = $this.attr('data-remove-url');
        const addItemUrl = $this.attr('data-add-url');
        const isStarterCombo = $(this).attr('data-is-starter-combo');
        const moveForwardUrl = $('.js-combo-tiles-add-button');
        addOrRemoveBlueColor(false);
        // Start the progress indicator
        $('body').spinner().start();
        if ($tileContainer.length) {
            const errMsg = $tileContainer.attr('data-byob-generic-error');

            // First call to clear existing items.
            $.ajax({
                url: removeItemsUrl,
                method: 'GET'
            })
                .done(function (resetRespData, status, xhr) {
                    if (!resetRespData.error) {
                        // If items were successfully removed, add the starter combo.
                        if (isStarterCombo === true || isStarterCombo === "true") {
                            addStarterCombo(addItemUrl, function () {
                                window.location.href = moveForwardUrl.attr('href');
                            });
                        } else {
                            var respType = xhr.getResponseHeader('content-type') || '';

                            // Check if the response type is JSON or HTML.
                            if (respType.indexOf('html') > -1) {
                                updateByobListDisplay(resetRespData);
                            }

                            $('body').spinner().stop();
                        }
                    } else {
                        showBYOBListAlert(resetRespData.errorMessage, $modalContainer);
                        $('body').spinner().stop();
                    }
                })
                .fail(function (err) {
                    showBYOBListAlert(errMsg, $modalContainer);
                    $('body').spinner().stop();
                });
        } else {
            showBYOBListAlert('Unable to remove items from your ' +
                'box due to a technical error', $modalContainer);
            $('body').spinner().stop();
        }
    });

    /**
     * Click handler method to cancel overwritting of existing basket items.
     */
    $modalContainer.on('click.byob', '.js-byob-close-alert', function (e) {
        // Remove the click handler & clear modal.
        $modalContainer.off('click.byob');
        $modalContainer.modal('hide');
        $modalContainer.addClass('d-none');
        $modalContainer.html('');
    });
}

var debouncedDoQuantityChange = debounce(doQuantityChange, 1000);

// Allows the applied debounced quantity change to be referenced and thus easily added to and removed from event listeners
function debouncedDoQuantityChangeApplier() {
    debouncedDoQuantityChange.apply(this);
}

/**
 * Manually set the frequency for OG.
 * Needed for BYOB products
 *
 * @param {string} boxSku - SKU of the box added to the cart
 */
function setOgProduct(boxSku) {
    if (window.OG && window.OG.setProduct && boxSku) {
        var $ogOffer = $('.og-offer');

        if ($ogOffer.length) {
            window.OG.setProduct({
                id: boxSku,
                module: $ogOffer.attr('data-og-module'),
                quantity: 1 // Quantity always 1 for BYOB
            });
        }
    }
}

/**
 * Caching can cause BYOB tiles to incorrectly display as active/not active
 * Make sure what's displayed matches the actual BYOB list
 */
function initializeByobTileQty() {
    $('.js-product-tile--uninitialized').each(function (i, ele) {
        var $input = $(ele).find('.js-byob-qty__input');

        if ($input.val() <= 0 && $(ele).hasClass('c-byob-product-tile--active')) {
            $(ele).removeClass('c-byob-product-tile--active');
            $(ele).attr('data-quantity', $input.val());
        } else if ($input.val() > 0 && !$(ele).hasClass('c-byob-product-tile--active')) {
            $(ele).addClass('c-byob-product-tile--active');
            $(ele).attr('data-quantity', $input.val());
        }

        $(ele).removeClass('js-product-tile--uninitialized'); // Serves as a way to know which tiles we've already initialized, so we don't was computation hitting them again
    });
}

module.exports = {
    methods: {
        addConfirmEmptyHanlders: addConfirmEmptyHanlders,
        addStarterCombo: addStarterCombo,
        doQuantityChange: doQuantityChange,
        initializeByobTileQty: initializeByobTileQty,
        setOgProduct: setOgProduct,
        showConfirmEmptyModal: showConfirmEmptyModal,
        showBYOBListAlert: showBYOBListAlert,
        updateByobListQuantityDisplay: updateByobListQuantityDisplay,
    },

    /* ========================================================================
     * Define Exported Functions
     * ======================================================================== */

    /**
     * Adds a listener to the empty/remove confirmation buttons on the BYOB grid modals
     * Handles the data and display of removing a product or products from the list
     */
    handleByobGridEmptyConfirmation: function () {
        /**
         * Click handler method for confirmation to empty box.
         */
        $('body').on('click.byob', '.js-byob-confirm-empty', function (e) {
            const $this = $(this);
            const $tileContainer = $('.js-byob-grid');
            const pids = JSON.parse($(this).attr('data-pids'));
            const removeItemsUrl = $this.attr('data-remove-url');

            // Start the progress indicator
            $('body').spinner().start();
            if ($tileContainer.length) {
                const errMsg = $tileContainer.attr('data-byob-generic-error');

                // First call to clear existing items.
                $.ajax({
                    url: removeItemsUrl,
                    method: 'GET'
                })
                    .done(function (resetRespData, status, xhr) {
                        if (!resetRespData.error) {
                            var respType = xhr.getResponseHeader('content-type') || '';

                            // Check if the response type is JSON or HTML.
                            if (respType.indexOf('html') > -1) {
                                updateByobListDisplay(resetRespData);
                            }

                            if (pids.length) {
                                pids.forEach(function (pid) {
                                    var $itemTile = $(`.js-product-tile[data-itemid=${pid}]`);

                                    if ($itemTile.length) {
                                        $itemTile.removeClass('c-byob-product-tile--active');
                                    }

                                    $itemTile.find('.js-qty').addClass('c-qty__add-to-box-btn--enabled');

                                    $('body').trigger(
                                        'byob:updateList',
                                        { pid: pid, qty: 0 }
                                    );
                                });
                            }
                            addOrRemoveBlueColor(false);
                            $('body').spinner().stop();
                            $this.closest('.js-byob-list-modal').modal('hide');
                        } else {
                            showBYOBListAlert(resetRespData.errorMessage, $this);
                            $('body').spinner().stop();
                        }
                    })
                    .fail(function (err) {
                        showBYOBListAlert(errMsg, $this);
                        $('body').spinner().stop();
                    });
            } else {
                showBYOBListAlert('Unable to remove items from your ' +
                    'box due to a technical error', $this);
                $('body').spinner().stop();
            }
        });

        /**
         * Click handler method to cancel overwritting of existing basket items.
         */
        $('body').on('click.byob', '.js-byob-close-alert', function (e) {
            $(this).closest('.js-byob-list-modal').modal('hide');
        });
    },

    /**
     * Caching can cause BYOB tiles to incorrectly display as active/not active
     * Make sure what's displayed matches the actual BYOB list
     */
    setupInitializeByobTileQty() {
        const baseObj = this;

        let scopedInitializeByobTileQty = initializeByobTileQty;

        if (baseObj && baseObj.methods && baseObj.methods.initializeByobTileQty) {
            scopedInitializeByobTileQty = baseObj.methods.initializeByobTileQty;
        }

        scopedInitializeByobTileQty();
        $('body').on('gtm:reinit', scopedInitializeByobTileQty);
        $('body').on('byobCategoryNav-update', scopedInitializeByobTileQty);
    },

    /**
     * When an empty/remove modal is shown, pass data along from the button that opened it to the action button
     */
    onShowEmptyRemoveModal: function () {
        $('.js-byob-list-modal').on('shown.bs.modal', function (e) {
            var $triggerBtn = $(e.relatedTarget);
            var $emptyBtn = $(this).find('.js-byob-confirm-empty');
            $emptyBtn.attr('data-pids', $triggerBtn.attr('data-pids'));
            var message = 'Remove ' + $triggerBtn.attr('data-aria-label');
            $('#dialog-heading').html(message);
        });
    },
    /**
     * When the remove item modal specifically is show, update its remove-url data attribute to use the product's pid
     */
    onShowRemoveItemModal: function () {
        $('#byob-list-remove-modal').on('shown.bs.modal', function (e) {
            var $triggerBtn = $(e.relatedTarget);
            var $emptyBtn = $(this).find('.js-byob-confirm-empty');
            $emptyBtn.attr('data-remove-url', $triggerBtn.attr('data-remove-url'));
            
        });
    },

    /**
     * Binds a function to handle the closing of any error alerts created with
     * the `showBYOBListAlert()` method.
     */
    onCloseAlert: function () {
        const $errContainer = $('.js-byob-error-container');
        $('body').on('click', '.js-byob-close-alert', function (e) {
            $errContainer.addClass('d-none');
            $errContainer.html('');
        });
    },

    /**
     * Functions to run on page load
     *
     * Sets OG product on load so we don't have to wait on it when adding the box to the cart
     */
    onListStart: function () {
        if ($('.js-byob-list').length) {
            const $ogOffer = $('.og-offer');

            if ($ogOffer.length) {
                const boxId = $ogOffer.attr('data-og-pid');

                setOgProduct(boxId);
            }
        }
        var $_GET = [];
        window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (a, name, value) { $_GET[name] = value; });
        if ($_GET["combo"]) { // eslint-disable-line
            $.ajax({
                url: "./byoblist?action=removeall&isAjax=true",
                method: 'GET'
            }).done(function () {
                var last2 = $_GET["combo"].slice(-2); // eslint-disable-line
                addStarterCombo("./byoblist?action=add&update=%7b%22" + $_GET["combo"] + "%22%3a%7b%22quantity%22%3a1%7d%7d"); // eslint-disable-line
            });
        }
    },

    /**
     * Binds a function to update the quantities in the product grid with  any
     * changes to the BYOB list when an updated list is returned from the server.
     *
     * @listens byob:updateList - Fired when the BYOB list is updated from the
     *      server with an Ajax call. This can be used to udpate the quantities,
     *      and any other changed display attributes for the products in the
     *      search grid.
     */
    onListUpdate: function () {
        $('body').on('byob:updateList', function (context, eventData) {
            const $updateMe = $("[data-itemid='" + eventData.pid + "']");

            var maxBoxQuantity = $('.js-byob-list-body').attr('data-max-quantity');
            var totalInBox = $('.js-byob-list-body').attr('data-total-quantity');

            if (maxBoxQuantity && !isNaN(parseInt(maxBoxQuantity, 10))) {
                maxBoxQuantity = parseInt(maxBoxQuantity, 10);
            }
            if (totalInBox && !isNaN(parseInt(totalInBox, 10))) {
                totalInBox = parseInt(totalInBox, 10);
            }

            // $updateMe has a length of zero if none of the products are in the current category.  This needs to happen regardless
            // Run before loop so that we can still disable individual incrementers if need be
            if (maxBoxQuantity && !isNaN(parseInt(maxBoxQuantity, 10)) && totalInBox && !isNaN(parseInt(totalInBox, 10)) && maxBoxQuantity === totalInBox) {
                $('.js-byob-grid .js-qty__btn--increase, .js-byob-list .js-qty__btn--increase').attr('disabled', true);
            } else {
                $('.js-byob-grid .js-qty__btn--increase, .js-byob-list .js-qty__btn--increase').removeAttr('disabled');
            }

            // Loop through the list items in the returned byobList template
            // markup to find the ids of the items in the list. These are used
            // to update the quantities of the items in the product grid.
            if ($updateMe.length) {
                // Loop through the byob list items.
                $.each($updateMe, function (index, listItem) {
                    const $el = $(listItem);
                    const max = $el.find('.js-byob-qty__input').attr('max');
                    const qty = eventData.qty;
                    $el.find('.js-byob-qty__input').val(qty);
                    $el.attr('data-quantity', qty);
                    var minQuantity = $el.find('.js-byob-qty__input').attr('min');

                    if (minQuantity && !isNaN(parseInt(minQuantity, 10))) {
                        minQuantity = parseInt(minQuantity, 10);
                    } else {
                        minQuantity = 1;
                    }

                    // Disable increment buttons when the value can't go lower or higher, as appropriate
                    if (qty <= 0) {
                        $el.find('.js-qty__btn--decrease').attr('disabled', true);
                    } else {
                        $el.find('.js-qty__btn--decrease').removeAttr('disabled');
                    }

                    if (!isNaN(max) && qty >= max) {
                        if (!$el.hasClass('c-byob-product-tile--max-stock')) {
                            $el.find('.js-qty__btn--increase').attr('disabled', true);
                        }
                    }
                });
            }

            var workingElement = $('.c-byob-product-list').find("[data-itemid=" + eventData.pid + "]");
            if (workingElement.length) {
                if (navigator.userAgent.match(/(iPod|iPhone|iPad|Android)/)) {
                    setTimeout(function () {
                        $('.c-byob-product-list__body-inner').scrollTop(workingElement.position().top - 100);
                    }, 500);
                } else {
                    $('.c-byob-product-list__body').animate({ scrollTop: workingElement.position().top - 100 }, 500);
                }

                // add blink effect for better UX
                workingElement.addClass('blink');
                workingElement.find('.c-byob-product-list__item__action').addClass('blink');
                workingElement.find('.c-byob-product-list__item__action input').addClass('blink');

                setTimeout(function () {
                    workingElement.removeClass('blink');
                    workingElement.find('.c-byob-product-list__item__action').removeClass('blink');
                    workingElement.find('.c-byob-product-list__item__action input').removeClass('blink');
                }, 2000);
            }
        });
    },

    /**
     * Binds handlers to the BYOB List quantity fields to update the quantities in the list via AJAX
     */
    onQuantityChange: function () {
        $('body').on('click',
            '.js-byob-list .js-byob-qty__btn, .c-search-byob__results .js-byob-qty__btn', function (e) {
                // If an update is not made, prevent the rest of the events (ie. the quantity change) from happening
                if (doQuantityChange.apply(this) === false) {
                    e.stopImmediatePropagation();
                }
            });
        $('body').on('input',
            '.js-byob-list .js-byob-qty__input, .c-search-byob__results .js-byob-qty__input', debouncedDoQuantityChangeApplier);

        $('body').on('focusout', '.js-byob-list .js-byob-qty__input, .c-search-byob__results .js-byob-qty__input', doQuantityChange);
    },

    /**
     * Binds an event handler function to the click event of the BYOB starter
     * combo product tiles. When this is clicked, the current BYOB list is
     * updated, or a new one is created.
     */
    onBYOBListStarterComboSelected: function () {
        $('body').on('click', '.js-byob-starter-combo-init', function (e) {
            const $this = $(this);
            const $tile = $this.closest('.js-byob-combo-tile');
            const $tileContainer = $this.closest('.js-byob-combo-container');
            const urlBtn = $('.js-combo-tiles-add-button');

            if ($tile.length &&
                $tile.attr('data-itemid') &&
                $tile.attr('data-addtolist-url') &&
                $tileContainer.length &&
                typeof $tileContainer.attr('data-byob-count') !== 'undefined'
            ) {
                const attrVal = $tileContainer.attr('data-byob-count');
                const count = parseInt(attrVal, 10);
                if (!isNaN(count) && count > 0) {
                    // If the BYOB list is NOT empty, then show the modal to
                    // confirm removing the current list items.
                    showConfirmEmptyModal($tile);
                } else {
                    // If the BYOB list is empty, then just add the combo and redirect to the PLP.
                    $('body').spinner().start();
                    addStarterCombo($tile.attr('data-addtolist-url'), function () {
                        window.location.href = urlBtn.attr('href');
                    });
                }
            }
        });
    },

    /**
     * Binds an event handler function for expanding and hiding the BYOB list
     * to the click event of the list header bar's expand/collapse icon.
     */
    onToggleList: function () {
        $('body').on('click', '.buttontog', function (e) {
            if (window.location.href.indexOf("?cgid=byob") <= 0) {
                window.location.href = "search?cgid=byob";
            }
        });
        $('body').on('click', '.buttontog', function (e) {
            if (window.location.href.indexOf("?cgid=byob") <= 0) {
                window.location.href = "search?cgid=byob";
            }
        });
        $('body').on('click', '.buttontog', function (e) {
            if (window.location.href.indexOf("?cgid=byob") <= 0) {
                window.location.href = "search?cgid=byob";
            }
        });
        $('body').on('click', '.buttontog', function (e) {
            if (window.location.href.indexOf("?cgid=byob") <= 0) {
                window.location.href = "search?cgid=byob";
            }
        });
        $('body').on('click', '.buttontog', function (e) {
            if (window.location.href.indexOf("?cgid=byob") <= 0) {
                window.location.href = "search?cgid=byob";
            }
        });
    },

    onScrollList: function () {
        $('body').scroll(function () {
            var y = $(this).scrollTop();
            if (y > 100) {
                $('.js-scroll-to-top').fadeIn();
            } else {
                $('.js-scroll-to-top').fadeOut();
            }
        });
    },

    expandMobileMenuOnPageLoad: function () {
        if (!$('.byob-page').length) {
            return;
        }

        const $listContainer = $('.js-byob-list-body-wrap');
        const mobileMenu = $('.mobile-menu--expand');

        var curBoxQuantity = parseInt($('.js-byob-list-count').html(), 10);
        var maxBoxQuantity = parseInt($listContainer.find('.js-byob-list-body').attr('data-max-quantity'), 10);

        if (mobileMenu.is(':visible') && curBoxQuantity === maxBoxQuantity) {
            $(".c-byob-product-list").addClass('c-byob-product-list--opened');
            $('.modal-background').show();
            $(".mobile-menu--expand").hide();
        }
    },

    addToCartGlobalStartSpinner: function () {
        $('body').on('click', '.add-to-cart-global', function (e) {
            $('body').spinner().start();
        });
    },
    expandMobileMenu: function () {
        $("body").on("click", ".js-expand-mobile-menu", function (e) {
            $(".c-byob-product-list").addClass('c-byob-product-list--opened');
            $("body").addClass("hide-overflow");
            $('.modal-background').show();
            $(".mobile-menu--expand").hide();
            $('.refinement-bar').hide();
            $(".modal-background").removeClass('transparent').hide();
            $('.c-search-byob__results').removeClass('byob-filter-shown');
        });
    },

    hideMobileMenu: function () {
        $(document).on("click", '.js-byob-list-toggle', function (e) {
            $(".c-byob-product-list").removeClass('c-byob-product-list--opened');
            $(".mobile-menu--expand").show();
            $("body").removeClass("hide-overflow");
            $('.modal-background').hide();
        });
    },

    hideMenuOnOverlayClick: function () {
        $(document).on("click", '.modal-background', function (e) {
            $(".c-byob-product-list").removeClass('c-byob-product-list--opened');
            $(".mobile-menu--expand").show();
            $('.modal-background').hide();
        });
    },

    scaleBoxSizeTo40: function () {
        $('body').on('click', '.js-scale-boxsize-to-40', function (e) {
            e.preventDefault();

            var closeMobileMenu = $('.js-close-mobile-menu');
            closeMobileMenu.is(":visible") && closeMobileMenu.click();

            const scaleBoxSizeBtn = $(this);
            var scaleBoxSizeUrl = scaleBoxSizeBtn.attr('data-surl');

            var form = {
                every: scaleBoxSizeBtn.attr('data-every'),
                everyPeriod: scaleBoxSizeBtn.attr('data-period'),
                pid: scaleBoxSizeBtn.attr('data-og-box-sku'),
                mode: 'scale'
            };

            $.spinner().start();

            if (scaleBoxSizeUrl) {
                $.ajax({
                    url: scaleBoxSizeUrl,
                    method: "POST",
                    data: form,
                    success: function (data) {
                        if (data.forwardUrl) {
                            window.location = data.forwardUrl;
                        }
                    },
                    error: function () {
                        $.spinner().stop();
                    }
                });
            }
        });
    },
    boxWidth: function () {
        var parentRow = ".c-byob-redesign--try-wrap .row";
        var numberOfChildren = $(parentRow).children().length;
        $(parentRow).addClass("c-byob-redesign--try-wrap__" + numberOfChildren + "-children");
    },
    addToCartFromModal: function () {
        $("body").on("click", ".js-add-to-cart-modal", function (e) {
            $('*[data-item-pid="' + $(this).attr('data-pid') + '"]').click();

            var modalDialog = $(this).closest('.st-modal-quickview__dialog');
            modalDialog.find('.st-modal-quickview__header__close').click();
        });
    }
};
