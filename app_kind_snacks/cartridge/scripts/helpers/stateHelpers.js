'use strict';

/**
 * stateHelpers.js
 *
 * @module StateHelpers -Exports a helper function for getting state codes from
 *      state names.
 */

/* eslint-disable quote-props */
var STATE_MAP = {
    'arizona': 'AZ',
    'alabama': 'AL',
    'alaska': 'AK',
    'arkansas': 'AR',
    'california': 'CA',
    'colorado': 'CO',
    'connecticut': 'CT',
    'delaware': 'DE',
    'florida': 'FL',
    'georgia': 'GA',
    'hawaii': 'HI',
    'idaho': 'ID',
    'illinois': 'IL',
    'indiana': 'IN',
    'iowa': 'IA',
    'kansas': 'KS',
    'kentucky': 'KY',
    'louisiana': 'LA',
    'maine': 'ME',
    'maryland': 'MD',
    'massachusetts': 'MA',
    'michigan': 'MI',
    'minnesota': 'MN',
    'mississippi': 'MS',
    'missouri': 'MO',
    'montana': 'MT',
    'nebraska': 'NE',
    'nevada': 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'n carolina': 'NC',
    'north dakota': 'ND',
    'n dakota': 'ND',
    'ohio': 'OH',
    'oklahoma': 'OK',
    'oregon': 'OR',
    'pennsylvania': 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    's carolina': 'SC',
    'south dakota': 'SD',
    's dakota': 'SD',
    'tennessee': 'TN',
    'texas': 'TX',
    'utah': 'UT',
    'vermont': 'VT',
    'virginia': 'VA',
    'washington': 'WA',
    'west virginia': 'WV',
    'w virginia': 'WV',
    'wisconsin': 'WI',
    'wyoming': 'WY',

    // Armed Forces
    'armed forces americas': 'AA',
    'armed forces europe': 'AE',
    'armed forces pacific': 'AP'
};
/* eslint-enable quote-props */

/**
 * Gets the names of the states as a array.
 *
 * @return {string[]} - Retunrs the names of the states as an array.
 */
function getStateNames() {
    return Object.keys(STATE_MAP);
}

/**
 * Gets the abbreviated state code from the states name.
 *
 * @param {string} stateName - The name of the state.
 * @return {string} - The abbrevieated 2 charachter state code.
 */
function getStateCode(stateName) {
    var cleanStateName = stateName.toLowerCase().trim().replace('.', '');
    var stateNames = getStateNames();
    if (stateNames.indexOf(cleanStateName) > -1) {
        return STATE_MAP[cleanStateName];
    }

    return stateName;
}

module.exports = {
    getStateCode: getStateCode,
    getStateNames: getStateNames
};
