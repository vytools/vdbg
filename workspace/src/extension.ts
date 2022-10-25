import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
const JSON5 = require('json5');
import * as vdbg_sources from './sources';
// https://microsoft.github.io/debug-adapter-protocol/specification

class vDbgPanel {
	public _session: vscode.DebugSession | undefined;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	private _breakpoints: Array<vdbg_sources.Vdbg>;
	private _handlerUri: vscode.Uri|undefined;
	
	public breakpointCount() {
		return this._breakpoints.length;
	}

	public breakPointsSet(breakpoints : Object) {
		console.log('setBreakpointsA: ',breakpoints);
		console.log('setBreakpointsB: ',this._breakpoints);
	}

	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vdbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}

	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		for (var ii = 0; ii < this._breakpoints.length; ii++) {
			let bp = this._breakpoints[ii];
			if (bp.path.path == bpsource.source.path && bp.line == bpsource.line) {
				return JSON.parse(JSON.stringify(bp.obj));
			}
		}
		return false;
	}

	public refreshSession(session: vscode.DebugSession) {
		this._session = session;
		this._breakpoints = vdbg_sources.search(session);
		// console.log('this._breakpoints = ',this._breakpoints)
		if (!this._panel) return;
		if (!this._session) {
			vscode.window.showErrorMessage('vdbg error: No debug session');
			return
		};
		if (!session.workspaceFolder) {
			vscode.window.showErrorMessage('vdbg error: No workspace loaded');
			return;
		};
		let folderUri:vscode.WorkspaceFolder = session.workspaceFolder;
		let vdbgConfig = session.configuration.vdbg;
		if (!vdbgConfig || !vdbgConfig.sources) {
			vscode.window.showErrorMessage('vdbg error: No "vdbg" field in launch configuration');
			return;
		}

		for (var ii = 0; ii < vdbgConfig.sources.length; ii++) {
			let resource = vdbgConfig.sources[ii];
			let src = vscode.Uri.joinPath(folderUri.uri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', resource.dst);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) {
				this._handlerUri = (dst).with({ 'scheme': 'vscode-resource' });
			}
			try {
				if (fs.existsSync(src)) {
					let targetDir = path.dirname(dst.fsPath);
					if (!fs.existsSync(targetDir)) {
						fs.mkdirSync(targetDir, { recursive: true });
					}
					fs.copyFileSync(src,dst.fsPath);
				} else {
					vscode.window.showErrorMessage(`File ${src} could not be copied`);
				}
			} catch(err) {
				vscode.window.showErrorMessage(`Problem with source file ${src}: ${err}`);
			}
		}
		this._update();
		this._panel.reveal(vscode.ViewColumn.Two);
	}

	constructor(extensionUri: vscode.Uri, session: vscode.DebugSession) {
		this._breakpoints = [];
		this._extensionUri = extensionUri;
		this._session = session;
		this._panel = vscode.window.createWebviewPanel(
			this.viewType,
			'Vdbg Window',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			},
		);
	
		// Not currently using this but it would be nice if I could. I can't seem to use this with vdbg
		// scheme because it's blocked by cors. It's doesn't seem to work either to enhance non blocked ones
		// (e.g. vscode-resource) 
		this._contentProvider = vscode.workspace.registerTextDocumentContentProvider("vdbg",{
			provideTextDocumentContent(uri: vscode.Uri): string {
				return 'console.log("BY JOVE!")';
			}
		});

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => { this.dispose(); }, null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => { if (this._panel && this._panel.visible) this._update(); }, null, this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				if (message.type == 'error') {
					vscode.window.showErrorMessage(message.text);
				} else if (message.type == 'info') {
					vscode.window.showInformationMessage(message.text);
				} else if (message.type == 'get_breakpoints') {
					this.sendMessage({ topic:'__breakpoints__', data:vdbg_sources.search(this._session) });		
				} else if (message.type == 'request') {
					if (this._session) {
						this._session.customRequest('stackTrace', { threadId: 1 }).then(sTrace => {
							message.data.frameId = sTrace.stackFrames[0].id;
							if (this._session) {
								this._session.customRequest(message.command, message.data).then(response => {
									if (message.response_topic) this.sendMessage({topic:message.response_topic,response:response});
								});
							}
						});
					}
				}
			},
			null,
			this._disposables
		);
	}

	public disposed() {
		return this._disposables.length == 0;
	}

	public dispose() {
		// Clean up our resources
		if (this._panel) this._panel.dispose();
		this._contentProvider.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}
		this._panel = undefined;
		const resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
		fs.rmSync(resources, { recursive: true });
	}

	private _update() {
		if (!this._panel) return;
		this._panel.title = 'Vdbg Window';
		const stylesResetUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const stylesMainUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		if (!this._handlerUri) {
			this._panel.webview.html = `<!DOCTYPE html>
			<html lang="en">
				<body>
					<a>no handler defined</a>
				</body>
			</html>
			`;	
		} else {
			this._panel.webview.html = `<!DOCTYPE html><html lang="en">
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
					<link href="${stylesResetUri}" rel="stylesheet">
					<link href="${stylesMainUri}" rel="stylesheet">
					<style>.vdbg_full { width:100%; height:100%; overflow:hidden }</style>
					<title>Vdbg Window</title>
				</head>
				<body class="vdbg_full">
					<div class="vdbg_full" style="position:absolute;">
						<div class="vdbg_full content"></div>
					</div>
					<script type="module">
						import {handler, initializer} from "${this._handlerUri}";
						initializer(document.querySelector('.content'), acquireVsCodeApi());
						window.addEventListener('message', event => {
							handler(event.data);
						});
					</script>
				</body>
			</html>`;
		}
	}

}

