function getQueryVariable(variable) {
    const vars = window.location.search.substring(1).split("&");
    for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split("=");
        if (pair[0] === variable) {
            return pair[1];
        }
    }
    return "";
}

const utmObject = {
    utm_source: getQueryVariable("utm_source"),
    utm_medium: getQueryVariable("utm_medium"),
    utm_campaign: getQueryVariable("utm_campaign")
};
if (utmObject.utm_source.length) {
    window.gtmDataLayer = window.gtmDataLayer || [];
    window.gtmDataLayer.push(utmObject);
}
