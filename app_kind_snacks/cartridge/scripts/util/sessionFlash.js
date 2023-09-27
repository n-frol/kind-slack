/* global empty, session */
'use strict';

/**
 * Used for handling data intended for a session "flash"
 */

/**
 * Stores a message in the session's flash object at the given key
 * @param {string} key - Object key to store the message at
 * @param {string} message - Message to be stored
 */
function addFlashMessage(key, message) {
    if (empty(session.custom.flash)) {
        session.custom.flash = JSON.stringify({});
    }

    var flashObj = JSON.parse(session.custom.flash);
    flashObj[key] = message;

    session.custom.flash = JSON.stringify(flashObj);
}

/**
 * Attempts to get a message from the session's flash object
 * Removes object from flash object afterwards
 * @param {string} key - Object key to get the message at
 * @returns {string} - Retrieved flash message if found
 */
function getFlashMessage(key) {
    if (empty(session.custom.flash)) {
        return '';
    }

    var flashObj = JSON.parse(session.custom.flash);
    var message = flashObj[key];
    delete flashObj[key];
    session.custom.flash = JSON.stringify(flashObj);

    return message;
}

/**
 * Gets all messages from the session's flash object
 * @returns {Object} - JSON of all existing flash messages
 */
function getAllFlashMessages() {
    if (empty(session.custom.flash)) {
        return {};
    }

    var messages = {};

    var flashObj = JSON.parse(session.custom.flash);

    Object.keys(flashObj).forEach(function (key) {
        messages[key] = getFlashMessage(key);
    });

    return messages;
}

module.exports = {
    addFlashMessage: addFlashMessage,
    getFlashMessage: getFlashMessage,
    getAllFlashMessages: getAllFlashMessages
};
