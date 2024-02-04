import * as vscode from 'vscode';
import { CppdbgType } from './types/cppdbg';
import { PydbgType } from './types/pydbg';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './types/sources';
import { VyToolsProvider } from './vy_tools_providers';

// https://microsoft.github.io/debug-adapter-protocol/specification

export function activate(context: vscode.ExtensionContext) {
	let VDBG:vDbgPanel | undefined;
	let lastStackFrame:vdbg_sources.stackTraceBody|undefined
	let triggered = false;
	const channel:vscode.OutputChannel = vscode.window.createOutputChannel("vdbg");
	const INIT_STATE:number = 0;
	const SETT_STATE:number = 1;
	let state = INIT_STATE;
	let type_:vdbg_sources.LanguageDbgType | undefined
	context.subscriptions.push( vscode.debug.onDidStartDebugSession(session => {
		VDBG?.setSession(session);
	}) );
	context.subscriptions.push( vscode.debug.onDidTerminateDebugSession(session => {
		VDBG?.sendMessage({'topic':'__terminate_debug_session__'});
		state = INIT_STATE;
	}) );

	// VytoolsProvider
	// const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	// 	? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	// Samples of `window.registerTreeDataProvider`
	const vyToolsProvider = new VyToolsProvider(context.extensionUri);
	vscode.window.registerTreeDataProvider('vyToolsGroups', vyToolsProvider);
	vscode.commands.registerCommand('vyToolsGroups.refreshGroup', (vygrp) => {
		vyToolsProvider.refresh_group(vygrp.obj._id);
	});
	vscode.commands.registerCommand('vyToolsGroups.addGroup', async () => {
		vyToolsProvider.add_group();
	});
	vscode.commands.registerCommand('vyToolsGroups.openNodule', (arg) => {
		// https://code.visualstudio.com/api/extension-guides/command#programmatically-executing-a-command
		// https://code.visualstudio.com/api/references/commands
		// let df = vscode.Uri.parse('/home/nate/Documents/nate/vybase/spherebots');
		// vscode.commands.executeCommand('remote-containers.openWorkspace',df);
		// vscode.commands.executeCommand('vscode.openFolder',df,{forceReuseWindow:true})
		vscode.window.showInformationMessage(`Successful openNodule ${arg}`);
	});

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
							let refresh = (t:vdbg_sources.LanguageDbgType) => { VDBG?.setType(t); }
							let type = session.configuration.type;
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
