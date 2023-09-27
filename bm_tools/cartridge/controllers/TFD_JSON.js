'use strict';

/**
 * Controller that provides functions to perform operations on remote and local file systems.
 * @module controllers/TFD_JSON
 */
var File 			: dw.io.File 			= require('dw/io/File');
var Logger 			: dw.system.Logger 		= require('dw/system/Logger');
var StringUtils 	: dw.util.StringUtils 	= require('dw/util/StringUtils');
var URLUtils 		: dw.web.URLUtils 		= require('dw/web/URLUtils');
var Status 			: dw.system.Status 		= require('dw/system/Status');
var FTPClient 		: dw.net.FTPClient 		= require('dw/net/FTPClient');
var SFTPClient 		: dw.net.SFTPClient 	= require('dw/net/SFTPClient');
var WebDAVClient 	: dw.net.WebDAVClient 	= require('dw/net/WebDAVClient');

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var FILE_TRANSFER_ACTIONS : Array = ['REMOTE2LOCAL', 'LOCAL2REMOTE'];


/**
 * This function performs a file operation for a given file.
 * If the file doesn't exist or the operation failed, it takes the error exit.
 *
 * @param {string} request.httpParameterMap.filePath 		- The relative path of the file in its context
 * @param {string} request.httpParameterMap.context 		- The context of the file - IMPEX, LOGS, TEMP, etc.
 * @param {string} request.httpParameterMap.siteID			- The Site ID which is required for library access
 * @param {string} request.httpParameterMap.catalogID		- The Site ID which is required for library access
 * @param {string} request.httpParameterMap.operation		- The operation that should be performed on the file - DELETE, ZIP, UNZIP
 * @param {string} request.httpParameterMap.newDirectoryName - The name of the new directory
 * 
 * @return {dw.system.Status } pdict.Status					- The status of the operation.
 */
