/**
 * Creates an array of online content
 * @param {dw.content.Folder} folderValue - result of ContentMgr.getFolder call
 * @return {Array} an array of online content
 */
function getOnlineContent(folderValue) {
    var ContentModel = require('*/cartridge/models/content');

    var onlineContent = folderValue.getOnlineContent().iterator();
    var res = [];

    while (onlineContent.hasNext()) {
        var content = onlineContent.next();
        res.push(new ContentModel(content));
    }

    return res;
}

/**
 * Creates an array of subfolders
 * @param {dw.content.Folder} folderValue - result of ContentMgr.getFolder call
 * @return {Array} an array of online subfolders
 */
function getOnlineSubfolders(folderValue) {
    var FolderModel = require('*/cartridge/models/folder');
    var onlineSubFolders = folderValue.getOnlineSubFolders().iterator();
    var res = [];

    while (onlineSubFolders.hasNext()) {
        var subFolder = onlineSubFolders.next();
        res.push(new FolderModel(subFolder));
    }
    return res;
}

module.exports = {
    getOnlineSubfolders: getOnlineSubfolders,
    getOnlineContent: getOnlineContent
};
