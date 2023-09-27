/**
 * AWS S3 Utility Functions
 */


/* Pseudo Form

Authorization = "AWS" + " " + AWSAccessKeyId + ":" + Signature;

Signature = Base64( HMAC-SHA1( YourSecretAccessKeyID, UTF-8-Encoding-Of( StringToSign ) ) );

StringToSign = HTTP-Verb + "\n" +
    Content-MD5 + "\n" +
    Content-Type + "\n" +
    Date + "\n" +
    CanonicalizedAmzHeaders +
    CanonicalizedResource;

CanonicalizedResource = [ "/" + Bucket ] +
    <HTTP-Request-URI, from the protocol name up to the query string> +
    [ subresource, if present. For example "?acl", "?location", "?logging", or "?torrent"];

CanonicalizedAmzHeaders = <described below>
*/

var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var Mac = require('dw/crypto/Mac');

// DWRE Base64 incapable of handling byte string encoding
var Base64 = require('./Base64');

var AMZ_DATE_FMT = 'YYYYMMdd\'T\'HHmmss\'Z\'';


exports.formatDate = function(date) {
    var cal = new Calendar(date);
    return StringUtils.formatCalendar(cal, AMZ_DATE_FMT);
};

exports.signature = function(accessKeyId, secretAccessKey, bucket, path, date, method) {
    var mac = new Mac(Mac.HMAC_SHA_1);

    var canonicalizedResource = '/' + bucket + '/' + path;
    var stringToSign = method + '\n\n\n' + date + '\n' + canonicalizedResource;

    var authorization = 'AWS ' + accessKeyId + ':';

    var hashValue = mac.digest(stringToSign, secretAccessKey);

    return authorization + Base64.encode(hashValue);
};