function performLocalFileOperations() {
	
	var cvActions 			: Array 	= ['DELETE', 'ZIP', 'UNZIP', 'NEWDIRECTORY'];
	var action 				: String 	= request.httpParameterMap.operation.value;;
	var catalogID 			: String 	= request.httpParameterMap.catalogID.value;
	var context 			: String 	= request.httpParameterMap.context.value;
	var filePath 			: String 	= request.httpParameterMap.filePath.value;
	var newDirectoryName 	: String 	= request.httpParameterMap.newDirectoryName.value;
	var siteID 				: String	= request.httpParameterMap.siteID.value;
	var libraryID 			: String	= request.httpParameterMap.libraryID.value;
	
	var pdict = {};

	if ( !filePath ) {
		pdict.Status = new Status( Status.ERROR, 'No file path provided!' );
	}
	if ( !context ) {
		pdict.Status = new Status( Status.ERROR, 'No file context provided!' );
	}
	if ( !action ) {
		pdict.Status = new Status( Status.ERROR, 'No action provided! Please use \'DELETE\', \'ZIP\' or \'UNZIP\'.' );
	}
	action = action.toUpperCase();
	if ( cvActions.indexOf(action) == -1 ) {
		pdict.Status = new Status( Status.ERROR, 'Invalid action provided! Please use \'DELETE\', \'ZIP\' or \'UNZIP\'.' );
	}
	
	if ( empty(pdict.Status) ) 
	{
		var fileFullPathArray : Array = [context];
		if ( context == 'LIBRARIES' )
		{
			if ( libraryID ) 
			{
				libraryID = libraryID.replace(/\//g, '');
				fileFullPathArray.push('/' + libraryID);
			}
		}
		else if ( context == 'DYNAMIC' )
		{
			if ( siteID ) 
			{
				siteID = siteID.replace(/\//g, '');
				fileFullPathArray.push('/' + siteID);
			}
		}
		else if ( context == 'CATALOGS' )
		{
			if ( catalogID ) 
			{
				catalogID = catalogID.replace(/\//g, '');
				fileFullPathArray.push('/' + catalogID);
			}
		}
		fileFullPathArray.push(filePath);
	
		var fileFullPath : String = fileFullPathArray.join('');
		var file : File = new File( fileFullPath );
		if ( !file.exists() )
		{
			pdict.Status = new Status( Status.ERROR, 'The file \'' + fileFullPath + '\' does not exist!' );
		} 
		else
		{
			//start with the actual file handling
			switch ( action ) {
				case "ZIP" : 	
							pdict.Status = zipFile( file );
							break;
				case "UNZIP" : 	
							pdict.Status = unzipFile( file );
							break;
				case "DELETE" : 	
							pdict.Status = deleteFile( file );
							break;
				case "NEWDIRECTORY" : 	
							pdict.Status = newDirectory( file, newDirectoryName );
							break;
			}
		}
	}
	
	writeJSONResponse( pdict );
}

/**
 * Performs remote server file system operations.
 */

/**
 * This script performs a file operation for a given file. 
 * If the file doesn't exist or the operation failed, it takes the error exit.
 * 
 * @param {string} request.httpParameterMap.url			- URL of remote location
 * @param {string} request.httpParameterMap.path		- PATH of remote location
 * @param {string} request.httpParameterMap.user		- Name of the user
 * @param {string} request.httpParameterMap.password	- Password
 * @param {string} request.httpParameterMap.action		- The operation that should be performed on the file - DELETE, ZIP, UNZIP
 * @param {string} request.httpParameterMap.newDirectoryName 	- The name of the new directory
 * 
 * @returns {dw.system.Status } pdict.Status			- The status of the operation.
 */
function remoteFileOperations() {

	var url 		: String = request.httpParameterMap.url.value;
	var user 		: String = request.httpParameterMap.user.value;
	var password 	: String = request.httpParameterMap.password.value;
	var path 		: String = request.httpParameterMap.path.value;
	var action 		: String = request.httpParameterMap.operation.value;
    var newDirectoryName : String = request.httpParameterMap.newDirectoryName.value;

	var pdict = {};
	
	if ( url.lastIndexOf('/') != url.length-1 ) {
		url += '/';
	}
	
	var status : Status = null;
	
	if ( empty(url) ) {
		status = new Status( Status.ERROR, 'URL not specified');
	} else {
		if ( url.indexOf( "sftp://" ) == 0 ) {
			status = performSFTPOperation(action, url, path, user, password, newDirectoryName);
		} else if ( url.indexOf( "ftp://" ) == 0 ) {
			status = performFTPOperation(action, url, path, user, password, newDirectoryName);
		} else {
			status = performWebDAVOperation(action, url, path, user, password);
		}
	}		
	pdict.Status = status;
	
	writeJSONResponse( pdict );
}

/**
 * This function copies data from local file system to a remote location of remote files to the local file system. 
 *
 * @param {string} request.httpParameterMap.catalogID	- The Site ID which is required for library access
 * @param {string} request.httpParameterMap.context		- The context of the file - IMPEX, LOGS, TEMP, etc.
 * @param {string} request.httpParameterMap.filePath	- The relative path of the file in its context
 * @param {string} request.httpParameterMap.operation	- The operation that should be performed on the file - DELETE, ZIP, UNZIP
 * @param {string} request.httpParameterMap.password 	- Password
 * @param {string} request.httpParameterMap.path 		- PATH of remote location
 * @param {string} request.httpParameterMap.siteID		- The Site ID which is required for library access
 * @param {string} request.httpParameterMap.url 		- URL of remote location
 * @param {string} request.httpParameterMap.user		- Name of the user
 * 
 * @returns {dw.system.Status } pdict.Status			- The status of the operation.
 */
function copyLocal2Remote() {
	var action 		: String = request.httpParameterMap.operation.value;
	var catalogID 	: String = request.httpParameterMap.catalogID.value;
	var context 	: String = request.httpParameterMap.context.value;
	var filePath 	: String = request.httpParameterMap.filePath.value;
	var password 	: String = request.httpParameterMap.password.value;
	var path 		: String = request.httpParameterMap.path.value;
	var siteID 		: String = request.httpParameterMap.siteID.value;
	var libraryID 	: String = request.httpParameterMap.libraryID.value;
	var url 		: String = request.httpParameterMap.url.value;
	var user 		: String = request.httpParameterMap.user.value;

	var pdict = {};
	
	if ( !filePath ) {
		pdict.Status = new Status( Status.ERROR, 'No file path provided!' );
	} 
	else if ( !context ) 
	{
		pdict.Status = new Status( Status.ERROR, 'No file context provided!' );
	} 
	else if ( !action )
	{
		pdict.Status = new Status( Status.ERROR, 'No action provided! Please use \'DELETE\', \'ZIP\' or \'UNZIP\'.' );
	}
	
	action = action.toUpperCase();
	if ( FILE_TRANSFER_ACTIONS.indexOf(action) == -1 ) {
		pdict.Status = new Status( Status.ERROR, 'Invalid action provided! Please use \'DELETE\', \'ZIP\' or \'UNZIP\'.' );
	} 
	else
	{
		var fileFullPathArray : Array = [context];
		if ( context == 'LIBRARIES' ) {
			if ( libraryID ) {
				libraryID = libraryID.replace(/\//g, '');
				fileFullPathArray.push('/' + libraryID);
			}
		} else if ( context == 'DYNAMIC' ) {
			if ( siteID ) {
				siteID = siteID.replace(/\//g, '');
				fileFullPathArray.push('/' + siteID);
			}
		} else if ( context == 'CATALOGS' ) {
			if ( catalogID ) {
				catalogID = catalogID.replace(/\//g, '');
				fileFullPathArray.push('/' + catalogID);
			}
		}
		fileFullPathArray.push(filePath);
		
		var fileFullPath : String = fileFullPathArray.join('');
		var file : File = new File( fileFullPath );
		if ( !file.exists() ) {
			pdict.Status = new Status( Status.ERROR, 'The file \'' + fileFullPath + '\' does not exist!' );
		}
		else
		{
			if ( url.lastIndexOf('/') != url.length-1 ) {
				url += '/';
			}
			
			if ( empty(url) ) {
				pdict.Status = new Status( Status.ERROR, 'URL not specified');
			} else {
				switch ( action ) {
					case 'REMOTE2LOCAL' :
											if ( url.indexOf( "sftp://" ) == 0 ) {
												pdict.Status = getSFTP(action, url, path, user, password, file);
											} else if ( url.indexOf( "ftp://" ) == 0 ) {
												pdict.Status = getFTP(action, url, path, user, password, file);
											} else {
												pdict.Status = getWebDAV(action, url, path, user, password, file);
											}
											break;
					case 'LOCAL2REMOTE'	:	
											if ( url.indexOf( "sftp://" ) == 0 ) {
												pdict.Status = putSFTP(action, url, path, user, password, file);
											} else if ( url.indexOf( "ftp://" ) == 0 ) {
												pdict.Status = putFTP(action, url, path, user, password, file);
											} else {
												pdict.Status = putWebDAV(action, url, path, user, password, file);
											}
											break; 
				}
			}		
		}
	}
	writeJSONResponse( pdict );
}


/**
 * Uploads files to server.
 */
function uploadFileToLocaleFS_obsolete() {
}


/** ###### HELPER FUNCTIONS ######## **/

/**
 * Compresses a file. (Local file system)
 */
function zipFile( file : File ) {
	if ( file.name.toLowerCase().match(/.zip/) ) {
		return new Status( Status.ERROR, 'An already compressed file will not be compressed again!' );
	} else {
		var zipFileName : String = file.fullPath + '.zip';
		var zipFile : File = new File( zipFileName );
		try {
			file.zip(zipFile);
		} catch ( e ) {
			return new Status( Status.ERROR, 'Operation failed: ' + e );
		}
	}
	return new Status( Status.OK, 'Operation successfully performed.' );
}

/**
 * Uncompresses a file. (Local file system)
 */
function unzipFile( file : File ) {
	if ( !file.name.toLowerCase().match(/.zip/) ) {
		return new Status( Status.ERROR, 'Only zip files can be decompressed!' );
	} else {
		var filePath : String = file.fullPath;
		var rootDirectoryPath : String = filePath.substr(0, filePath.lastIndexOf('/'));
		var rootDirectory : File = new File( rootDirectoryPath );
		if ( !rootDirectory.exists() ) {
			return new Status( Status.ERROR, 'Root directory doesn\'t exist!' );
		}
		try {
			file.unzip(rootDirectory);
		} catch ( e ) {
			return new Status( Status.ERROR, 'Operation failed: ' + e );
		}
	}
	return new Status( Status.OK, 'Operation successfully performed.' );
}

/**
 * Creates a new directory. (Local file system)
 */
function newDirectory( file : File, directoryName ) {
	if ( !file.directory ) {
		return new Status( Status.ERROR, 'The base directory is not a directory' );
	} else {
		var filePath : String = file.fullPath;
		var rootDirectoryPath : String = /\/\.*$|\/$/.test(filePath) ? filePath.substr(0, filePath.lastIndexOf('/')) : filePath;
		var newDirectoryPath = [rootDirectoryPath,directoryName].join(File.SEPARATOR);
		var newDirectory : File = new File( newDirectoryPath );
		if ( !newDirectory.mkdirs() ) {
			return new Status( Status.ERROR, 'Directory \'' + newDirectoryPath + '\' couldn\'t be created!' );
		}
	}
	return new Status( Status.OK, 'Operation successfully performed.' );
}

/**
 * Deletes a file. (Local file system)
 */
function deleteFile( file : File ) {
	var systemFiles : Array = ['/IMPEX/log'];
	if ( systemFiles.indexOf(file.fullPath) != -1 ) {
		return new Status( Status.ERROR, 'The file/directory you try to delete is required by the system and must not be deleted!' );
	} else {
		try {
			if ( file.directory && file.list().length > 0 ) {
				for each ( var subFileName : File in file.list() ) {
					var subFilePath : String = [file.fullPath, subFileName].join( File.SEPARATOR );
					var status : Status = deleteFile( new File(subFilePath) );
					if ( status.error ) {
						return status;
					}
				}
				return deleteFile( file );
			} else  if ( !file.remove() ) {
				return new Status( Status.ERROR, 'The file/directory \'' + file.fullPath + '\' couldn\'t be deleted!' );
			}
		} catch ( e ) {
			return new Status( Status.ERROR, 'Operation failed: ' + e );
		}
	}
	return new Status( Status.OK, 'Operation successfully performed.' );
}


function getSFTP( action : String, url : String, remotePath : String, user : String, password : String, directory : File ) : Status {
	
	if ( !directory.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided directory is not a directory.' );
	}
	
    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'CopyData: Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'CopyData: Parameter password empty (required for SFTP)' );
    }

    // parse URL, e.g. "sftp://sftp.myserver.com:22/folder/"
	var params : Array = /^sftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'CopyData: Parameter RemoteFolderURL not recognized, RemoteFolderURL: ' + url );
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
    	return new Status( Status.ERROR, 'CopyData: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
    	return new Status( Status.ERROR, 'CopyData: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + sftpClient.errorMessage );
	}
	try{
		var fileInfo : SFTPFileInfo = sftpClient.getFileInfo(path);
		if ( empty(fileInfo) ) {
			return new Status( Status.ERROR, 'Directory/File cannot be accessed!' );
		} else if( !fileInfo.directory ) {
			var fileName : String = fileInfo.name;
			if ( fileName.lastIndexOf('/') != -1 ) { 
				fileName = fileName.substr(fileName.lastIndexOf('/'));
			}
			var fileName : String = [directory.fullPath, fileName].join(File.SEPARATOR);
			if ( !sftpClient.getBinary(path, new File(fileName) ) ) {
				return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + sftpClient.errorMessage );
			}
		} 
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (SFTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( sftpClient.connected ) {
			sftpClient.disconnect();
		}
	}
}

function putSFTP( action : String, url : String, remotePath : String, user : String, password : String, file : File ) : Status {
	
	if ( file.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided file is a directory.' );
	}
	
    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'CopyData: Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'CopyData: Parameter password empty (required for SFTP)' );
    }

    // parse URL, e.g. "sftp://sftp.myserver.com:22/folder/"
	var params : Array = /^sftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'CopyData: Parameter RemoteFolderURL not recognized, RemoteFolderURL: ' + url );
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
    	return new Status( Status.ERROR, 'CopyData: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
    	return new Status( Status.ERROR, 'CopyData: Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + sftpClient.errorMessage );
	}
	try{
		var fileInfo : SFTPFileInfo = sftpClient.getFileInfo(path);
		if ( empty(fileInfo) ) {
			return new Status( Status.ERROR, 'Directory cannot be accessed!' );
		} else if( fileInfo.directory ) {
			var fileName : String = file.name;
			var filePath : String = [path, fileName].join(File.SEPARATOR);
			if ( !sftpClient.putBinary(filePath, file ) ) {
				return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + sftpClient.errorMessage );
			}
		} else {
			return new Status( Status.ERROR, 'Remote location is not a directory!' );
		}
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (SFTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( sftpClient.connected ) {
			sftpClient.disconnect();
		}
	}
}


function getFTP( action : String, url : String, remotePath : String, user : String, password : String, directory : File ) : Status {

	if ( !directory.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided directory is not a directory.' );
	}

    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for SFTP)' );
    }

    // for FTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for FTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for FTP)' );
    }

    // parse URL, e.g. "ftp://ftp.myserver.com:22/folder/"
	var params : Array = /^ftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): File URL not recognized: ' + url );
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
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ftpClient.replyMessage );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ( ftpClient.replyMessage ? ftpClient.replyMessage : ' timeout(??).' ) );
	}
	
	try{
		var fileInfos : Array = ftpClient.list(path);
		if ( fileInfos.length == 0 ) {
			var fileName : String = path;
			fileName = fileName.substr(fileName.lastIndexOf('/'));
			var fileName : String = [directory.fullPath, fileName].join(File.SEPARATOR);
			if ( !ftpClient.getBinary(path, new File(fileName) ) ) {
				return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + ftpClient.replyMessage );
			}
		} else if ( fileInfos.length == 1 ) {
			var fileName : String = fileInfos[0].name;
			if ( fileName.lastIndexOf('/') != -1 ) { 
				fileName = fileName.substr(fileName.lastIndexOf('/'));
			}
			var fileName : String = [directory.fullPath, fileName].join(File.SEPARATOR);
			if ( !ftpClient.getBinary(path, new File(fileName) ) ) {
				return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + ftpClient.replyMessage );
			}
		}
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (FTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( ftpClient.connected ) {
			ftpClient.disconnect();
		}
	}
}

