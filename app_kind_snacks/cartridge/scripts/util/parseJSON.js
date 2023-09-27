const parseJSON = function (json, defaultValue) {
    if (json === null) {
        return defaultValue || null;
    }
    let parsed;

    try {
        parsed = JSON.parse(json);
    } catch (e) {
        parsed = defaultValue;
    }

    return parsed || null; // Return default value if parsed is not defined or null
};

module.exports = parseJSON;
