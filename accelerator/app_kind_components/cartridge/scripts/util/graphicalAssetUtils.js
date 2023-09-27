/* global empty */
/**
 * Graphical Asset related utilities
 */

var StringWriter = require('dw/io/StringWriter');
var Velocity = require('dw/template/Velocity');
var URLUtils = require('dw/web/URLUtils');
var Resource = require('dw/web/Resource');

/*
 * Renders the given template to a string.
 *
 * @param {String} content
 * @param {Object} map parameter map; if not included will use a default
 *  with URLUtils and Resource static classes
 * @returns {String}
 */
function renderToString(content, map) {
    var writer = new StringWriter();
    var paramMap;

    if (!empty(map)) {
        paramMap = map;
    } else {
        paramMap = {
            url: URLUtils,
            res: Resource
        };
    }

    Velocity.render(content, paramMap, writer);

    return writer.toString();
}

/*
 * Handles graphical asset meta fields and returns an object with values
 * @param {Object}
 * @returns {Object}
 */
function getGraphicalAssetFieldValues(contentAsset) {
    var name = contentAsset.name || '';

    var heading = contentAsset.custom.graphicalAssetHeading;
    var eyebrow = contentAsset.custom.graphicalAssetEyebrow;
    var body = contentAsset.custom.graphicalAssetBody;
    var bodyTwo = contentAsset.custom.graphicalAssetBodyTwo;
    var links = contentAsset.custom.graphicalAssetLinks;
    var url = contentAsset.custom.graphicalAssetURL;
    var videoURL = contentAsset.custom.graphicalAssetVideoURL;
    var wrapper = contentAsset.custom.graphicalAssetWrapper;
    var assetURL = '';

    var backgroundImage = contentAsset.custom.graphicalAssetBackgroundImage;
    var image = contentAsset.custom.graphicalAssetImage;

    // Settings

    var backgroundColor = contentAsset.custom.graphicalAssetBackgroundColor;
    var headingColor = contentAsset.custom.graphicalAssetHeadingColor;
    var eyebrowColor = contentAsset.custom.graphicalAssetEyebrowColor;
    var bodyColor = contentAsset.custom.graphicalAssetBodyColor;
    var contentColor = contentAsset.custom.graphicalAssetContentColor;

    var textAlign = contentAsset.custom.graphicalAssetTextAlign;
    var contentXPosition = contentAsset.custom.graphicalAssetContentXPosition;
    var contentYPosition = contentAsset.custom.graphicalAssetContentYPosition;

    var mobileOnly = contentAsset.custom.graphicalAssetMobileOnly;
    var tabletOnly = contentAsset.custom.graphicalAssetTabletOnly;

    if (!empty(url)) {
        assetURL = renderToString(url);
    }

    return {
        name: name,
        heading: heading,
        eyebrow: eyebrow,
        body: body,
        bodyTwo: bodyTwo,
        links: links,
        assetURL: assetURL,
        videoURL: videoURL,
        wrapper: wrapper,
        backgroundImage: backgroundImage,
        image: image,
        backgroundColor: backgroundColor,
        headingColor: headingColor,
        eyebrowColor: eyebrowColor,
        bodyColor: bodyColor,
        contentColor: contentColor,
        textAlign: textAlign,
        contentXPosition: contentXPosition,
        contentYPosition: contentYPosition,
        mobileOnly: mobileOnly,
        tabletOnly: tabletOnly
    };
}

/*
 * Builds graphical asset classes based on asset settings and current html element
 * NOTE: This will probably be modified as the content asset templates are built out.
 *       Leaving this as-is for the moment, as an example of how classes may be built out
 *
 * @param {Object} graphicalAsset
 * @param {String} currentElement
 * @returns {String}
 */
function buildGraphicalAssetClassString(graphicalAsset, currentElement) {
    var classString = currentElement;
    if (currentElement === 'graphical-asset') {
        // Mobile/Tablet Only
        if (graphicalAsset.mobileOnly === 'true') {
            classString += ' ' + currentElement + '--mobile';
        } else if (graphicalAsset.tabletOnly === 'true') {
            classString += ' ' + currentElement + '--tablet';
        }
    }
    if (currentElement === 'graphical-asset__wrapper') {
        // Mobile/Tablet Only
        if (['full', 'contained'].indexOf(graphicalAsset.wrapper) >= 0) {
            classString += ' ' + currentElement + '--' + graphicalAsset.wrapper;
        }
    }
    if (currentElement === 'graphical-asset__content-wrapper') {
        // Horizontal Positioning
        if (['left', 'center', 'right'].indexOf(graphicalAsset.contentXPosition) >= 0) {
            classString += ' ' + currentElement + '--position-' + graphicalAsset.contentXPosition;
        }
        // Vertical Positioning
        if (['top', 'middle', 'bottom'].indexOf(graphicalAsset.contentYPosition) >= 0) {
            classString += ' ' + currentElement + '--position-' + graphicalAsset.contentYPosition;
        }
    }
    if (currentElement === 'graphical-asset__body') {
        // Text Alignment
        if (['left', 'center', 'right'].indexOf(graphicalAsset.textAlign) >= 0) {
            classString += ' ' + currentElement + '--text-align-' + graphicalAsset.textAlign;
        }
    }
    return classString;
}

module.exports = {
    RenderToString: renderToString,
    GetGraphicalAssetFieldValues: getGraphicalAssetFieldValues,
    BuildGraphicalAssetClassString: buildGraphicalAssetClassString
};