function putFTP( action : String, url : String, remotePath : String, user : String, password : String, file : File ) : Status {

	if ( file.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided file is a directory.' );
	}

    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for SFTP)' );
    }

    // for FTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for FTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for FTP)' );
    }

    // parse URL, e.g. "ftp://ftp.myserver.com:22/folder/"
	var params : Array = /^ftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): File URL not recognized: ' + url );
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
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ftpClient.replyMessage );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ( ftpClient.replyMessage ? ftpClient.replyMessage : ' timeout(??).' ) );
	}
	
	try{
		var fileName : String = file.name;
		var filePath : String = [path, fileName].join(File.SEPARATOR);
		if ( !ftpClient.putBinary(filePath, file ) ) {
			return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + ftpClient.replyMessage );
		}
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (FTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( ftpClient.connected ) {
			ftpClient.disconnect();
		}
	}
}

function getWebDAV( action : String, url : String, path : String, user : String, password : String, directory : File ) : Collection
{
	if ( !directory.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided directory is not a directory.' );
	}

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
	
	//actual action
	try {
		var fileName : String = path;
		fileName = fileName.substr(fileName.lastIndexOf('/'));//.replace(/\s/g, '%20');
		var fileName : String = [directory.fullPath, fileName].join(File.SEPARATOR);
		if ( !webDAVClient.getBinary("", new File(fileName) ) ) {
			return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + webDAVClient.statusCode + ' - ' + webDAVClient.statusText );
		}
	} catch( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (WebDAV): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		webDAVClient.close();
	}
}

