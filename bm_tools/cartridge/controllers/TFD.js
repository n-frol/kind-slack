'use strict';

/**
 * Controller that provides functions for browsing remote and local file systems.
 * It can also be used to add, copy and delete files.
 * @module controllers/TFD
 */
var File 			: dw.io.File 			= require('dw/io/File');
var Logger 			: dw.system.Logger 		= require('dw/system/Logger');
var StringUtils 	: dw.util.StringUtils 	= require('dw/util/StringUtils');
var Calendar		: dw.util.Calendar		= require('dw/util/Calendar');
var URLUtils 		: dw.web.URLUtils 		= require('dw/web/URLUtils');
var Status 			: dw.system.Status 		= require('dw/system/Status');
var FTPClient 		: dw.net.FTPClient 		= require('dw/net/FTPClient');
var SFTPClient 		: dw.net.SFTPClient 	= require('dw/net/SFTPClient');
var WebDAVClient 	: dw.net.WebDAVClient 	= require('dw/net/WebDAVClient');

var DirectoryAnalyzer = require('~/cartridge/scripts/directoryanalyzer/DirectoryAnalyzer');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

/**
 * Renders the general TFD page.
 */
function start() {
    app.getView({
    	mainmenuname: request.httpParameterMap.mainmenuname.value,
    	CurrentMenuItemId: request.httpParameterMap.CurrentMenuItemId.value
    }).render('tfd/totalfiledemanderui');
}

/**
 * Renders the Local File System portion of the TFD page.
 */
