import * as vscode from 'vscode';
import { vDbgPanel } from './vdbgpanel';
// https://microsoft.github.io/debug-adapter-protocol/specification

export function activate(context: vscode.ExtensionContext) {
	let VDBG:vDbgPanel | undefined;
	
	context.subscriptions.push(
		vscode.debug.onDidTerminateDebugSession(session => {
			VDBG?.terminatedDebug();
		})
	);

	context.subscriptions.push(
		vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {
			// console.log('ev',ev)
		})
	);

	vscode.debug.registerDebugAdapterTrackerFactory('*', {

		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			if (!VDBG || VDBG.disposed()) {
				VDBG = new vDbgPanel(context.extensionUri, session)
			}
			VDBG.refreshSession(session);
	
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					// console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					if (VDBG && msg.type == 'response' && msg.command == 'stackTrace' && msg.body?.stackFrames?.length > 0) { // command = variables|stackTrace|scopes|thread
						VDBG.checkBreakpoint(msg.body.stackFrames[0]); // send in first stackFrame
					}
				},
			};
		},
	});	

}
