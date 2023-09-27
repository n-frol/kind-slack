var ServiceRegistry = require('dw/svc/ServiceRegistry');

/**
 * Generic Stub FTP service.
 *
 * In most cases (i.e. when using int_batch upload/download scripts)
 * an implementor only needs to copy/update this file and change the name
 * of the service to match the configuration in business manager.
 * 
 * If only one (s)FTP service is required in business manager this service can be used.
 */
ServiceRegistry.configure('batch.ftp', {
    createRequest: function() {
    },
    parseResponse: function(svc, resp) {
        return resp;
    }
});
