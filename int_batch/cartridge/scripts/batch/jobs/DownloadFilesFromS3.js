/**
 * Batch Job Component for downloading files in directory to S3 using batch.s3 service
 */

var File = require('dw/io/File');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Logger = require('dw/system/Logger');


/**
 * Download files using the batch.s3 service
 *
 * Note: Bucket and bucket folder configuration is configured on the ServiceCredential
 * object of the batch.s3 service. i.e. It is specific to an instance configuration
 *
 * @input params.directory string directory to download to, related to /Impex/src
 * @input params.prefix string prefix of files to query
 */
exports.downloadFiles = function(params) {
    var log = Logger.getLogger('int_batch');

    var prefix = params.prefix;

    var svc = ServiceRegistry.get('batch.s3');
    // second service because DWRE documentation doesn't match reality
    var deleteSvc = ServiceRegistry.get('batch.s3');

    svc.setThrowOnError();
    deleteSvc.setThrowOnError();

    var remotePath = null;
    if (!empty(params.remotepath)) {
        remotePath = params.remotepath;
        if (remotePath[remotePath.length-1] !== '/') {
            // normalize to look like directory
            remotePath += '/';
        }
    }

    var result = svc.call({
        operation: 'ListBucket',
        prefix: remotePath
    });

    var directory = new File(File.IMPEX + File.SEPARATOR + 'src' + File.SEPARATOR + params.directory);

    if (!directory.isDirectory()) {
        if (directory.mkdir() === false) {
            log.error(directory.fullPath + ' dest path not found or is not a directory and unable to create');
            return new dw.system.Status(dw.system.Status.ERROR);
        }
    }

    if (!result.ok) {
        log.error('Error listing bucket: ' + result.errorMessage);
        return new dw.system.Status(dw.system.Status.ERROR);
    }


    var contents = result.object.contents;
    var foundFiles = 0;
    for (var i = 0; i < contents.length; i++) {
        var keyname = contents[i];

        if (!empty(remotePath)) {
            keyname = keyname.substr(remotePath.length);
        }

        if (empty(keyname) || keyname.length < prefix.length || keyname.substr(0, prefix.length) !== prefix) {
            continue;
        }

        foundFiles += 1;

        var file = new File(File.IMPEX + '/src/' + params.directory + '/' + keyname);


        if (file.exists()) {
            log.warn('File exists. Overwriting: ' + file.getFullPath());
            file.remove();
            file = new File(File.IMPEX + '/src/' + params.directory + '/' + keyname);
        }

        result = svc.call({
            operation: 'GetObject',
            key: keyname,
            prefix: remotePath,
            file: file
        });
        if (!result.ok) {
            log.error('Error downloading object: ' + result.errorMessage);
            return new dw.system.Status(dw.system.Status.ERROR);
        }

        log.info('Downloaded ' +  keyname + ' from S3 to ' + file.getFullPath());

        var deleteResp = deleteSvc.call({
            operation: 'DeleteObject',
            key: keyname,
            prefix: remotePath
        });

        if (!deleteResp.ok) {
            log.error('Cannot delete file on server: ' + keyname + '(' + deleteResp.errorMessage + ')');
            return new dw.system.Status(dw.system.Status.ERROR);
        }
    }

    if (foundFiles === 0) {
        log.info('No files found for download');
        return new dw.system.Status(255, 'NO_FILES_FOUND');
    }
};
