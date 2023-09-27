'use strict';
$("#businesstype").change(function (ele) {
    var v = $("#businesstype option:selected").data("showother");
    if (v) {
        $("#businesstype_other_row").show();
        $("#businesstype_other_row").find(".form-group").removeClass("hidden");
    } else {
        $("#businesstype_other_row").hide();
    }
});

$("#hearaboutus").change(function (ele) {
    var v = $("#hearaboutus option:selected").data("showother");
    var l = $("#hearaboutus option:selected").val();
    if (v) {
        $("#hearaboutus_other_row").show();
        $("#hearaboutus_other_row").find(".form-group").removeClass("hidden");
        $("#hearaboutus_other_row").find(".form-control-label").text(l);
    } else {
        $("#hearaboutus_other_row").hide();
    }
});
$("#tax_exempt").change(function (ele) {
    var v = $("#tax_exempt option:selected").data("showother");
    if (v) {
        $("#tax_exempt_id").show();
        $("#tax_exempt_id").find(".form-group").removeClass("hidden");
    } else {
        $("#tax_exempt_id").hide();
    }
});

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] === variable) {
            return pair[1];
        }
    }
    return "";
}

if (window.location.search.indexOf('success=1') > -1) {
    $(".successmsg").show();
    $(".contact-form").hide();
} else {
    $(".successmsg").hide();
    $(".contact-form").show();
}

if (window.location.search.indexOf('success=0') > -1) {
    $(".errormsg").show();
    $(".contact-form").hide();
} else {
    $(".errormsg").hide();
    $(".contact-form").show();
}

$("#addresssearch").attr("autocomplete", "password");

$("#email").keydown(function () {
    if ($(this).val() === "") {
        $(".email-feedback").hide();
    }
});

$("#cert").change(function () {
    var file = $(this)[0].files[0];
    var reader = new FileReader();
    reader.addEventListener("load", function (e) {
        document.getElementById("cert_b64").innerHTML = e.target.result;
        document.getElementById("cert_b64").value = e.target.result;
    });
    reader.readAsDataURL(file);
});

$("#utm_medium").val(getQueryVariable("utm_medium"));
$("#utm_source").val(getQueryVariable("utm_source"));
$("#utm_campaign").val(getQueryVariable("utm_campaign"));

$(".b2bregister").click();

$("#distributor").change(function () {
    // eslint-disable-next-line
    if ($("#distributor").val() == 0) {
        $("#distributor~.dist-feedback").html("Only businesses that are not currently purchasing KIND from a distributor are eligible for KIND Wholesale").show().css("color", "black !important");
    } else {
        $("#distributor~.dist-feedback").hide();
    }
});

$("#resell").change(function () {
    // eslint-disable-next-line

});

$(document).ready(function () {
    var pacContainer = $('.pac-container');
    $("#businessaddress").parent().append(pacContainer);
    $("#businessaddress").attr("autocomplete", "false");
});

$("#businessaddress").keypress(function () {
    var pacContainer = $('.pac-container');
    $("#businessaddress").parent().append(pacContainer);
});