function putWebDAV( action : String, url : String, path : String, user : String, password : String, file : File ) : Collection
{
	if ( file.directory ) {
    	return new Status( Status.ERROR, 'CopyData: Provided file is a directory.' );
	}

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
	
	//actual action
	try {
		var fileName : String = file.name.replace(/\s/g, '%20');
		var filePath : String = [path, fileName].join(File.SEPARATOR);
		if ( !webDAVClient.put(fileName, file ) ) {
			return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be copied! Server Message:' + webDAVClient.statusCode + ' - ' + webDAVClient.statusText );
		}
	} catch( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (WebDAV): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		webDAVClient.close();
	}
}


function performSFTPOperation( action : String, url : String, remotePath : String, user : String, password : String, newDirectoryName : String ) : Status {
	
	var supportedActions : Array = [ 'DELETE', 'NEWDIRECTORY' ];
	var currentAction : String = action;
	
	if ( !currentAction ) {
    	return new Status( Status.ERROR, 'No action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

	currentAction = currentAction.toUpperCase();
	if ( supportedActions.indexOf(currentAction) == -1 ) {
    	return new Status( Status.ERROR, 'Invalid action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

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
		switch ( currentAction ) {
			case 'DELETE': 
							var fileInfo : SFTPFileInfo = sftpClient.getFileInfo(path);
							if ( empty(fileInfo) ) {
								return new Status( Status.ERROR, 'Directory/File cannot be accessed!' );
							} else if( !fileInfo.directory ) {
								if ( !sftpClient.del(path) ) {
									return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be deleted! Server Message:' + sftpClient.errorMessage );
								}
							} else {
								var fileInfos : Array = sftpClient.list(path);
								if ( !empty(fileInfos) ) {
									for each ( var fileInfo : SFTPFileInfo in fileInfos) {
										if ( fileInfo.name == '.' || fileInfo.name == '..' ) {
											continue;
										}
										var currentPath : String = [path, fileInfo.name].join('/');
										if ( fileInfo.directory ) {
											var status : Status = performSFTPOperation( action, url, currentPath, user, password );
											if ( status.error ) {
												return status;
											}
										} else {
											if ( !sftpClient.del(currentPath) ) {
												return new Status( Status.ERROR, 'The file/directory \'' + currentPath + '\' couldn\'t be deleted!' );
											} 
										}
									}
									if ( !sftpClient.removeDirectory(path) ) {
										return new Status( Status.ERROR, 'The file/directory \'' + currentPath + '\' couldn\'t be deleted!' );
									}
								} 
							}
							return new Status( Status.OK, 'OK');
							break;
            case "NEWDIRECTORY":
                            if (!newDirectoryName) {
                                return new Status( Status.ERROR, 'Directory \'' + newDirectoryName + '\' couldn\'t be created!' );
                            }
                            var targetFolderStr = remotePath + newDirectoryName;
                            var targetFolderArray = targetFolderStr.split("/");

                            for (var i = 0; i < targetFolderArray.length; i++) {
                                var dirExists = sftpClient.cd(targetFolderArray[i]);
                            
                                if ( !dirExists ) {
                                    sftpClient.mkdir(targetFolderArray[i]);
                                    sftpClient.cd(targetFolderArray[i]);
                                }
                            }
                            return new Status( Status.OK, 'Operation successfully performed.' );
                            break;
        }
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (SFTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( sftpClient.connected ) {
			sftpClient.disconnect();
		}
	}
}

function performFTPOperation( action : String, url : String, remotePath : String, user : String, password : String, newDirectoryName : String ) : Status {

	var supportedActions : Array = [ 'DELETE', 'NEWDIRECTORY'];
	var currentAction : String = action;
	
	if ( !currentAction ) {
    	return new Status( Status.ERROR, 'No action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

	currentAction = currentAction.toUpperCase();
	if ( supportedActions.indexOf(currentAction) == -1 ) {
    	return new Status( Status.ERROR, 'Invalid action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

    // for SFTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for SFTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for SFTP)' );
    }

    // for FTP remoteLogin and remotePassword are required
    if ( empty( user ) ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter user empty (required for FTP)' );
    }

    if ( empty( password ) ){
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Parameter password empty (required for FTP)' );
    }

    // parse URL, e.g. "ftp://ftp.myserver.com:22/folder/"
	var params : Array = /^ftp:\/\/([^\/:]+)(?::(\d+))?(\/(?:.*\/)?)$/.exec( url );

	if ( params == null || params.length < 3 ) {
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): File URL not recognized: ' + url );
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
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ex );
	}

	if ( !connected ) {
		Logger.error( 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ftpClient.replyMessage );
    	return new Status( Status.ERROR, 'Perform Remote File Operation (FTP): Error while connecting to ' + host + ( ( port != null ) ? ( ':' + port ) : '' ) + ': ' + ( ftpClient.replyMessage ? ftpClient.replyMessage : ' timeout(??).' ) );
	}
	
	try{
		switch ( currentAction ) {
			case "DELETE":
							var fileInfos : Array = ftpClient.list(path);
							if ( fileInfos.length > 0 ) {
								var removeDirectory : Boolean = false;
								for each ( var fileInfo : FTPFileInfo in fileInfos ) {
									var currentPath : String = [path, fileInfo.name].join('/');
									if ( fileInfo.directory ) {
										var status : Status = performFTPOperation( action, url, currentPath, user, password );
										if ( status.error ) {
											return status;
										}
									} else {
										removeDirectory = path != fileInfo.name;
										if ( !ftpClient.del( path != fileInfo.name ? currentPath : path ) ) {
											return new Status( Status.ERROR, 'The file/directory \'' + fileInfo.name + '\' couldn\'t be deleted!' );
										} 
									}
								}
								if ( removeDirectory && !ftpClient.removeDirectory(path) ) {
									return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be deleted!' );
								} 
							} else {
								//assuming that this is an empty directory
								if ( !ftpClient.removeDirectory(path) ) {
									return new Status( Status.ERROR, 'The file/directory \'' + path + '\' couldn\'t be deleted!' );
								}
							} 
							break;
            case "NEWDIRECTORY":
                            if (!newDirectoryName) {
                                return new Status( Status.ERROR, 'Directory \'' + newDirectoryName + '\' couldn\'t be created!' );
                            }
                            var targetFolderStr = remotePath + newDirectoryName;
                            var targetFolderArray = targetFolderStr.split("/");

                            for (var i = 0; i < targetFolderArray.length; i++) {
                                var dirExists = ftpClient.cd(targetFolderArray[i]);
                            
                                if ( !dirExists ) {
                                    ftpClient.mkdir(targetFolderArray[i]);
                                    ftpClient.cd(targetFolderArray[i]);
                                }
                            }
                            return new Status( Status.OK, 'Operation successfully performed.' );
                            break;
		}
		return new Status( Status.OK, 'OK');
	} catch ( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (FTP): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		if ( ftpClient.connected ) {
			ftpClient.disconnect();
		}
	}
}

function performWebDAVOperation( action : String, url : String, path : String, user : String, password : String ) : Collection
{
	var supportedActions : Array = [ 'DELETE' ];
	var currentAction : String = action;
	
	if ( !currentAction ) {
    	return new Status( Status.ERROR, 'No action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

	currentAction = currentAction.toUpperCase();
	if ( supportedActions.indexOf(currentAction) == -1 ) {
    	return new Status( Status.ERROR, 'Invalid action provided! Please use ' + supportedActions.join(', ') + '!' );
	}

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
	
	//actual action
	try {
		switch ( currentAction ) {
			case "DELETE":
							if ( !webDAVClient.del("") ) {
								return new Status( Status.ERROR, 'The file/directory \'' + remoteFolderURL + '\' couldn\'t be deleted!' );
							}
							break;
		}
	} catch( e ) {
		var exception = e;
		Logger.error( 'Perform Remote File Operation (WebDAV): ' + e.message );
		return new Status( Status.ERROR, e.message);
	} finally {
		webDAVClient.close();
	}
}


/**
* Writes response object to the response.
*/
function writeJSONResponse ( pdict : Object ) {
    response.setContentType("application/json encoding=utf-8");
    var responseObject = {"result":"ok"};
	if ( pdict && pdict.Status && pdict.Status.error ) 
	{
		responseObject.result = 'error';
		responseObject.message = pdict.Status.message ? pdict.Status.message : 'Operation failed!';
	}
	response.writer.write( JSON.stringify( responseObject ) );
}

/*
* Web exposed methods
*/
/** Performs local server file system operations
 * @see {@link module:controllers/TFD_JSON~localFileOperations} */
exports.LocalFileOperations = guard.ensure(['https'], performLocalFileOperations);

/** Performs remote server file system operations
 * @see {@link module:controllers/TFD_JSON~remoteFileOperations} */
exports.RemoteFileOperations = guard.ensure(['https'], remoteFileOperations);

/** Copies files from local to remote server and vice versa
 * @see {@link module:controllers/TFD_JSON~copyLocal2Remote} */
exports.Copy = guard.ensure(['https'], copyLocal2Remote);
