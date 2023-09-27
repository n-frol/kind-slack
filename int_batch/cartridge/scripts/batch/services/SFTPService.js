/**
 * SFTPService.js
 *
 * A module that exports a function to get the SFTP service instance.
 */

// SFCC API imports
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var Status = require('dw/system/Status');

/**
 * Get the service instance for the SFTP operation.
 *
 * @param {string} serviceId - The ID of the service to get.
 * @returns {dw.svc.SFTPService} - Returns the configured service instance.
 */
function getService(serviceId) {
    var svcLogger = Logger.getLogger('int_batch', 'int_batch');
    var logPrefix = '{0} in SFTPService.js at getService():\n\t';
    var logMsg = '';

    var SFTPService = LocalServiceRegistry.createService(serviceId, {
        /**
         * Creates the request for the SFTP server upload.
         *
         * @param {dw.svc.FTPService} svc - The service object.
         * @param {Object} params - An object containing any parameters passed
         *      into the SFTPService.call() method call.
         * @param {string} params.exportPath - The target URI to upload the
         *      XML file to (includes file name).
         * @param {dw.io.File} params.exportFile - The file to be uploaded to
         *      the specified remote server.
         */
        createRequest: function (svc, params) {
            var client = svc.getClient();
            var config = svc.getConfiguration();
            var credentials = config.getCredential();
            var pass = !empty(credentials) && !empty(credentials.password) ?
            credentials.password : '';
            var user = !empty(credentials) && !empty(credentials.user) ?
            credentials.user : '';
            var url = !empty(credentials) && !empty(credentials.URL) ?
            credentials.URL : '';

            // Verify that the service is configured.
            if (pass && user && url) {
                try {
                    if (url.toLowerCase().indexOf('impact') !== -1) {
                        client.addKnownHostKey('ssh-dss', 'AAAAB3NzaC1kc3MAAACBAP1/U4EddRIpUt9KnC7s5Of2EbdSPO9EAMMeP4C2USZpRV1AIlH7WT2NWPq/xfW6MPbLm1Vs14E7gB00b/JmYLdrmVClpJ+f6AR7ECLCT7up1/63xhv4O1fnxqimFQ8E+4P208UewwI1VBNaFpEy9nXzrith1yrv8iIDGZ3RSAHHAAAAFQCXYFCPFSMLzLKSuYKi64QL8Fgc9QAAAIEA9+GghdabPd7LvKtcNrhXuXmUr7v6OuqC+VdMCz0HgmdRWVeOutRZT+ZxBxCBgLRJFnEj6EwoFhO3zwkyjMim4TwWeotUfI0o4KOuHiuzpnWRbqN/C/ohNWLx+2J6ASQ7zKTxvqhRkImog9/hWuWfBpKLZl6Ae1UlZAFMO/7PSSoAAACAcxwSESaqgI028+r83qgUjoIkQXFoLrjHvoLVe+f+C4DyOlqNRzSG6ObNcFGITZ6zocsTTcddqhWikOUx2X+h7eRqt0AQXUHa0eexVxW4ag6Le6uvvIyxXTdmsoA0H9MIHs+mjnGYGwM0GUVm5VZS2vfWSGQ07XnbRwiZ3Pi9y2c=');
                        client.addKnownHostKey('ssh-dss', 'AAAAB3NzaC1kc3MAAACBAP1/U4EddRIpUt9KnC7s5Of2EbdSPO9EAMMeP4C2USZpRV1AIlH7WT2NWPq/xfW6MPbLm1Vs14E7gB00b/JmYLdrmVClpJ+f6AR7ECLCT7up1/63xhv4O1fnxqimFQ8E+4P208UewwI1VBNaFpEy9nXzrith1yrv8iIDGZ3RSAHHAAAAFQCXYFCPFSMLzLKSuYKi64QL8Fgc9QAAAIEA9+GghdabPd7LvKtcNrhXuXmUr7v6OuqC+VdMCz0HgmdRWVeOutRZT+ZxBxCBgLRJFnEj6EwoFhO3zwkyjMim4TwWeotUfI0o4KOuHiuzpnWRbqN/C/ohNWLx+2J6ASQ7zKTxvqhRkImog9/hWuWfBpKLZl6Ae1UlZAFMO/7PSSoAAACBAKv4chqBpXoZgVeDry4Iq2WG5ts9uzBUwUCtrau7LsVvAlslYuZh9u1Va5IJI6jXazZRZFgyMFxb95/+RADuZtXa3AJQzsLFF+xg+ajXpxnIWFSu/SO4wnXpYeCQDqiP2vRfwPmjE+073iQXcjUVlRN/H7pGZNv5cAV3+ghsmq/I');
                        client.addKnownHostKey('ssh-dss', 'AAAAB3NzaC1kc3MAAACBAP1/U4EddRIpUt9KnC7s5Of2EbdSPO9EAMMeP4C2USZpRV1AIlH7WT2NWPq/xfW6MPbLm1Vs14E7gB00b/JmYLdrmVClpJ+f6AR7ECLCT7up1/63xhv4O1fnxqimFQ8E+4P208UewwI1VBNaFpEy9nXzrith1yrv8iIDGZ3RSAHHAAAAFQCXYFCPFSMLzLKSuYKi64QL8Fgc9QAAAIEA9+GghdabPd7LvKtcNrhXuXmUr7v6OuqC+VdMCz0HgmdRWVeOutRZT+ZxBxCBgLRJFnEj6EwoFhO3zwkyjMim4TwWeotUfI0o4KOuHiuzpnWRbqN/C/ohNWLx+2J6ASQ7zKTxvqhRkImog9/hWuWfBpKLZl6Ae1UlZAFMO/7PSSoAAACAN8KaNLxjlGq+hWimLX7Aq/0Li/GhOJ7V4QZFWB9Z8zHp6VdgMLoGQQzZAW/ZvykCCiFQGzSWAWgKKwfOA7JlQGi94P/ZDerf5kX0f6dkg0zZC9fO4t1WDGW1OlH71SBomFjJLP/Fu5R1FRns3i7PuRUPcs6pwSC5MWt0YZhvOLk=');
                        client.addKnownHostKey('ssh-dss', 'AAAAB3NzaC1kc3MAAACBAP1/U4EddRIpUt9KnC7s5Of2EbdSPO9EAMMeP4C2USZpRV1AIlH7WT2NWPq/xfW6MPbLm1Vs14E7gB00b/JmYLdrmVClpJ+f6AR7ECLCT7up1/63xhv4O1fnxqimFQ8E+4P208UewwI1VBNaFpEy9nXzrith1yrv8iIDGZ3RSAHHAAAAFQCXYFCPFSMLzLKSuYKi64QL8Fgc9QAAAIEA9+GghdabPd7LvKtcNrhXuXmUr7v6OuqC+VdMCz0HgmdRWVeOutRZT+ZxBxCBgLRJFnEj6EwoFhO3zwkyjMim4TwWeotUfI0o4KOuHiuzpnWRbqN/C/ohNWLx+2J6ASQ7zKTxvqhRkImog9/hWuWfBpKLZl6Ae1UlZAFMO/7PSSoAAACBAIf33cBiTYYEHg80inrepezxFbCXRsDj+ldYrel2CTnG2ke9duE1CYT6O7s88YdnCBhSB6IKB1Lyy397x/bHnCkbce7goEVtTR/09Sn9Uy62wRN+ldXdXSTjdnSpMLV1+8CUgelbdIvXxW7rJt4cnkob0bYP1SDWEjQ5UytaNK1w');
                    } else {
                        svc.setOperation('putBinary', params.exportPath, params.exportFile);
                    }
                } catch (e) {
                    logMsg = logPrefix + Object.keys(e).map(function (key) {
                        return '\n\t' + key + ': ' + e[key];
                    }).join();
                    svcLogger.error(logMsg);
                }
            } else {
                logMsg = logPrefix +
                    'Service credential not configured in Business Manager:';
                logMsg += '\n\tServiceCredential ID: ' + credentials.ID;
                logMsg += '\n\tUser configured: ' + !empty(user);
                logMsg += '\n\tPass configured: ' + !empty(pass);
                logMsg += '\n\tURL configured: ' + !empty(url);
                svcLogger.error(logMsg, 'ERROR');
                return new Status(Status.ERROR);
            }

            return params;
        },

        /**
         * Executes the SFTP file operations.
         *
         * @param {dw.svc.FTPService} svc - The service instance.
         * @param {Object} resp - The request object.
         */
        execute: function (svc, params) {
            var client = svc.getClient();
            var config = svc.getConfiguration();
            var credentials = config.getCredential();
            var pass = !empty(credentials) && !empty(credentials.password) ?
            credentials.password : '';
            var user = !empty(credentials) && !empty(credentials.user) ?
            credentials.user : '';
            var url = !empty(credentials) && !empty(credentials.URL) ?
            credentials.URL : '';
            var isConnected = false;

            if (!empty(client)) {
                isConnected = client.connected;
                try {
                    // Ensure that the SFTP connection is open.
                    if (!isConnected) {
                        client.connect(url, user, pass);
                    }

                    client.putBinary(params.exportPath, params.exportFile);
                    client.disconnect();
                } catch (e) {
                    logMsg = logPrefix + 'Error uploading file to SFTP service:';
                    logMsg += Object.keys(e).map(function (key) {
                        return '\n\t' + key + ': ' + e[key];
                    }).join();

                    svcLogger.error(logMsg, 'ERROR');
                }
            }
        },

        /**
         * Callback function for parsing the returned results for the service
         * call before the result is passed back to the calling code.
         *
         * @param {dw.svc.SFTPService} svc - The service instance.
         * @param {Object} resp - The response object to parse for a result.
         */
        parseResponse: function (svc, resp) {
            svc.getClient().disconnect();
            return resp;
        }
    });

    return SFTPService;
}

module.exports = {
    getService: getService
};
