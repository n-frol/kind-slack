'use strict';

/**
 * Modular script for creating dialog windows
 * Adapts the built in bootstrap modal functionality into something more dynamic
 */

module.exports = function () {
    $('body')
    // Open modal pre-existing in HTML
    .on('click', '.js-modal-dialog', function () {
        if (!$(this).data('modal')) {
            return;
        }
        const target = $(this).data('modal');
        const $modal = $(target);

        if ($modal.length) {
            $modal.modal('show');
        }
    })
    // Remove modals set to be destroyed on close
    .on('click', '.js-modal-dialog-destroy .close', function () {
        const $modal = $(this).closest('.modal');
        $modal.html(''); // The modal script is super difficult about trying to hide and remove the modal at the same time.  So just hollow it out and let default Bootstrap functionality hide it
    });
};
