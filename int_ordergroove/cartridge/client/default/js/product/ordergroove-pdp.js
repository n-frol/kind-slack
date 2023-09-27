"use strict";

var impulseUpsellIds = [
    "6b6943d6d92f11e88428bc764e106cf4",
    "89f9a6f8092a11e9ba79bc764e101db1",
];

function setVisibilityInline(el, mode) {
    el.attr("style", "display: " + mode + " !important");
}

function setEveryPeriod(subscription) {
    var splitedSubscription = subscription.split("_");
    $(".js-byob-get-choose-variant").attr("data-og-every", splitedSubscription[0]);
    $(".js-byob-get-choose-variant").attr("data-og-every-period", splitedSubscription[1]);
}

function setBorder(el) {
    var productDetailsDOM = el
        .closest(".product-detail")
        .find(".c-product-details__image-border");

    $(".product-detail")
        .find(".c-product-details__image-border")
        .removeClass("c-product-details__image-selected");
    productDetailsDOM.addClass("c-product-details__image-selected");
}
function setPidOnUrlAndEnableBtn(pid) {
    var atcBtn = $(".js-byob-get-choose-variant");

    atcBtn.prop("disabled", false);

    atcBtn.attr("data-pid", pid);
}

function getAddToCartUrl() {
    return $(".js-byob-get-started-url").attr("data-url");
}

function getOptions($productContainer) {
    var options = $productContainer
        .find(".product-option")
        .map(function () {
            var $elOption = $(this).find(".options-select");
            var urlValue = $elOption.val();
            var selectedValueId = $elOption
                .find('option[value="' + urlValue + '"]')
                .data("value-id");
            return {
                optionId: $(this).data("option-id"),
                selectedValueId: selectedValueId,
            };
        })
        .toArray();
    return JSON.stringify(options);
}

function setOptionsAndSendReq(obj) {
    var $this = obj;
    var addToCartUrl;
    var pid;

    // If we're showing the confirm empty dialog, don't continue with this action
    if ($this.attr("data-show-confirm-empty-dialog") === "true") {
        return;
    }
    pid = $this.attr("data-pid");
    var $productContainer = $(".js-MBYOB-variant-" + pid);
    if (!$productContainer.length) {
        $productContainer = $this
            .closest(".quick-view-dialog")
            .find(".product-detail");
    }

    addToCartUrl = getAddToCartUrl();

    var form = {
        every: $this.attr("data-og-every") || 0,
        everyPeriod: $this.attr("data-og-every-period") || 0,
        pid: pid,
        mode: 'add'
    };

    if (!$(".bundle-item").length) {
        form.options = getOptions($productContainer);
    }

    if (addToCartUrl) {
        $.ajax({
            url: addToCartUrl,
            method: "POST",
            data: form,
            success: function (data) {
                if (data.forwardUrl) {
                    window.location = data.forwardUrl;
                }
            },
            error: function () {
                $.spinner().stop();
            },
        });
    }
}

