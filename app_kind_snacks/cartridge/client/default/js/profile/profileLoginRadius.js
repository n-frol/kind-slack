'use strict';

/**
 * profileCustom.js
 *
 * Provides extended functionality for Profile section.
 *
 */

module.exports = {
    loginRadiusInit: function () {
        // Import the LoginRadius module.
        const LoginRadius = require('int_loginradius/loginRadius/loginRadius');
        const loginRadius = new LoginRadius();
        const $lrProfileError = $('.js-loginradius-error-profile');

        // Init forms that should be created on page load.
        const $elements = $('.js-loginradius-onload');

        // Register a callback for when the onReady event is fired.
        loginRadius.onReady(function (scriptLoadedSuccessfully) {
            if (scriptLoadedSuccessfully) {
                // Create the updateProfile and forgotPassword form instances.
                loginRadius.formInitializers.updateProfile();
                loginRadius.formInitializers.changePassword();
            } else {
                $lrProfileError.text($lrProfileError.data('lrStriptLoadError'));
            }
        });

        // Initialize the LR forms.
        loginRadius.loadForms($elements);
    }
};
