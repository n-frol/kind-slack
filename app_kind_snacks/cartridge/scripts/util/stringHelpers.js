'use strict';

var StringUtils = require('dw/util/StringUtils');

/**
 * Sanitize a string by removing the whitespaces
 *
 * @param {string} inS - String to sanitize
 * @returns {string} sanitized string
 *
 **/
function sanitize(inS) {
    return inS.replace(/\W/g, '');
}

/**
 * UnsanitizeOR a string by replaced %7c with '|' pipes
 *
 * @param {string} anURL - URL String to sanitize
 * @returns {string} unsanitized string
 *
 **/
function unsanitizeOR(anURL) {
    return anURL.toString().replace('%7c', '|', 'g');
}

/**
 * CleanupID cleans a product id
 *
 * @param {string} s - a String to cleanup
 * @returns {sting} cleaned up product ID
 *
 **/
function cleanupID(s) {
    return (s === null) ? s : s.replace(new RegExp('[^a-z0-9_-]', 'gi'), '_').toLowerCase();
}

/**
 * Encodes a string by replacing spaces with uri space encoding '%20'
 *
 * @param {string} url - url to encode
 * @returns {string} encoded url
 *
 **/
function urlEncodeSpaces(url) {
    return StringUtils.trim(url).replace(/ /g, '%20');
}

module.exports = {
    sanitize: sanitize,
    unsanitizeOR: unsanitizeOR,
    cleanupID: cleanupID,
    urlEncodeSpaces: urlEncodeSpaces
};
