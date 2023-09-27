'use strict';

var base = require('base/components/collapsibleItem');
var viewportIs = require('../viewport-is');

module.exports = {
    sizes: ['xs', 'sm', 'md', 'lg', 'xl'],
    collapse() {
        $('body').on('click', '.collapsible .title, .collapsible>.card-header', function (e) {
            e.preventDefault();
            $(this).parent().closest('.collapsible').toggleClass('is-active');
        });
    },
    collapseSizes() {
        var sizes = this.sizes || ['xs', 'sm', 'md', 'lg', 'xl']; // Include fallback array

        // Base toggling as well as handling the is-active class
        sizes.forEach(function (size) {
            var selector = '.collapsible-' + size + ' .title, .collapsible-' + size + '>.card-header';
            $('body').on('click', selector, function (e) {
                $(this).parents('.collapsible-' + size).toggleClass('is-active');
            });
        });

        base();
    },
    desktopCollapsibleLinks() {
        $('body')
            .on('click', '.js-collapsible-link-lg, .s-global-footer__section .title a, .s-global-footer__section a.title', function (e) {
                if (!viewportIs('mobile') && !viewportIs('tablet')) {
                    window.location = e.target.href;
                }
            });
    }
};