let VDBG:vDbgPanel | undefined;

const set_by_path = function(obj:any, path:Array<string>, val:any) {
	let p0 = path[0].replace(/^\[/, '').replace(/\]$/, '').replace(/'$/, '').replace(/^'/, '');
	path = path.slice(1);
	if (path.length == 0) {
		obj[p0] = val;
	} else {
		if (!obj.hasOwnProperty(p0) || (!Array.isArray(obj[p0]) && path[0] == '[0]')) {
			obj[p0] = (path[0] == '[0]') ? [] : {};
		}
		set_by_path(obj[p0], path, val);
	}
}

const parse_value = function(v:string) {
	try {
		return JSON5.parse(v);
	} catch(err) {
		let vv = parseFloat(v);
		return (isNaN(vv)) ? v : vv;
	}
}

const subvariables = function(session:vscode.DebugSession, response:any, arg2:any, path:Array<string>) {
	// console.log(response)
	if (response.command == 'evaluate' && response.variablesReference != 0) {
		set_by_path(arg2.obj, path, {});
		session.customRequest('variables', {variablesReference:response.variablesReference}).then(response2 => {
			response2.command = 'variables';
			subvariables(session, response2, arg2, path);
		});
	} else if (response.command == 'variables') {
		arg2.nvariables -= 1;
		arg2.nvariables += response.variables.length;
		response.variables.forEach((varx:any) => {
			if (['special variables','function variables','len()'].indexOf(varx.name) > -1) {
				arg2.nvariables -= 1;
			} else if (varx.variablesReference == 0) {
				set_by_path(arg2.obj, path.concat([varx.name]), parse_value(varx.value));
				arg2.nvariables -= 1;
			} else {
				session.customRequest('variables', {variablesReference:varx.variablesReference}).then(response2 => {
					response2.command = 'variables';
					subvariables(session, response2, arg2, path.concat([varx.name]));
				});
			}
			if (arg2.nvariables == 0 && VDBG) VDBG.sendMessage(arg2.obj);
		});
	} else {
		set_by_path(arg2.obj, path, parse_value(response.result));
		arg2.nvariables -= 1;
		if (arg2.nvariables == 0 && VDBG) VDBG.sendMessage(arg2.obj);
	}
}

export function activate(context: vscode.ExtensionContext) {
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
			let stoppedAt = false;
			if (!VDBG || VDBG.disposed()) {
				VDBG = new vDbgPanel(context.extensionUri, session)
			}
			// vscode.window.showInformationMessage(`vdbg: Found ${VDBG.breakpointCount()} breakpoints`);
			VDBG.refreshSession(session);
	
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					// console.log(`B ${msg.type} ${JSON.stringify(msg, undefined, 2)}`)
					if (VDBG && msg.type == 'event' && msg.event === "stopped" && msg.body?.reason == "breakpoint") { // event = continue|stepIn|stepOut|next|stopped
						stoppedAt = true;
					} else if (VDBG && msg.type == 'response') { // command = variables|stackTrace|scopes|thread
						if (stoppedAt && msg.command == 'stackTrace') {
							stoppedAt = false;
							if (msg.body && msg.body.stackFrames && msg.body.stackFrames.length > 0) {
								let lastStackFrame = msg.body.stackFrames.slice(-1).pop();
								let breakpoint = VDBG.checkBreakpoint(lastStackFrame);
								if (!breakpoint) {
								} else if (breakpoint.hasOwnProperty('variables')) {
									let arg2 = {
										nvariables: Object.keys(breakpoint.variables).length,
										frameId:lastStackFrame.id,
										obj:breakpoint
									};
									for (const [key, exprsn] of Object.entries(breakpoint.variables)) {
										let args = {expression:exprsn,context:'watch',frameId:lastStackFrame.id}; 
										session.customRequest('evaluate', args).then(response => {
											response.command = 'evaluate';
											subvariables(session, response, arg2, ["variables",key]);
										});
									}
								} else {
									VDBG.sendMessage(breakpoint);
								}
							}
						} else if (msg.command == 'setBreakpoints') {
							VDBG.breakPointsSet(msg.body.breakpoints);
						}
					} else {
						// console.log('============== msg ',msg);
					}
				},
			};
		},
	});	

}
