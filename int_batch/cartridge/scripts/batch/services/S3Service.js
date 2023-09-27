var ServiceRegistry = require('dw/svc/ServiceRegistry');
//var Logger = require('dw/system/Logger');

var S3 = require('~/cartridge/scripts/batch/aws/S3');
var FileReader = require('dw/io/FileReader');
/**
 * Service Definition for basic AWS S3 Operations
 *
 * Supported operations:
 *
 * 'list' - list objects in bucket/prefix configured in credentials
 * 'putfile' - put a File object in the bucket prefix
 * 'getfile' - get an object and store in File
 */
ServiceRegistry.configure('batch.s3', {
    createRequest: function(svc, params) {
        var date = S3.formatDate(new Date());

        var accessKeyId = svc.configuration.credential.user;
        var secretKey = svc.configuration.credential.password;
        var bucket = svc.configuration.credential.custom.s3Bucket;
        var prefix = svc.configuration.credential.custom.s3Prefix;
        // append job level prefix to creddential prefix
        if (!empty(params.prefix)) {
            prefix += params.prefix;
        }
        var method = 'GET';
        var key = '';
        var file;
        var baseUrl = 'https://s3.amazonaws.com/' + bucket + '/';

        svc.URL = baseUrl;
        if (params.operation === 'ListBucket') {
            svc.addParam('prefix', prefix);
            svc.addParam('max-keys', '250');
            svc.setRequestMethod('GET');
        } else if (params.operation === 'PutObject') {
            svc.setRequestMethod('PUT');
            method = 'PUT';
            file = params.file;
            key = prefix + file.getName();
            svc.URL = baseUrl + prefix + file.getName();
        } else if (params.operation === 'GetObject') {
            svc.setRequestMethod('GET');
            file = params.file;
            key = prefix + params.key;
            svc.URL = baseUrl + prefix + params.key;
            svc.setOutFile(params.file);
        } else if (params.operation === 'DeleteObject') {
            svc.setRequestMethod('DELETE');
            method = 'DELETE';
            key = prefix + params.key;
            svc.URL = baseUrl + prefix + params.key;
        }

        var signature = S3.signature(accessKeyId, secretKey, bucket, key, date, method);
        svc.setAuthentication('NONE');
        svc.addHeader('Authorization', signature);
        svc.addHeader('Date', date);


        if (params.operation === 'PutObject') {
            return (new FileReader(file)).getString();
        } else {
            return '';
        }
    },
    parseResponse: function(svc, resp) {
        var contentType = resp.responseHeaders.get('Content-Type');
        var prefix = svc.configuration.credential.custom.s3Prefix;

        var resultType = 'UNKNOWN';

        if (!empty(contentType) && contentType.indexOf('application/xml') !== -1 && !empty(resp.text)) {
            var ns = new Namespace('http://s3.amazonaws.com/doc/2006-03-01/');
            var q = new QName(ns, 'Contents');
            var keyQName = new QName(ns, 'Key');
            var x = new XML(resp.text);
            var localName = x.localName();

            if (localName === 'ListBucketResult') {
                var contentNames = [];

                resultType = 'ListBucketResult';
                var contents = x.descendants(q);
                for (var i in contents) {
                    var content = contents[i];
                    if (!empty(content)) {
                        var name = content.child(keyQName);
                        var cleanedName = name.toString().substr(prefix.length);
                        if (!empty(cleanedName)) {
                            contentNames.push(cleanedName);
                        }
                    }
                }
                return {
                    resultType: resultType,
                    contents: contentNames,
                    text: resp.text
                };
            }

            return {
                resultType: resultType
            };
        } else {
            return resp;
        }
    }
});
