'use strict';

$("#paymentsubmit").click(function (event) {
    event.preventDefault();
    var recaptcha = document.forms["payment-form"]["g-recaptcha-response"].value;
    if (recaptcha === "") {
        $(".recap-resp").html("Please fill out recaptcha field.").show();
        return false;
    }
    $(".payment-form").submit();
    return true;
});
