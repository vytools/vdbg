import * as vscode from 'vscode';
import { CppdbgType } from './types/cppdbg';
import { PydbgType } from './types/pydbg';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './types/sources';
const fs = require('fs');
const path = require('path');

import { VyJson, vyPanel } from './panel';
// https://microsoft.github.io/debug-adapter-protocol/specification

export function activate(context: vscode.ExtensionContext) {
	const channel:vscode.OutputChannel = vscode.window.createOutputChannel("vdbg");
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0] : undefined;
	if (rootPath) {
		const pth = path.join(rootPath.uri.fsPath,'.vscode','vy.json');
		let vyjson:VyJson = {panel_scripts:undefined,access_scripts:undefined};
		try {
			let txt = fs.readFileSync(pth,{encoding:'utf8',flag:'r'});
			txt = txt.replace(/\$\{workspaceFolder\}/g, rootPath.uri.fsPath);
			txt = txt.replace(/\$\{extensionFolder\}/g, context.extensionPath);
			vyjson = JSON.parse(txt);
		} catch(err) {}
		if (vyjson.panel_scripts) {
			const access_scripts = vyjson.access_scripts || [];
			const panel = new vyPanel(context.extensionUri, channel);
			panel.createPanel({},rootPath,vyjson.panel_scripts,access_scripts,function(message:any) {});
			setInterval(() => {
				if (panel.disposed() && vyjson.panel_scripts) {
					panel.createPanel({},rootPath,vyjson.panel_scripts,access_scripts,function(message:any) {});
				}
			},500);
			return; // can't use both panel_scripts and vdbg_scripts
		}
	}

	let VDBG:vDbgPanel | undefined;
	let lastStackFrame:vdbg_sources.stackTraceBody|undefined;
	let triggered = false;
	const INIT_STATE = 0;
	const SETT_STATE = 1;
	let state = INIT_STATE;
	let type_:vdbg_sources.LanguageDbgType | undefined;
	context.subscriptions.push( vscode.debug.onDidStartDebugSession(session => {
		VDBG?.setSession(session);
	}) );
	context.subscriptions.push( vscode.debug.onDidTerminateDebugSession(session => {
		VDBG?.sendMessage({'topic':'__terminate_debug_session__'});
		state = INIT_STATE;
	}) );

	// context.subscriptions.push( vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {  }) );
	// context.subscriptions.push( vscode.debug.onDidChangeBreakpoints(ev => { }) );
	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			if (!VDBG || VDBG.disposed()) {
				state = INIT_STATE;
				VDBG = new vDbgPanel(context.extensionUri, channel);
			}
			
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
                    if (VDBG && msg?.arguments?.threadId) VDBG.currentThreadId = msg.arguments.threadId;
				},
				onDidSendMessage: async msg => {
					// console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					if (VDBG && msg.type == 'response' && msg.command == 'stackTrace' && msg.body?.stackFrames?.length > 0) { // command = variables|stackTrace|scopes|thread
						lastStackFrame = msg.body.stackFrames[0];
						triggered = false;
						if (state == INIT_STATE && lastStackFrame) {
							state = SETT_STATE;
							const refresh = (t:vdbg_sources.LanguageDbgType) => { VDBG?.setType(t); };
							const type = session.configuration.type;
							if (type == 'cppdbg') {
								type_ = new CppdbgType(VDBG._channel, session, lastStackFrame.id, refresh);
							} else if (type == 'python') {
								type_ = new PydbgType(VDBG._channel, session, lastStackFrame.id, refresh);
							} else {
								type_ = new vdbg_sources.LanguageDbgType(VDBG._channel, session);
								VDBG?.setType(type_);
							}
						}
					} else if (VDBG && msg.type == 'response' && msg.command == 'variables') { // command = variables|stackTrace|scopes|thread
						if (lastStackFrame && !triggered) {
							triggered = true;
							VDBG.checkBreakpoint(lastStackFrame); // send in previous stackFrame
						}
					}
				},
			};
		},
	});	

}
