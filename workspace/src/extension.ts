import * as vscode from 'vscode';
import { CppdbgType } from './types/cppdbg';
import { PydbgType } from './types/pydbg';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './types/sources';

// https://microsoft.github.io/debug-adapter-protocol/specification

export function activate(context: vscode.ExtensionContext) {
	let VDBG:vDbgPanel | undefined;
	let lastStackFrame:vdbg_sources.stackTraceBody | undefined;
	const INIT_STATE:number = 0;
	const SETT_STATE:number = 1;
	let state = INIT_STATE;
	let type_:vdbg_sources.LanguageDbgType | undefined
	context.subscriptions.push( vscode.debug.onDidStartDebugSession(session => {
		VDBG?.setSession(session);
	}) );
	// context.subscriptions.push( vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {  }) );
	// context.subscriptions.push( vscode.debug.onDidChangeBreakpoints(ev => { }) );
	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			if (!VDBG || VDBG.disposed()) {
				state = INIT_STATE;
				VDBG = new vDbgPanel(context.extensionUri);
			}
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					// console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					if (VDBG && msg.type == 'response' && msg.command == 'stackTrace' && msg.body?.stackFrames?.length > 0) { // command = variables|stackTrace|scopes|thread
						lastStackFrame = msg.body.stackFrames[0];
						if (state == INIT_STATE && lastStackFrame) {
							state = SETT_STATE;
							let refresh = (t:vdbg_sources.LanguageDbgType) => { VDBG?.setType(t); }
							let type = session.configuration.type;
							if (type == 'cppdbg') {
								type_ = new CppdbgType(session, lastStackFrame.id, refresh);
							} else if (type == 'python') {
								type_ = new PydbgType(session, lastStackFrame.id, refresh);
							}
						}
					} else if (VDBG && msg.type == 'response' && msg.command == 'variables') { // command = variables|stackTrace|scopes|thread
						if (lastStackFrame) VDBG.checkBreakpoint(lastStackFrame); // send in previous stackFrame
					}
				},
			};
		},
	});	

}