module.exports = {
    setPricing: function () {
        $(".og-offer").ready(function () {
            if (window.OG && window.OG.listen) {
                window.OG.listen("offerLoaded", function (data) {
                    if (
                        data.offerInfo.module === "pdp" ||
                        data.offerInfo.module === "pdp_snackpack"
                    ) {
                        const offerId = data.offerInfo
                            ? data.offerInfo.offerId
                            : "";
                        const isImpulseUpsell =
                            impulseUpsellIds.indexOf(offerId) > -1;
                        console.log(
                            "offerId",
                            offerId,
                            "isImpulseUpsell",
                            isImpulseUpsell
                        );
                        if ($(".og-iu").is("*")) {
                            var isQuickview = $("#quickViewModal").is(
                                ":visible"
                            );
                            var targetDiv = $(".st-pdp-main__section--details");
                            if (isQuickview) {
                                var targetDiv = $(
                                    "#quickViewModal .st-product-quickview-main__section--details"
                                );
                            }
                            targetDiv
                                .find(".js-add-to-cart")
                                .addClass(
                                    "c-product-add-to-cart--impulse-upsell"
                                );
                            targetDiv
                                .find(".js-upsell-container")
                                .addClass("d-none");
                            var upsellMarkup = targetDiv
                                .find(".js-upsell-container")
                                .clone();
                            targetDiv
                                .find(".impulseUpsellContainer")
                                .append(upsellMarkup);
                            targetDiv
                                .find(
                                    ".impulseUpsellContainer .js-upsell-container"
                                )
                                .removeClass("d-none");

                            targetDiv
                                .find(".js-og-pricing")
                                .addClass(
                                    "c-ordergroove-pricing--impulse-upsell"
                                );
                            targetDiv
                                .find(".js-list-price--ad-hoc")
                                .appendTo(
                                    ".js-og-pricing--ad-hoc .js-og-pricing__ad-hoc"
                                );
                            targetDiv
                                .find(".js-list-price--sales")
                                .appendTo(
                                    ".js-og-pricing--ad-hoc .js-og-pricing__ad-hoc"
                                );
                            targetDiv
                                .find(".js-list-price--ad-hoc__callout")
                                .appendTo(
                                    ".js-og-pricing--ad-hoc .js-og-pricing__ad-hoc"
                                )
                                .removeClass("d-none");
                        }
                        $(".prices").spinner().stop();
                    }
                });
            }
        });
    },
    setProduct: function () {
        $(".og-offer").ready(function () {
            if (window.OG && window.OG.setProduct) {
                window.OG.setProduct({
                    id: $(".product-detail").data("pid"),
                    module: $(".og-offer").data("og-module"),
                    quantity: $(".product-detail")
                        .find(".quantity-select")
                        .val(),
                });
            }
        });
    },
    setQuantity: function () {
        $(document).on("change", ".quantity-select", function (e) {
            e.preventDefault();
            if (window.OG && window.OG.setQuantity) {
                window.OG.setQuantity({
                    id: $(".product-detail").data("pid"),
                    module: $(".og-offer").data("og-module"),
                    quantity: $(this).val(),
                });
            }
        });
    },
    updateCart: function () {
        $("body").on("product:afterAddToCart", function (e, data) {
            if (window.OG && window.OG.updateCart) {
                window.OG.updateCart({
                    id: $(".product-detail").data("pid"),
                    module: $(".og-offer").data("og-module"),
                    quantity: $(".product-detail")
                        .find(".quantity-select")
                        .val(),
                });
            }
        });
    },
    showOfferDetails: function () {
        $(document).on("click", ".og-on-radio", function (e) {
            setVisibilityInline($(".og-byob-details"), "none");
            $(this).parent().parent().find(".og-byob-details").show();
        });
    },
    hideOfferDetails: function () {
        $(document).on("click", ".og-off-radio", function (e) {
            setVisibilityInline($(".og-byob-details"), "none");
        });
    },
    showDetailsTooltip: function () {
        $(document).on("click", ".og-tooltip-trigger", function (e) {
            var byobDetailsTooltip = $(this)
                .parent()
                .find(".js-byob-og-tooltip");
            var byobDetailsPointer = $(this)
                .parent()
                .find(".js-byob-og-tooltip-pointer");

            setVisibilityInline(byobDetailsTooltip, "block");
            setVisibilityInline(byobDetailsPointer, "block");

            var dismissHandler = function () {
                setVisibilityInline(byobDetailsTooltip, "none");
                setVisibilityInline(byobDetailsPointer, "none");

                $(document).off("click", dismissHandler);
            };

            $(document).on("click", dismissHandler);
        });
    },
    setSelectedProduct: function () {
        $(document).on("click", ".js-product-variant-og-on-selected", function (e) {
            var id = $(this)[0].dataset.id;

            var subscription = "0_0";
            if (parseInt($(this).val()) !== 0) {
                subscription = $(this)
                    .closest(".js-og-option-row")
                    .find("[name=byob-frequency]")
                    .val();
            }

            setEveryPeriod(subscription);
            setPidOnUrlAndEnableBtn(id);
            setBorder($(this));
        });
    },

    setDefaultProduct: function () {
        $('.pdpbyob-add-to-cart').ready(function () {
            var ATCbtnPidAttr = $('.pdpbyob-add-to-cart').attr('data-pid');
            if (ATCbtnPidAttr != '') {
                return;
            }

            $('.js-one-time-offer').first().click();
        })
    },

    setSelectedProductOnImageSelect: function() {
        $(document).on("click", ".js-select-this-product", function (e) {
            var $this = $(this);
            $this.closest('.js-top-byob').find('.js-one-time-offer').click();
        });
        var $selectedVariation = $(".js-product-variant-og-on-selected:checked");
        if($selectedVariation.length) {
            var $optionsContainer = $selectedVariation.closest(".js-top-byob");
            if($optionsContainer.find(".disable-pdp-options-add-to-cart").length) {
                $(".js-byob-get-choose-variant").attr("disabled", true);
            } else {
                $optionsContainer.find(".js-select-this-product").addClass("c-product-details__image-selected");
            }
        } else {
            $(".js-byob-get-choose-variant").attr("disabled", true);
        }
    },
    setSelectedProductOnLabelSelect: function() {
        $(document).on("click", ".js-on-label", function (e) {
            var $this = $(this);
            $this.closest('.js-og-option').find('.js-product-variant-og-on-selected').click();
        })
    },
    showOptions: function () {
        $(document).on("click", ".sculptor-dropdown", function (e) {
            var element = $(this).parent().find(".sculptor-dropdown-options");
            if (element.is(":visible")) {
                setVisibilityInline(element, "none");
            } else {
                setVisibilityInline(element, "block");
            }
        });
    },
    setSelectedOptions: function () {
        $(document).on("click", ".sculptor-dropdown-options li", function (e) {
            var targetDiv = $(this).closest(".og-picker");

            targetDiv.find("[name=byob-frequency]").val("");

            targetDiv
                .find(".sculptor-option-selected")
                .removeClass("sculptor-option-selected");
            targetDiv
                .find(".sculptor-dropdown-options li")
                .each(function (i, obj) {
                    if (obj.attributes.selected) {
                        obj.attributes.selected.value = "";
                    }
                });

            $(this).addClass("sculptor-option-selected");
            $(this).attr("selected", "selected");

            var selectedValue = $(this).data("value");
            targetDiv
                .find(".sculptor-dropdown")
                .attr("data-value", $(this)[0].innerHTML);

            targetDiv
                .find("[name=byob-frequency] option")
                .filter(function () {
                    return $(this)[0].value === selectedValue;
                })
                .prop("selected", true);

            setEveryPeriod(selectedValue);
        });
    },
    byobGetStarted: function () {
        $(document).on("click", ".js-byob-get-choose-variant", function () {
            setOptionsAndSendReq($(this));
        });

    },
};
