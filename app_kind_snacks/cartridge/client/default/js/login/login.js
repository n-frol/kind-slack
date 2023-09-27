/*eslint-disable*/

'use strict';

var base = require('base/login/login');

/**
 * @module login
 * This module provides JS event handlers for templates that provide login and
 * registration form functionalities including password reset, and  a
 * forgot-password modal for sending a forgot-password email.
 */
var login = Object.assign({}, base);

login.loginRadius = function () {
    // Cache references to DOM objects.
    var $forgotBtn = $('.js-forgot-password-btn');

    // Import the LoginRadius module.
    var LoginRadius = require('int_loginradius/loginRadius/loginRadius');
    var loginRadius = new LoginRadius();

    // Init forms that should be created on page load.
    const $elements = $('.js-loginradius-onload');
    loginRadius.loadForms($elements);

    // Add the LoginRadius click handler to the forgot-password button.
    if ($forgotBtn.length) {
        $forgotBtn.on('click.lr', function (event) {
            var $this = $(this);

            // Load the form for the forgot-password UI.
            loginRadius.loadForms([$this]);
        });
    }
};
module.exports = login;
