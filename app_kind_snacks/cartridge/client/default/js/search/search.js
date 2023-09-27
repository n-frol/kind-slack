/* eslint-disable no-undef */
/* eslint-disable spaced-comment */
/* global dataLayer */
"use strict";

require("intersection-observer");

var accordion = require("../components/accordion");
var layout = require("../components/layout");

var debounce = require("lodash/debounce");
var tileHover = require("../product/tileHover");

function v2TemplateListener() {
    if ($(".search-results.v2").is("*")) {
        $(".refinement-bar").removeClass("col-md-3");
        $(".c-product-tile__wrap").addClass("callout-top");
        $(".js-product-tile").addClass("hide-texture");
    }
}

/**
 * Update DOM elements with Ajax results
 *
 * @param {Object} $results - jQuery DOM element
 * @param {string} selector - DOM element to look up in the $results
 * @return {undefined}
 */
function updateDom($results, selector) {
    var $updates = $results.find(selector);

    $(selector).empty().html($updates.html());
    v2TemplateListener();
    tileHover();
}

/**
 * Keep refinement panes expanded/collapsed after Ajax refresh
 *
 * @param {Object} $results - jQuery DOM element
 * @return {undefined}
 */
function handleRefinements($results) {
    $(".refinement.active").each(function () {
        $(this).removeClass("active");

        $results
            .find("." + $(this)[0].className.replace(/ /g, "."))
            .addClass("active");
    });
    $(".js-refinement-bar").css("display", "block");
    updateDom($results, ".refinements");
    updateDom($results, ".c-chips-box");
    accordion();
    layout();
}

/**
 * Update sort option URLs from Ajax response
 *
 * @param {string} response - Ajax response HTML code
 * @return {undefined}
 */
function updateSortOptions(response) {
    var $tempDom = $("<div>").append($(response));
    var sortOptions = $tempDom
        .find(".grid-footer")
        .data("sort-options").options;
    sortOptions.forEach(function (option) {
        $("option." + option.id).val(option.url);
    });
}

