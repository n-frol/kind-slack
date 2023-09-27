'use strict';

var base = module.superModule;

/**
 * Filter method for dw.util.Collection subclass instance
 * @param {dw.util.Collection} collection - Collection subclass instance to map over
 * @param {Function} callback - Callback function for each item
 * @param {Object} [scope] - Optional execution scope to pass to callback
 * @returns {Array} Array of results of filter
 */
function filter(collection, callback, scope) {
    var iterator = Object.hasOwnProperty.call(collection, 'iterator')
        ? collection.iterator()
        : collection;
    var index = 0;
    var item = null;
    var result = [];

    while (iterator.hasNext()) {
        item = iterator.next();
        var include = scope ? callback.call(scope, item, index, collection)
        : callback(item, index, collection);

        if (include) {
            result.push(item);
        }

        index++;
    }
    return result;
}

base.filter = filter;

module.exports = base;
