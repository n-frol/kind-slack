'use strict';

/**
 * Configuration functions for LoginRadius integration
 */

module.exports = {
    /**
     * Configures login widget.
     * @param {string} containerID - the ID of the container to initialize
     * @returns {Object} configuration options
     */
    configureLoginRadiusLogin: function (containerID) {
        // validation messaging
        var $loginRadiusErrorLogin = $('.loginradius-error--login');
        $('.loginradius-login').on('input', '#loginradius-login-emailid, #loginradius-login-password', function () {
            $loginRadiusErrorLogin.text('');
            $loginRadiusErrorLogin.hide();
        });

        // regular login configuration
        var loginOptions = {};
        loginOptions.container = containerID;
        loginOptions.onSuccess = function (response) {
            // Add remember me flag from localstorage
            response.remember_me = false;
            if ((typeof localStorage['lr-rememberme'] !== 'undefined') && (localStorage['lr-rememberme'] === 'true')) {
                response.remember_me = true;
            }

            var $loginRadiusLoginContainer = $('#' + containerID);
            $.ajax({
                url: $loginRadiusLoginContainer.data('login-registration-url'),
                method: 'POST',
                data: { response: JSON.stringify(response) },
                success: function (userLoginData) {
                    if (userLoginData.status === 'ERROR') {
                        $loginRadiusErrorLogin.text(userLoginData.message);
                        $loginRadiusErrorLogin.show();
                        return;
                    }
                    window.location = $loginRadiusLoginContainer.data('redirect-url');
                }
            });
        };
        loginOptions.onError = function (errors) {
            if (errors.length > 0) {
                $loginRadiusErrorLogin.text(errors[0].Message);
                $loginRadiusErrorLogin.show();
            }
        };

        return loginOptions;
    },

    /**
     * Configures social login widget.
     * @param {string} containerID - the ID of the container to initialize
     * @returns {Object} configuration options
     */
    configureLoginRadiusSocialLogin: function (containerID) {
        var $loginRadiusErrorSocialLogin = $('.loginradius-error--social-login');


        var $loginRadiusSocialLoginContainer = $('#' + containerID);
        var socialLoginOptions = {};
        socialLoginOptions.onSuccess = function (response) {
            $.ajax({
                url: $loginRadiusSocialLoginContainer.data('login-registration-url'),
                method: 'POST',
                data: { response: JSON.stringify(response) },
                success: function (userRegistrationData) {
                    window.location = $loginRadiusSocialLoginContainer.data('redirect-url');
                }
            });
        };
        socialLoginOptions.onError = function (errors) {
            if (errors.length > 0) {
                $loginRadiusErrorSocialLogin.text(errors[0].Message);
                $loginRadiusErrorSocialLogin.show();
            }
        };
        socialLoginOptions.container = containerID;

        return socialLoginOptions;
    },

    /**
     * Configures registration widget.
     * @param {string} containerID - the ID of the container to initialize
     * @returns {Object} configuration options
     */
    configureLoginRadiusRegistration: function (containerID) {
        var $loginRadiusErrorRegistration = $('.loginradius-error--registration');
        $('.loginradius-registration').on('input', '#loginradius-registration-emailid, #loginradius-registration-password, #loginradius-registration-password, #loginradius-registration-firstname, #loginradius-registration-lastname', function () {
            $loginRadiusErrorRegistration.text('');
            $loginRadiusErrorRegistration.hide();
        });

        // registration configuration
        var $loginRadiusRegistrationContainer = $('#' + containerID);
        var registrationOptions = {};
        registrationOptions.container = containerID;
        registrationOptions.onSuccess = function (response) {
            $.ajax({
                url: $loginRadiusRegistrationContainer.data('login-registration-url'),
                method: 'POST',
                data: { response: JSON.stringify(response) },
                success: function (userRegistrationData) {
                    if (userRegistrationData.status === 'ERROR') {
                        $loginRadiusErrorRegistration.text(userRegistrationData.message);
                        $loginRadiusErrorRegistration.show();
                        return;
                    }
                    window.location = $loginRadiusRegistrationContainer.data('redirect-url');
                }
            });
        };
        registrationOptions.onError = function (errors) {
            if (errors.length > 0) {
                $loginRadiusErrorRegistration.text(errors[0].Message);
                $loginRadiusErrorRegistration.show();
            }
        };

        return registrationOptions;
    }
};
