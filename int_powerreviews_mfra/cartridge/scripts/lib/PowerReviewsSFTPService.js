
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');

/**
 * PowerReviews SFTP Service
 *
 * @returns {FTPService} the service
 */
exports.get = function () {
    return LocalServiceRegistry.createService('powerreviews.sftp', {
        createRequest: function () {
        },
        parseResponse: function (svc, resp) {
            return resp;
        }
    });
};