function localFS() {
	
	var basePath 			: String = app.getForm('browselocal.basePath').value();
	var relativePath 		: String = app.getForm('browselocal.relativePath').value();
	var libraryID 			: String = app.getForm('browselocal.libraryID').value();
	var siteID 				: String = app.getForm('browselocal.siteID').value();
	var catalogID 			: String = app.getForm('browselocal.catalogID').value();
	var analyzeDirectory 	: String = app.getForm('browselocal.analyzeFolderSize').value();
	
	var pdict = {};

	if ( !basePath ) {
		Logger.error("BasePath not available");
		basePath = File.TEMP;
	}
	
	var absolutePath : String = basePath; 
	
	if ( basePath == 'LIBRARIES' ) {
		if ( libraryID ) {
			libraryID = libraryID.replace(/\//g, '');
			absolutePath += '/' + libraryID;
		}
	} else if ( basePath == 'DYNAMIC' ) {
		if ( siteID ) {
			siteID = siteID.replace(/\//g, '');
			absolutePath += '/' + siteID;
		}
	} else if ( basePath == 'CATALOGS' ) {
		if ( catalogID ) {
			catalogID = catalogID.replace(/\//g, '');
			absolutePath += '/' + catalogID;
		}
	}
	
	var status : Status = null;
	if( relativePath ) {
		absolutePath += relativePath;		
	}
	
	var result : Object = {"directories":[], "numberOfDirectories":0,"files":[], "numberOfFiles":0};

	var directory : File = new File( absolutePath );
	
	if ( !directory.exists() ) {
		status = new Status( Status.ERROR, 'Directory \'' + absolutePath + '\' does not exist!');
	} else {
		
		var fileInfos : Array = directory.listFiles();
		if ( relativePath && relativePath.length > 1 ) {
			result.directories.push( { name : '..', size : 0, lastModified : StringUtils.formatDate(new Date(directory.lastModified()), 'dd.MM.yyyy HH:mm:ss')} );
		}
		if ( !empty(fileInfos) ) {
			for each ( var fileInfo : File in fileInfos) {
				var fileInfoSO : Object = {};
				fileInfoSO.name = fileInfo.name;
				fileInfoSO.size = fileInfo.length();
				fileInfoSO.lastModified = StringUtils.formatDate(new Date(fileInfo.lastModified()), 'dd.MM.yyyy HH:mm:ss');
				if (fileInfo.directory) {
					//work around quota limitation
					if ( result.directories.length < 2000 ) {
						result.directories.push(fileInfoSO);
					}
					result.numberOfDirectories++;
				} else {
					//work around quota limitation
					if ( result.files.length < 2000 ) {
						fileInfoSO.path = fileInfo.fullPath;
						result.files.push(fileInfoSO);
					}
					result.numberOfFiles++;
				}
			}
		} 
		result.directories.sort(sortFilesByName);
		result.files.sort(sortFilesByName);
		
		if ( !empty(analyzeDirectory) ) {
			var directoryAnalyzer = new DirectoryAnalyzer( analyzeDirectory, directory );
			pdict.AnalyzerResult = directoryAnalyzer.generateReport();;
		}
	}
	
	pdict.LocalObjectList = result;
	pdict.Status = status;

    app.getView( pdict ).render('tfd/localfscontent');
}

/**
 * Clears the profile form and renders the addressdetails template.
 */
function remoteFS() {
	
	var password 	: String = app.getForm('browseremote.filesystem.password').value();
	var path 		: String = app.getForm('browseremote.filesystem.path').value();
	var url 		: String = app.getForm('browseremote.filesystem.url').value();
	var user 		: String = app.getForm('browseremote.filesystem.user').value();
	
	var pdict = {};

	if ( url.lastIndexOf('/') != url.length-1 ) {
		url += '/';
	}
	
	var status : Status = null;

	if ( empty(url) ) {
		status = new Status( Status.ERROR, 'URL not specified');
	} else {
		var result : Object = {"directories":[],"files":[]};

		if ( url.indexOf( "sftp://" ) == 0 )
		{
			status = listRemoteElementsSFTP(url, path, user, password, result);
		}
		else if ( url.indexOf( "ftp://" ) == 0 ) 
		{
			status = listRemoteElementsFTP(url, path, user, password, result);
		}
		else
		{
			status = listRemoteElementsWebDAV(url, path, user, password, result);
		}
		result.directories.sort(sortFilesByName);
		result.files.sort(sortFilesByName);
		pdict.ObjectList = result;
	}		
	pdict.Status = status;
	app.getView( pdict ).render('tfd/remotefscontent');
}

/** ###### HELPER FUNCTIONS ######## **/

function listRemoteElementsSFTP( url : String, remotePath : String, user : String, password : String, result : Object ) : Status {

    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter password empty (required for SFTP)' );
    }

    // parse URL, e.g. "sftp://sftp.myserver.com:22/folder/"
	var params : Array = /^sftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter RemoteFolderURL not recognized, RemoteFolderURL: ' + url );
	}

	var host : String = params[1];
	var port : Number = null;
	// params[2] is undefined if there was no port provided
	if ( params[2] != undefined )
	{
		port = new Number( params[2] );
	}
	var path : String = remotePath ? remotePath : '.';
	
	// connect
	var sftpClient : SFTPClient = new SFTPClient();
	sftpClient.setTimeout(30000);
	var connected : boolean;
	
	try
	{
		if ( port != null ) {
			connected = sftpClient.connect( host, port, user, password );
		} else {
			// use default port
			connected = sftpClient.connect( host, user, password );
		}
	} catch ( ex ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + sftpClient.errorMessage );
	}
	try{
		var directoryInfo : FileInfo = sftpClient.getFileInfo(path);
		if ( empty(directoryInfo) ) {
			return new Status( Status.ERROR, 'Directory ' + path +' cannot be accessed!' );
		} else if( !directoryInfo.directory ) {
			return new Status( Status.ERROR, path + ' is not a directory!' );
		} 
		var fileInfos : Array = sftpClient.list(path);
		if ( !empty(fileInfos) ) {
			for each ( var fileInfo : SFTPFileInfo in fileInfos) {
				if ( fileInfo.name == '.' ) {
					continue;
				}
				var fileInfoSO : Object = {};
				fileInfoSO.name = fileInfo.name;
				fileInfoSO.size = fileInfo.size;
				fileInfoSO.lastModified = StringUtils.formatCalendar(new Calendar(fileInfo.modificationTime), 'dd.MM.yyyy HH:mm:ss');
				fileInfoSO.path = directoryInfo.name;
				if (fileInfo.directory) {
					result.directories.push(fileInfoSO);
				} else {
					result.files.push(fileInfoSO);
				}
			}
		} 
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( sftpClient.connected ) {
			sftpClient.disconnect();
		}
	}
}

