import * as vscode from 'vscode';
import { vDbgPanel } from './vdbgpanel';
import { get_variables } from './parser';

// https://microsoft.github.io/debug-adapter-protocol/specification


export function activate(context: vscode.ExtensionContext) {
	let VDBG:vDbgPanel | undefined;
	
	context.subscriptions.push(
		vscode.debug.onDidTerminateDebugSession(session => {
			// vDbgPanel._session = undefined;
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
						let firstStackFrame = msg.body.stackFrames[0];
						let breakpoint = VDBG.checkBreakpoint(firstStackFrame);
						if (breakpoint?.hasOwnProperty('variables')) {
							// vscode.window.showInformationMessage(`Breakpoint ${JSON.stringify(breakpoint)}`);
							get_variables(session, breakpoint, firstStackFrame.id, VDBG);
						} else {
							VDBG.sendMessage(breakpoint);
						}
					} else if (VDBG && msg.type == 'response' && msg.command == 'setBreakpoints') {
						// console.log('setBreakpointsA: ',msg.body.breakpoints);
						// console.log('setBreakpointsB: ',VDBG._breakpoints);
					}
				},
			};
		},
	});	

}
