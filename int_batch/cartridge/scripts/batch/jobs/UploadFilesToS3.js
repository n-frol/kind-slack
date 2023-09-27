/**
 * Batch Job Component for uploading files in directory to S3 using batch.s3 service
 */

var File = require('dw/io/File');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var S3 = require('~/cartridge/scripts/batch/aws/S3');
var HTTPClient = require('dw/net/HTTPClient');
var Logger = require('dw/system/Logger');

function uploadFileWithService(svc, file, k, remotePath) {
    var date = S3.formatDate(new Date());

    var accessKeyId = svc.configuration.credential.user;
    var secretKey = svc.configuration.credential.password;
    var bucket = svc.configuration.credential.custom.s3Bucket;
    var prefix = svc.configuration.credential.custom.s3Prefix;

    var baseUrl = 'https://s3.amazonaws.com/' + bucket + '/';
    if (!empty(remotePath)) {
        k = remotePath + k;
    }
    var key = prefix + k;
    var url = baseUrl + key;

    var signature = S3.signature(accessKeyId, secretKey, bucket, key, date, 'PUT');
    var client = new HTTPClient();
    client.timeout = svc.configuration.profile.timeoutMillis;
    client.setRequestHeader('Authorization', signature);
    client.setRequestHeader('Date', date);
    client.open('PUT', url);
    client.send(file);

    return client;
}


/**
 * Upload files using the batch.s3 service
 *
 * Note: Bucket and bucket folder configuration is configured on the ServiceCredential
 * object of the batch.s3 service. i.e. It is specific to an instance configuration
 *
 * @input params.directory string directory to search for files in
 * @input params.prefix string prefix of files to query for upload
 */
exports.uploadFiles = function(params) {
    var log = Logger.getLogger('int_batch');
    var dir = new File(File.IMPEX + '/src/' + params.directory);
    var prefix = params.prefix;

    if (!dir.isDirectory()) {
        if (dir.mkdir() === false) {
            log.error('Path not found or is not a directory (unable to create): ' + dir.fullPath);
            return new dw.system.Status(dw.system.Status.ERROR);
        }
    }

    var filesInDir = dir.listFiles(function(f) {
        return f.getName().substr(0, prefix.length) === prefix;
    });

    if (empty(filesInDir) || filesInDir.size() === 0) {
        log.info('No files found for upload');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }

    var svc = ServiceRegistry.get('batch.s3');

    var remotePath = null;
    if (!empty(params.remotepath)) {
        remotePath = params.remotepath;
        if (remotePath[remotePath.length-1] !== '/') {
            // normalize to look like directory
            remotePath += '/';
        }
    }

    for (var i = 0; i < filesInDir.size(); i++) {
        var file = filesInDir[i];

        // We can't use the service directly because service framework currently
        // doesn't support sending a file and reading it all into memory is a bad idea
        // var result = svc.call({
        //     operation: 'PutObject',
        //     key: file.getName(),
        //     file: file
        // });

        // must upload file with HTTPClient instead of using svc.call
        // since service framework sucks
        var client = uploadFileWithService(svc, file, file.getName(), remotePath);

        if (!empty(client.errorText)) {
            log.error('Cannot upload file ' + file.fullPath + '(' + client.errorText + ')');
            return new dw.system.Status(dw.system.Status.ERROR);
        }

        log.info('Uploaded ' + file.fullPath + ' to S3');
        file.remove();
    }
};
