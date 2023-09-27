var hoverstart = 0;
var hoverend = 0;
$(document).on("mouseenter", ".HotspotPlugin_Hotspot", function () {
    hoverstart = $.now();
});
$(document).on("mouseleave", ".HotspotPlugin_Hotspot", function () {
    hoverend = $.now();
    if (hoverend - hoverstart > 1500) {
        var dataLayer = (window.dataLayer = window.dataLayer || []);
        dataLayer.push({
            event: "hotspot_hover",
            hotspot: $(this).attr("data-index"),
            page: window.location.href,
            title: $(document).attr("title")
        });
    }
});
$(document).on("click", ".js-gtm-nav-category-click", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "top-navigation",
        navigation_category: "top-navigation",
        navigation_section: "shop",
        navigation_click_text: $(this).find("a").prop("innerText")
    });
});

$(document).on("click", ".about-item", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "top-navigation",
        navigation_category: "top-navigation",
        navigation_section: "about us",
        navigation_click_text: $(this).prop("innerText")
    });
});

$(document).on("click", ".menu-footer > li > a", function () {
    console.log($(this).parent().parent().siblings("h3").text()); // eslint-disable-line
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "footer_navigation",
        navigation_category: "footer_navigation",
        navigation_section: $(this).parent().parent().siblings("h3").text(), // eslint-disable-line
        navigation_click_text: $(this).text()
    });
});
var scroll25 = false;
var scroll50 = false;
var scroll75 = false;
$("body").scroll(function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    var st = $(this).scrollTop();
    var wh = $(document).height() - $(window).height();

    var perc = parseInt((st * 100) / wh, 10);
    if (perc > 25 && !scroll25) {
        scroll25 = true;
        dataLayer.push({
            event: "scroll",
            scroll_percent: perc
        });
    }
    if (perc > 50 && !scroll50) {
        scroll50 = true;
        dataLayer.push({
            event: "scroll",
            scroll_percent: perc
        });
    }
    if (perc > 75 && !scroll75) {
        scroll75 = true;
        dataLayer.push({
            event: "scrolled",
            scroll_percent: perc
        });
    }
});
$(document).on("click", ".msilink", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "manage_subscriptions",
        manage_subscription_action: "manage"
    });
});

$(document).on("click", "og-send-shipment-now-button", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "manage_subscriptions",
        manage_subscription_action: "send now"
    });
});

$(document).on("click", "og-change-shipment-date-button", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "manage_subscriptions",
        manage_subscription_action: "edit date"
    });
});

$(document).on("click", "og-skip-shipment-button", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "manage_subscriptions",
        manage_subscription_action: "skip order"
    });
});
$(document).on("click", ".btn-container > .btn", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "homepage_interaction",
        cta_location: $(this).attr("href"),
        cta_text: $(this).text()
    });
});
$(document).on("submit", 'form[name="loginradius-login"]', function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "login_success",
        login_status: true,
        login_method: "classic"
    });
});

$(document).on("click", ".lr-provider-label", function () {
    var type = $(this).attr("Title");
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "login_success",
        login_status: true,
        login_method: type
    });
});
$(document).on("submit", 'form[name="loginradius-registration"]', function () {
    var didsub = $(".loginradius-cf_newsletter_signup").is(":checked");
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "account_created",
        email_subscribe_status: didsub
    });
});

$(document).on("change", ".c-quantity-form__custom-select", function () {
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
        event: "product_quantity_change",
        product_quantity: $(this).val()
    });
});

$(document).on("change", ".js-cart-quantity-select", function () {
    var pre = $(this).attr("data-pre-select-qty"); // eslint-disable-line
    var now = $(this).val(); // eslint-disable-line
    var diff = now - pre;
    var dataLayer = (window.dataLayer = window.dataLayer || []);
    if (diff > 0) {
        dataLayer.push({
            add_to_cart_type: "minicart",
            ecommerce: {
                add: {
                    currency_code: "USD",
                    products: [{
                        name: $(this).attr("data-name"), // eslint-disable-line
                        id: $(this).attr("data-pid"), // eslint-disable-line
                        price: $(this).attr("data-price"), // eslint-disable-line
                        quantity: diff
                    }]
                },
                event: "addToCart"
            }
        });
    } else {
        dataLayer.push({
            event: "removeFromCart",
            ecommerce: {
                remove: {
                    products: [{
                        dimension15: false,
                        name: $(this).attr("data-name"), // eslint-disable-line
                        id: $(this).attr("data-pid"), // eslint-disable-line
                        price: $(this).attr("data-price"), // eslint-disable-line
                        quantity: diff
                    }]
                }
            }
        });
    }
});
