import * as vscode from 'vscode';
import { vDbgPanel } from './vdbgpanel';
import * as vdbg_sources from './sources';

// https://microsoft.github.io/debug-adapter-protocol/specification

export function activate(context: vscode.ExtensionContext) {
	let VDBG:vDbgPanel | undefined;
	let lastStackFrame:vdbg_sources.stackTraceBody | undefined;
	
	context.subscriptions.push(
		vscode.debug.onDidTerminateDebugSession(session => {
		})
	);

	context.subscriptions.push(
		vscode.debug.onDidReceiveDebugSessionCustomEvent(ev => {
		})
	);

	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			let first = true;
			if (!VDBG || VDBG.disposed()) {
				VDBG = new vDbgPanel(context.extensionUri);
			}
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					// if (msg.type == 'event') {
					//  console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					// } else {
					// 	console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2).length} ${Object.keys(msg)}`)
					// }
					if (VDBG && msg.type == 'response' && msg.command == 'stackTrace' && msg.body?.stackFrames?.length > 0) { // command = variables|stackTrace|scopes|thread
						lastStackFrame = msg.body.stackFrames[0];
						if (first) {
							first = false;
							session.customRequest('evaluate', {expression:`-exec info sources`, frameId:lastStackFrame?.id, context:'repl'}).then(response => {
								try {
									const vdbgs:vdbg_sources.Vdbg = vdbg_sources.search(response.result);
									// ... this messes up already set breakpoints
									// let count = vdbgs.breakpoints.length;
									// vdbgs.breakpoints.forEach(bp => {
									// 	bp.line += 1;
									// 	let obj = {source:{name:bp.file,path:bp.path.fsPath},lines:[bp.line],breakpoints:[{line:bp.line}],sourceModified:false};
									// 	session.customRequest('setBreakpoints',obj).then(rsp => {
									// 		if (rsp.breakpoints && rsp.breakpoints.length == 1) bp.line = rsp.breakpoints[0].line;
									// 		count -= 1;
									// 	});
									// });
									VDBG?.refreshSession(vdbgs, session);
								} catch(err) {
									vscode.window.showErrorMessage('vdbg error: Failed to find breakpoints '+err);
									return false;
								}
							});


						}
					} else if (VDBG && msg.type == 'response' && msg.command == 'variables') { // command = variables|stackTrace|scopes|thread
						if (lastStackFrame) VDBG.checkBreakpoint(lastStackFrame); // send in previous stackFrame
					}
				},
			};
		},
	});	

}
