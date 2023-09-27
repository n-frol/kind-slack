'use strict';

/**
 * Controller that provides functions Business Manager Sessions.
 * @module controllers/Terminal
 */

/* Script Modules */
var app = require('~/cartridge/scripts/app');
var guard = require('~/cartridge/scripts/guard');

var StringWriter : dw.io.StringWriter 		= require('dw/io/StringWriter');
var AgentUserMgr : dw.customer.AgentUserMgr = require('dw/customer/AgentUserMgr');
var stringWriter = new StringWriter();


/**
 * Starts a terminal session and renders the terminal UI.
 */
function start() {
	app.getView( {} ).render('terminal/ui');
}

/**
 * Executes terminal commands/expressions.
 */
function evaluate() {
	var rpcRequest = JSON.parse(request.httpParameterMap.getRequestBodyAsString());
	var rpcResponse = { id: rpcRequest.id };

	switch ( rpcRequest.method ) 
	{
		case 'init':
					session.privacy.terminalCommands = "";
					rpcResponse.result="Initialized!";
					break;
		case 'login':
					var login 	: String = rpcRequest.params[0];
					var pwd  	: String = rpcRequest.params[1];
					var result 	: dw.system.Status = AgentUserMgr.loginAgentUser( login, pwd );
					if ( !result.error ) {
						rpcResponse.result = "ok";
					}
					break;
		case 'list':
					rpcResponse.result = session.privacy.terminalCommands.replace(';',';\n');
					break;
		default:
			var currentcmd : String = rpcRequest.method;
			var currentSession = session;
			try {
				// create and execute a new function with the commands
				if ( currentcmd.match("^trace") == "trace" ) 
				{
					currentcmd = currentcmd.replace(/^trace/,'fakeTrace');
					//currentcmd = currentcmd.replace(/^trace/,'stringWriter.write');
					var commands : String = session.privacy.terminalCommands + "; " + currentcmd;
					new Function(commands)();
					rpcResponse.result = stringWriter.toString();
				} 
				else 
				{
					var commands : String = session.privacy.terminalCommands + "; " + currentcmd;
					new Function(commands)();
					//if successful, store command in session   
					if ( !empty(session.privacy.terminalCommands) )
					{
						session.custom.commands += "; ";
					}
					session.privacy.terminalCommands = session.privacy.terminalCommands + rpcRequest.method;
				}
				
			} 
			catch(ex) 
			{
				rpcResponse.result = " " + ex;
			}
	}
	
	writeRPCResponse( rpcResponse );	
}

/**
 * Fake trace function to capture the output visible in the terminal;
 * 
 * @returns
 */
function fakeTrace() {
	var result = [];
	for each( var attribute in arguments ) {
		result.push(attribute);
	}
	stringWriter.write(result.join('\n'));
};


/**
* Writes response object to the response.
*/
function writeRPCResponse ( rpcResponse : Object ) {
    response.setContentType("application/json encoding=utf-8");
	response.writer.write( JSON.stringify( rpcResponse ) );
}


/** Starts a terminal session and renders the terminal UI.
 * @see {@link module:controllers/Terminal~start} */
exports.Start = guard.ensure(['https'], start);

/** Executes terminal commands/expressions.
 * @see {@link module:controllers/Terminal~evaluate} */
exports.Eval = guard.ensure(['post', 'https'], evaluate);