function listRemoteElementsFTP( url : String, remotePath : String, user : String, password : String, result : Object ) : Status {

    // for FTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter user empty (required for FTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter password empty (required for FTP)' );
    }

    // parse URL, e.g. "ftp://ftp.myserver.com:22/folder/"
	var params : Array = /^ftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'ListRemoteFolder: Parameter RemoteFolderURL not recognized, RemoteFolderURL: ' + url );
	}

	var host : String = params[1];
	var port : Number = null;
	// params[2] is undefined if there was no port provided
	if ( params[2] != undefined )
	{
		port = new Number( params[2] );
	}
	var path : String = remotePath ? remotePath : '.';
	
	// connect
	var ftpClient : FTPClient = new FTPClient();
	ftpClient.setTimeout(30000);
	var connected : boolean;
	
	try
	{
		if ( port != null ) {
			connected = ftpClient.connect( host, port, user, password );
		} else {
			// use default port
			connected = ftpClient.connect( host, user, password );
		}
	} catch ( ex ) {
		Logger.error( 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
    	return new Status( Status.ERROR, 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
		Logger.error( 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ftpClient.replyMessage );
    	return new Status( Status.ERROR, 'ListRemoteFolder: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ( ftpClient.replyMessage ? ftpClient.replyMessage : ' timeout(??).' ) );
	}
	
	try{
		//return new Status( Status.ERROR, 'Please align FTP with SFTP functionality --> allow for relative paths!!');
		var fileInfos : Array = ftpClient.list(path);
		if ( ftpClient.replyCode != 200 && ftpClient.replyCode != 226 ) {
			return new Status( Status.ERROR, ftpClient.replyMessage);
		}
		var fileInfoSO : Object = {};
		fileInfoSO.name = '..';
		fileInfoSO.size = '0';
		fileInfoSO.path = path;
		fileInfoSO.lastModified = StringUtils.formatCalendar(dw.system.Site.calendar, 'yyyy.MM.dd G HH:mm:ss z');
		result.directories.push(fileInfoSO);
		if ( !empty(fileInfos) ) {
			for each ( var fileInfo : FTPFileInfo in fileInfos) {
				if ( fileInfo.name == '.' ) {
					continue;
				}
				fileInfoSO = {};
				fileInfoSO.name = fileInfo.name;
				fileInfoSO.size = fileInfo.size;
				fileInfoSO.path = path;
				fileInfoSO.lastModified = StringUtils.formatCalendar(new Calendar(fileInfo.timestamp), 'yyyy.MM.dd G HH:mm:ss z');
				if (fileInfo.directory) {
					result.directories.push(fileInfoSO);
				} else {
					result.files.push(fileInfoSO);
				}
			}
		} 
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'ListRemoteFolder: ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( ftpClient.connected ) {
			ftpClient.disconnect();
		}
	}
}

function listRemoteElementsWebDAV( url : String, path : String, user : String, password : String, result : Object ) : Collection
{
	var webDAVClient : WebDAVClient;
	var remoteFolderURL : String =  (url + ( path ? path : '/' )).replace(/\s/g, '%20');
	
	if ( !empty( user ) && !empty( password ) ) {
		// use authentication
		webDAVClient = new WebDAVClient( remoteFolderURL, user, password );
	} else {
		// no authentication
		webDAVClient = new WebDAVClient( remoteFolderURL );
	}

	var files : Array;
	
	try {
		// remoteFolderURL already contains full reference to folder, no path to append, we pass ""
		// The default depth of 1 makes propfind return the current folder AND files in that folder.
		files = webDAVClient.propfind( "" );
	} catch ( ex ) {
		var exception = ex;
		Logger.error( "DownloadFeed: Error while listing " + remoteFolderURL + ": " + ex );		
    	return new Status( Status.ERROR, "DownloadFeed: Error while listing " + remoteFolderURL + ": " + ex );
	}
	
	if ( !webDAVClient.succeeded() ) {
		Logger.error( "DownloadFeed: Error while listing " + remoteFolderURL + ": " +
			webDAVClient.statusCode + " " + webDAVClient.statusText );		
    	return new Status( Status.ERROR, "DownloadFeed: Error while listing " + remoteFolderURL + ": " +
			webDAVClient.statusCode + " " + webDAVClient.statusText );
	}

	webDAVClient.close();
	var smallPath : String = path ? path.replace(/\//g, '') : '/';
	for each ( var fileInfo : WebDAVFileInfo in files ) {
		if ( !fileInfo.name || fileInfo.name == '.' ) {
			continue;
		}
		let fileInfoSO = {};
		var smallInfoPath : String = fileInfo.path.replace(/\//g, ''); 
		if ( smallInfoPath == smallPath ) {
			fileInfoSO.name = '..';
		} else {
			fileInfoSO.name = fileInfo.name;
		}
		fileInfoSO.size = fileInfo.size;
		fileInfoSO.path = fileInfo.path;
		fileInfoSO.lastModified = StringUtils.formatCalendar(new Calendar(fileInfo.lastModified()), 'yyyy.MM.dd G HH:mm:ss z');
		if (fileInfo.directory) {
			result.directories.push(fileInfoSO);
		} else {
			result.files.push(fileInfoSO);
		}
	}
}

function sortFilesByName( fileInfo1 : Object, fileInfo2 : Object) : Number {
	if ( fileInfo1.name && fileInfo2.name ) {
		if ( fileInfo1.name > fileInfo2.name ) {
			return 1
		} else if ( fileInfo1.name < fileInfo2.name ) {
			return -1;
		} else {
			return 0;
		}
	}
	return 0;
}	

/**
 * Uploads a file to the local file system.
 */
function uploadFileToLocaleFS() {
	
	var currentHttpParameterMap : dw.web.HttpParameterMap = request.httpParameterMap;
	var fileMap : dw.util.LinkedHashMap = currentHttpParameterMap.processMultipart( function ( field : String, contentType : String, fileName : String ) {
		if( fileName == null || fileName == "") {
			return null;
		}
		return new File( [File.TEMP, '/', fileName].join('') );
	});
	
	//nothing to do
	if ( fileMap.size() < 1) {
		return PIPELET_NEXT;
	}

	var fileUploadTargetDirectory : String = currentHttpParameterMap.fileUploadTargetDirectory.value;
	var deleteFiles : Boolean = false;
	if ( empty(fileUploadTargetDirectory) ) {
		deleteFiles = true;
	}
	var targetDirectory : File = null;
	if ( !deleteFiles ) {
		targetDirectory = new File(fileUploadTargetDirectory);
		if ( !targetDirectory.exists() || !targetDirectory.directory) {
			deleteFiles = true;
		}
	}
	if ( !deleteFiles ) {
		//rename files
		for each (var file : File in fileMap){
			var newFilePath : String = fileUploadTargetDirectory + file.name;
			var newFile : File = new File(newFilePath);
			file.renameTo( newFile );
		}
	} else {
		for each (var file : File in fileMap){
			file.remove();
		}
	}
	
	var pdict = {};
	pdict.Location = dw.web.URLUtils.https('TFD-Start');
	pdict.Location1 = dw.web.URLUtils.https('TFD-Start','SelectedMenuItem','customadminmenuextension_tools','CurrentMenuItemId','customadminmenuextension_tools','menuname','Total File Demander','mainmenuname','Tool Box');
    app.getView( pdict ).render('tfd/redirectAfterPost');
}

/*
* Web exposed methods
*/
/** Renders the general TFD page
 * @see {@link module:controllers/TFD~start} */
exports.Start = guard.ensure(['get', 'https'], start);
/** Renders the Local File System portion of the TFD page.
 * @see {@link module:controllers/TFD~localFS} */
exports.LocalFS = guard.ensure(['https'], localFS);
/** Renders the Remote File System portion of the TFD page.
 * @see {@link module:controllers/TFD~remoteFS} */
exports.RemoteFS = guard.ensure(['https'], remoteFS);
/** Uploads a file.
 * @see {@link module:controllers/TFD~uploadFileToLocaleFS} */
exports.UploadFileToLocaleFS = guard.ensure(['post', 'https'], uploadFileToLocaleFS);

