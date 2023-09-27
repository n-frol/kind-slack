'use strict';

/**
 * Transforms the provided object into JSON format and sends it as JSON response to the client.
 * @param {Object} object Object to write to response.
 */
exports.renderJSON = function (object) {
    response.setContentType('application/json');

    let json = JSON.stringify(object);
    response.writer.print(json);
};
