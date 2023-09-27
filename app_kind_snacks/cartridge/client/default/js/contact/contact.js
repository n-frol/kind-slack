'use strict';

// Module built specifically for the Contact Us page

module.exports = function () {
    $('body')
    // Create and show a new modal with NICE InContact iframe
    // Iframe can't be preexisting in code because chat window would load on page load
    .on('click', '.js-modal-dialog-create.js-nice-incontact', function () {
        const modalHtml = ` <div class="modal-dialog">
            <!-- Modal content-->
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close pull-right" data-dismiss="modal">×</button>
                </div>
                <div class="modal-body">
                <iframe id="chat-client-frame" name="chat_client" src="${$(this).data('iframe-src')}" frameborder="0" scrolling="no" width="480px" height="683" marginwidth="0px" marginheight="0px"></iframe>
                </div>
                <div class="modal-footer"></div>
            </div>
        </div>`;
        const $modal = $(`<div class="modal fade ${$(this).data('modal-class') || ''}" role="dialog"></div>`).append(modalHtml);

        $('body').append($modal);
        $modal.modal('show');
    });
};
