import * as vscode from 'vscode';
import { CppdbgType } from './types/cppdbg';
import { PydbgType } from './types/pydbg';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './types/sources';
const fs = require('fs');
const path = require('path');

import { VyJson, vyPanel } from './panel';
const channel:vscode.OutputChannel = vscode.window.createOutputChannel("vdbg");
let CONTEXT_PANEL:vyPanel|undefined;
const vdbgjson:VyJson = {panel_scripts:[],access_scripts:[],vdbg_scripts:[]}; 

function refresh_vdbg(context: vscode.ExtensionContext, update_json_only:boolean) {
	if (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)) {
		const rootPath = vscode.workspace.workspaceFolders[0];
		const pth = path.join(rootPath.uri.fsPath,'.vscode','vdbg.json');
		if (fs.existsSync(pth)) {
			try {
				let txt = fs.readFileSync(pth,{encoding:'utf8',flag:'r'});
				txt = txt.replace(/\$\{workspaceFolder\}/g, rootPath.uri.fsPath);
				txt = txt.replace(/\$\{extensionFolder\}/g, context.extensionPath);
				const parsed = JSON.parse(txt);
				vdbgjson.vdbg_scripts = parsed.vdbg_scripts || vdbgjson.vdbg_scripts;
				vdbgjson.panel_scripts = parsed.panel_scripts || vdbgjson.panel_scripts;
				vdbgjson.access_scripts = parsed.access_scripts || vdbgjson.access_scripts;
			} catch(err) {
				vscode.window.showErrorMessage('Failed to parse .vscode/vdbg.json');
			}
		}
		if (!update_json_only && CONTEXT_PANEL && vdbgjson.panel_scripts.length > 0) {
			CONTEXT_PANEL.createPanel({}, "vdbg panel", rootPath, vdbgjson.panel_scripts, vdbgjson.access_scripts, () => undefined,() => {
				refresh_vdbg(context, false);
			});
		}
	}
	return vdbgjson;
}

export function activate(context: vscode.ExtensionContext) {
	// const vdbgjson = get_vdbg_json(rootPath, context); 
	CONTEXT_PANEL = new vyPanel(context.extensionUri, channel);
	refresh_vdbg(context, false);
	let VDBG_PANEL:vDbgPanel | undefined;
	let lastStackFrame:vdbg_sources.stackTraceBody|undefined;
	let triggered = false;
	const INIT_STATE = 0;
	const SETT_STATE = 1;
	let state = INIT_STATE;
	let type_:vdbg_sources.LanguageDbgType | undefined;
	context.subscriptions.push( vscode.debug.onDidStartDebugSession(session => {
		VDBG_PANEL?.setSession(session);
	}) );
	context.subscriptions.push( vscode.debug.onDidTerminateDebugSession(session => {
		VDBG_PANEL?.sendMessage({'topic':'__terminate_debug_session__'});
		state = INIT_STATE;
	}) );

	// https://microsoft.github.io/debug-adapter-protocol/specification
	// context.subscriptions.push( vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {  }) );
	// context.subscriptions.push( vscode.debug.onDidChangeBreakpoints(ev => { }) );
	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			refresh_vdbg(context, true);
			if (!VDBG_PANEL || VDBG_PANEL.disposed()) {
				state = INIT_STATE;
				VDBG_PANEL = new vDbgPanel(context.extensionUri, channel);
			}
			
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
                    if (VDBG_PANEL && msg?.arguments?.threadId) 
						VDBG_PANEL.currentThreadId = msg.arguments.threadId;
                    if (VDBG_PANEL && msg?.arguments?.frameId) 
						VDBG_PANEL.currentFrameId = msg.arguments.frameId;
				},
				onDidSendMessage: async msg => {
					// console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					if (VDBG_PANEL && msg.type == 'response' && msg.command == 'stackTrace' && msg.body?.stackFrames?.length > 0) { // command = variables|stackTrace|scopes|thread
						lastStackFrame = msg.body.stackFrames[0];
						triggered = false;
						if (state == INIT_STATE && lastStackFrame) {
							state = SETT_STATE;
							const refresh = (t:vdbg_sources.LanguageDbgType) => { VDBG_PANEL?.setType(t, vdbgjson.vdbg_scripts); };
							const type = session.configuration.type;
							if (type == 'cppdbg') {
								type_ = new CppdbgType(VDBG_PANEL._channel, session, lastStackFrame.id, refresh);
							} else if (type == 'debugpy' || type == 'python') {
								type_ = new PydbgType(VDBG_PANEL._channel, session, lastStackFrame.id, refresh);
							} else {
								type_ = new vdbg_sources.LanguageDbgType(VDBG_PANEL._channel, session);
								VDBG_PANEL?.setType(type_, vdbgjson.vdbg_scripts);
							}
						}
					} else if (VDBG_PANEL && msg.type == 'response' && msg.command == 'variables') { // command = variables|stackTrace|scopes|thread
						if (lastStackFrame && !triggered) {
							triggered = true;
							VDBG_PANEL.checkBreakpoint(lastStackFrame); // send in previous stackFrame
						}
					}
				},
			};
		},
	});	

}
