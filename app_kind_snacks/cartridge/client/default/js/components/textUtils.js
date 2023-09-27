'use-strict';

/**
 * Pluralizes text
 *
 * @param {string} text - The text to pluralize (for now assuming that the text is "box")
 * @return {string} The plural version of the string
 */
function pluralize(text) {
    return text + 'es';
}

module.exports = {
    pluralize: pluralize
};
