'use strict';
/**
 * object specific JSON conversion functions
 */
(function (exports) {
    /**
     * Convert a map of params into a parameterstring
     *
     * @param {dw.util.Map} params - Map of key value pairs that have to be added as parameters to the call
     * @returns {string} - stringified json
     */
    function toParamJson(params) {
        var keys = params.keySet().iterator();
        var parameters = {};

        while (keys.hasNext()) {
            var key = keys.next();
            var val = (params.get(key) !== null && typeof params.get(key) === 'object') ? params.get(key).value : params.get(key);

            var keyPath = key.split('.');

            switch (keyPath.length) {
                case 1:
                    parameters[keyPath[0]] = val;
                    break;
                case 2:
                    if (parameters[keyPath[0]] === undefined) {
                        parameters[keyPath[0]] = {};
                    }
                    parameters[keyPath[0]][keyPath[1]] = val;
                    break;
                case 3:
                    if (parameters[keyPath[0]] === undefined) {
                        parameters[keyPath[0]] = {};
                    }
                    if (parameters[keyPath[0]][keyPath[1]] === undefined) {
                        parameters[keyPath[0]][keyPath[1]] = {};
                    }
                    parameters[keyPath[0]][keyPath[1]][keyPath[2]] = val;
                    break;
                case 4:
                    if (parameters[keyPath[0]] === undefined) {
                        parameters[keyPath[0]] = {};
                    }
                    if (parameters[keyPath[0]][keyPath[1]] === undefined) {
                        parameters[keyPath[0]][keyPath[1]] = {};
                    }
                    if (parameters[keyPath[0]][keyPath[1]][keyPath[2]] === undefined) {
                        parameters[keyPath[0]][keyPath[1]][keyPath[2]] = {};
                    }
                    parameters[keyPath[0]][keyPath[1]][keyPath[2]][keyPath[3]] = val;
                    break;
                default:
                    break;
            }
        }

        if (parameters.warenkorbinfos !== undefined) {
            var pliHolder = [];
            for (var wkIndex in parameters.warenkorbinfos) {
                var pli = parameters.warenkorbinfos[wkIndex];
                var pliNum = [pli.artikelnummern];

                parameters.warenkorbinfos[wkIndex].artikelnummern = pliNum;
                pliHolder.push(parameters.warenkorbinfos[wkIndex]);
            }
            parameters.warenkorbinfos = pliHolder;
        }

        return JSON.stringify(parameters);
    }

    exports.toParamJson = toParamJson; // eslint-disable-line no-param-reassign
}(module.exports));
