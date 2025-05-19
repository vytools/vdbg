import * as vscode from 'vscode';
import { CppdbgType } from './types/cppdbg';
import { CppVsDbgType } from './types/cppvsdbg';
import { PydbgType } from './types/pydbg';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './types/sources';
const fs = require('fs');
const path = require('path');
let fileWatchers: vscode.Disposable[] = [];
import { VyAccess, VyJson, VyScript, vyPanel } from './panel';
const channel:vscode.OutputChannel = vscode.window.createOutputChannel("vdbg");
let CONTEXT_PANEL:vyPanel|undefined;
const vdbgjson:VyJson = {panel_scripts:[],access_scripts:[],vdbg_scripts:[]}; 

const repl = function(scrpt:VyScript|VyAccess, workspace:string, extpath:string) {
	scrpt.src = scrpt.src.replace(/\$\{workspaceFolder\}/g, workspace);
	scrpt.src = scrpt.src.replace(/\$\{extensionFolder\}/g, extpath);
}

function refresh_vdbg(context: vscode.ExtensionContext, update_json_only:boolean) {
	if (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0)) {
		const rootPath = vscode.workspace.workspaceFolders[0];
		const pth = path.join(rootPath.uri.fsPath,'.vscode','vdbg.json');
		if (fs.existsSync(pth)) {
			try {
				let txt = fs.readFileSync(pth,{encoding:'utf8',flag:'r'});
				const parsed = JSON.parse(txt);
				if (parsed.hasOwnProperty("vy_tools_results")) {
					parsed.panel_scripts = [{src:"${extensionFolder}/media/builtin/display_results.js",dst:"display_results.js"}]
					parsed.access_scripts = [{src:parsed.vy_tools_results, label:"vy_tools_results"}]
				} else if (parsed.hasOwnProperty("plotly")) {
					parsed.panel_scripts = [{src:"${extensionFolder}/media/builtin/plotly.js",dst:"plotly.js"}]
					parsed.access_scripts = [{src:parsed.plotly, label:"plotly"}]
				}			
				vdbgjson.vdbg_scripts = parsed.vdbg_scripts || vdbgjson.vdbg_scripts;
				vdbgjson.panel_scripts = parsed.panel_scripts || vdbgjson.panel_scripts;
				vdbgjson.access_scripts = parsed.access_scripts.map((ac:any) => {ac.listen=''; return ac;}) || vdbgjson.access_scripts;
				vdbgjson.vdbg_scripts.forEach((vdbg:any) => {
					vdbg.files.forEach((file:any) => {
						repl(file, rootPath.uri.fsPath, context.extensionPath);
					});
				});
				vdbgjson.panel_scripts.forEach((file:any) => {
					repl(file, rootPath.uri.fsPath, context.extensionPath);
				});
				vdbgjson.access_scripts.forEach((file:any) => {
					repl(file, rootPath.uri.fsPath, context.extensionPath);
				});
		} catch(err) {
				vscode.window.showErrorMessage('Failed to parse .vscode/vdbg.json');
			}
		}
		if (!update_json_only && CONTEXT_PANEL && vdbgjson.panel_scripts.length > 0) {
			fileWatchers.forEach((fileWatcher) => {
				fileWatcher.dispose();
			});
			fileWatchers.length = 0;
			vdbgjson.access_scripts.forEach((file:any) => {
				let listener = vscode.workspace.createFileSystemWatcher(file.src).onDidChange((uri) => {
					const filePath = uri.fsPath;
					const fileContent = fs.readFileSync(filePath, 'utf8');
					if (file.listen && file.src === filePath) {
						CONTEXT_PANEL?.sendMessage({ topic: file.label, data: fileContent });
					}
				});
				fileWatchers.push(listener);
				context.subscriptions.push(listener);
			});
			CONTEXT_PANEL.createPanel({}, "vdbg panel", rootPath, vdbgjson.panel_scripts, vdbgjson.access_scripts, () => {
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
							const refresh = (t:vdbg_sources.LanguageDbgType) => {
								VDBG_PANEL?.setType(t, vdbgjson.vdbg_scripts);
							};
							const type = session.configuration.type;
							if (type == 'cppdbg') {
								type_ = new CppdbgType(VDBG_PANEL._channel, session, lastStackFrame.id, refresh);
							// } else if (type == 'cppvsdbg') {
							// 	type_ = new CppVsDbgType(VDBG_PANEL._channel, session, lastStackFrame.id, refresh);
							} else if (type == 'debugpy' || type == 'python') {
								type_ = new PydbgType(VDBG_PANEL._channel, session, lastStackFrame.id, refresh);
							} else {
								vscode.window.showErrorMessage(`There is no vdbg parser for debug type "${type}"`)
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