function loadMoreResults(showMoreUrl) {
    $.spinner().start();
    $.ajax({
        url: showMoreUrl,
        data: { selectedUrl: showMoreUrl },
        method: "GET",
        success: function (response) {
            $(".grid-footer").replaceWith(response);
            updateSortOptions(response);
            $("body").trigger("gtm:reinit");
            $.spinner().stop();
            // eslint-disable-next-line no-undef
            if (typeof Yotpo !== "undefined") {
                var api = new Yotpo.API(yotpo);
                api.refreshWidgets();
            }
            var loadMoreButton = $(".js-load-more-sentinel");
            if (loadMoreButton.data("url")) {
                loadMoreButton.on("click", function () {
                    loadMoreResults($(this).data("url"));
                });
            } else {
                loadMoreButton.hide();
            }
            v2TemplateListener();
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

/**
 * Infinite scroll for PLPs
 */
function showMore() {
    // Use Intersection Observer to implement infinite scroll
    // Show More button is hidden, but kept in the DOM for screen readers
    var showMoreObserver = new IntersectionObserver(
        function (entries, observer) {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    var showMoreUrl = $(entry.target).data("url");
                    observer.unobserve(entry.target);

                    $.spinner().start();
                    $.ajax({
                        url: showMoreUrl,
                        data: { selectedUrl: showMoreUrl },
                        method: "GET",
                        success: function (response) {
                            $(".grid-footer").replaceWith(response);
                            updateSortOptions(response);
                            if (
                                document.querySelector(
                                    ".js-show-more-sentinel"
                                ) !== null
                            ) {
                                showMoreObserver.observe(
                                    document.querySelector(
                                        ".js-show-more-sentinel"
                                    )
                                );
                            }
                            $("body").trigger("gtm:reinit");
                            v2TemplateListener();
                            tileHover();
                            $.spinner().stop();
                            // add in yotpo load code
                            // eslint-disable-next-line no-undef
                            if (Yotpo) {
                                var api = new Yotpo.API(yotpo);
                                api.refreshWidgets();
                            }
                        },
                        error: function () {
                            $.spinner().stop();
                        }
                    });
                }
            });
        },
        { threshold: 1 }
    );

    var showMoreSentinel = document.querySelector(".js-show-more-sentinel");
    if (showMoreSentinel) {
        showMoreObserver.observe(showMoreSentinel);
    }

    $(".js-load-more-sentinel").on("click", function () {
        var showMoreUrl = $(this).data("url");
        loadMoreResults(showMoreUrl);
    });
}

function hideCategoriesWithoutResults() {
    if (!$(".byob-page").length) {
        return;
    }
    const navBar = $(".js-navbar-wrapper");
    var subcategories = $(".js-subcategory-container");
    $(".slick-slide").hide();
    if (subcategories.length > 0) {
        navBar.show();
        subcategories.each(function (i, el) {
            var cid = $(el).attr("data-cid");
            navBar.find(`[data-scid='${cid}']`).closest(".slick-slide").show();
        });
    } else {
        navBar.hide();
        $(".js-chisps-clear-all").show();
    }
}

/**
 * Parse Ajax results and updated select DOM elements
 *
 * @param {string} response - Ajax response HTML code
 * @param {array} addtionalDomElements - DOM elements that shouldn't be updated across the board
 * @return {undefined}
 */
function parseResults(response, addtionalDomElements) {
    var $results = $(response);
    var specialHandlers = {
        ".refinements": handleRefinements
    };

    // Update DOM elements that do not require special handling
    [
        ".configuration-category-header",
        ".grid-header",
        ".header-bar",
        ".header.page-title",
        ".product-grid",
        ".show-more",
        ".filter-bar"
    ].forEach(function (selector) {
        updateDom($results, selector);
    });

    if (addtionalDomElements && addtionalDomElements.length) {
        addtionalDomElements.forEach(function (selector) {
            updateDom($results, selector);
        });
    }

    showMore();

    Object.keys(specialHandlers).forEach(function (selector) {
        specialHandlers[selector]($results);
    });

    hideCategoriesWithoutResults();
}

// Show loader for mobile filters on byob over everything
function showLoaderForMobileFilters() {
    if (!$(".byob-page").length || !$(".mobile-menu--expand").is(":visible")) {
        return;
    }

    $.spinner().start();
    $(".mobile-menu--expand").addClass("hide-under-loader");
    $(".veil").addClass("add-top-most");
}

function hideLoaderForMobileFilters() {
    $.spinner().stop();
    $(".mobile-menu--expand").removeClass("hide-under-loader");
    $(".veil").removeClass("add-top-most");
}

function checkResults(res) {
    return res.indexOf("c-product-tile__wrap") >= 0;
}

/**
 * Execute BYOB search
 *
 * @param {HTML} scope - Object event is triggered on
 * @param {event} e - Event object
 * @param {event} inputSearch - is input search
 */
function doByobSearch(scope, e, inputSearch) {
    e.preventDefault();
    e.stopPropagation();

    if ($(window).width() > 1025) {
        showLoaderForMobileFilters();
    }

    const $this = $(scope);
    const url = $this.attr("action") + "?" + $this.serialize();

    $.spinner().stop();
    $.spinner().start();
    $(this).trigger("search:filter", e);
    $.ajax({
        url: url,
        data: {
            page: $(".grid-footer").data("page-number"),
            selectedUrl: $this.attr("action")
        },
        method: "GET",
        success: function (response) {
            /**
             * Search shouldn't be returning a PDP
             * If that happens, reload the page so it can be handled properly
             */
            if ($(response).find(".st-pdp-main").length) {
                window.location = e.currentTarget.href;
            }

            parseResults(response);

            if (inputSearch && checkResults(response)) {
                $(".c-search-byob__results").removeClass("byob-filter-shown");
                $(".js-refinement-bar").css("display", "none");
            }

            $.spinner().stop();

            if ($this.hasClass("js-category-nav-item")) {
                $("body").trigger("byobCategoryNav-update", { navItem: $this });
            }

            hideLoaderForMobileFilters();
        },
        error: function () {
            $.spinner().stop();
            hideLoaderForMobileFilters();
        }
    });
}

/**
 * This function retrieves another page of content to display in the content search grid
 * @param {JQuery} $element - the jquery element that has the click event attached
 * @param {JQuery} $target - the jquery element that will receive the response
 * @return {undefined}
 */
function getContent($element, $target) {
    var showMoreUrl = $element.data("url");
    $.spinner().start();
    $.ajax({
        url: showMoreUrl,
        method: "GET",
        success: function (response) {
            $target.append(response);
            $.spinner().stop();
        },
        error: function () {
            $.spinner().stop();
        }
    });
}

function zmagTiles() {
    var zmag = ".zmags-viewer-container";
    if ($(zmag).is("*")) {
        $(zmag).each(function () {
            var $tile = $(this).closest(".c-marketing-tile__wrapper");
            $tile.find(".c-marketing-tile__text-wrapper").remove();
        });
    }
}

module.exports = {
    filter: function () {
        // Display refinements bar when Menu icon clicked
        $(".container").on("click", "button.filter-results", function () {
            $("body").scrollTop(0);
            $("body").addClass("hide-overflow");
            $(".header-banner").hide();
            if (!$("body").hasClass("creative-snacks")) {
                $(".modal-background").addClass("transparent").show();
            } else {
                $(".refinement-bar__overlay").show();
            }
            $(".refinement-bar").show();
            $(".c-search-byob__results").addClass("byob-filter-shown");
        });
    },

    closeRefinments: function () {
        // Refinements close button
        $(".container").on(
            "click",
            ".refinement-bar button.close, .modal-background, .js-refinement-bar__overlay",
            function () {
                $(".refinement-bar").hide();
                $(".modal-background").removeClass("transparent").hide();
                $("body").removeClass("hide-overflow");
                $(".c-search-byob__results").removeClass("byob-filter-shown");
                $(".refinement-bar__overlay").hide();
                //TODO: close menu
            }
        );
    },

    resize: function () {
        // Close refinement bar and hide modal background if user resizes browser
        $(window).resize(function () {
            $(".refinement-bar, .modal-background").hide();
        });
    },

    sort: function () {
        // Handle sort order menu selection
        $("body").on("change", "[name=sort-order]", function (e) {
            e.preventDefault();

            const selectedOption = $(this).children("option:selected");
            let sortOrder;

            if (selectedOption) {
                sortOrder = selectedOption.text().replace(/\s+/g, " ").trim();
            }

            $.spinner().start();
            $(this).trigger("search:sort", this.value);
            $.ajax({
                url: this.value,
                data: { selectedUrl: this.value },
                method: "GET",
                success: function (response) {
                    $(".product-grid").empty().html(response);

                    $("body").trigger("gtm:sortFilter", ["Sort By", sortOrder]);

                    v2TemplateListener();
                    tileHover();
                    $.spinner().stop();
                    if (Yotpo) {
                        var api = new Yotpo.API(yotpo);
                        api.refreshWidgets();
                    }
                },
                error: function () {
                    $.spinner().stop();
                }
            });
        });
    },

    showMore: showMore,

    applyFilter: function () {
        // Handle refinement value selection and reset click
        $(".container").on(
            "click",
            ".refinements li a, .refinement-bar a.reset, .filter-value a, .swatch-filter a, .c-chips-box__item",
            function (e) {
                e.preventDefault();
                e.stopPropagation();

                var notselected = $(this).find("span").hasClass("is-checked");

                if ($(".js-byob-grid").length) {
                    showLoaderForMobileFilters();
                }

                const $this = $(this);

                var filter = $(this)
                    .closest(".c-refinements__card")
                    .find(".c-refinements__card__card-header")
                    .text()
                    .trim();
                var value = $(this)
                    .find(
                        ".c-refinements__values__item__link__custom-check__text, .c-refinements__values__item__link__custom-radio__text"
                    )
                    .text()
                    .trim();

                $.spinner().start();
                $(this).trigger("search:filter", e);
                $.ajax({
                    url: e.currentTarget.href,
                    data: {
                        page: $(".grid-footer").data("page-number"),
                        selectedUrl: e.currentTarget.href
                    },
                    method: "GET",
                    success: function (response) {
                        /**
                         * Search shouldn't be returning a PDP
                         * If that happens, reload the page so it can be handled properly
                         */
                        if ($(response).find(".st-pdp-main").length) {
                            window.location = e.currentTarget.href;
                        }

                        parseResults(response, [".c-search-byob"]);
                        hideLoaderForMobileFilters();
                        $(".js-modal-background").click();
                        // alert('asdasd');

                        // report to GTM
                        if (
                            typeof dataLayer !== "undefined" &&
                            filter.length &&
                            value.length &&
                            !notselected
                        ) {
                            dataLayer.push({
                                event: filter + "Filter",
                                filterValue: value
                            });
                        }

                        if (!notselected) {
                            $("body").trigger("gtm:sortFilter", [
                                "Filter " + filter,
                                value
                            ]);
                        }

                        if ($this.hasClass("js-category-nav-item")) {
                            $("body").trigger("byobCategoryNav-update", {
                                navItem: $this
                            });
                        }
                    },
                    error: function () {
                        $.spinner().stop();
                    }
                });
            }
        );
    },
    byobSearch: function () {
        var inputSearch = false;
        const debouncedByobSearch = debounce(doByobSearch, 800);

        // Handle refinement value selection and reset click
        $("body").on("submit", ".js-byob-search", function (e) {
            doByobSearch(this, e, inputSearch);
        });
        $("body").on("input", ".js-byob-search", function (e) {
            inputSearch = true;
            debouncedByobSearch(this, e, inputSearch);
        });
    },

    showContentTab: function () {
        // Display content results from the search
        $(".container").on("click", ".content-search", function () {
            if ($("#content-search-results").html() === "") {
                getContent($(this), $("#content-search-results"));
            }
        });

        // Display the next page of content results from the search
        $(".container").on("click", ".show-more-content button", function () {
            getContent($(this), $("#content-search-results .result-count"));
            $(".show-more-content").remove();
        });
    },
    v2Template: function () {
        v2TemplateListener();
    },
    tileHover: function () {
        tileHover();
    },
    zmagTiles: function () {
        zmagTiles();
    }
};
