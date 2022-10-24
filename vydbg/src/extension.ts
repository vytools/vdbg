import * as vscode from 'vscode';
const fs = require('fs');
var path = require('path');
import * as vydbg_sources from './sources';
// https://microsoft.github.io/debug-adapter-protocol/specification

class VyDebuggerPanel {
	public _session: vscode.DebugSession | undefined;
	public readonly viewType = 'vyDebugger';
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	private _breakpoints: Array<vydbg_sources.VyGdb>;
	private _handlerUri: vscode.Uri|undefined;
	
	public breakPointsSet(breakpoints : Object) {
		// console.log('setBreakpointsA: ',breakpoints);
		// console.log('setBreakpointsB: ',this._breakpoints);
	}

	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vydbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}

	public checkBreakpoint(bpsource:vydbg_sources.stackTraceBody) {
		return vydbg_sources.checkVariables(this._breakpoints, bpsource);
	}

	public refreshSession(session: vscode.DebugSession) {
		this._session = session;
		this._breakpoints = vydbg_sources.search(session);

		if (!this._panel) return;
		// if (!this._session) {
		// 	vscode.window.showErrorMessage('vydbg error: No debug session');
		// 	return
		// };
		if (!session.workspaceFolder) {
			vscode.window.showErrorMessage('vydbg error: No workspace loaded');
			return;
		};
		let folderUri:vscode.WorkspaceFolder = session.workspaceFolder;
		let vydebugConfig = null;
		try {
			vydebugConfig = require(vscode.Uri.joinPath(folderUri.uri,'vydbg.json').fsPath);
		} catch(err) {
			vscode.window.showErrorMessage('vydbg error: No parseable vydbg.json file in '+folderUri.uri.fsPath);
			return;
		}
		// vscode.workspace.fs.writeFile(vydbgFile);

		for (var ii = 0; ii < vydebugConfig.sources.length; ii++) {
			let resource = vydebugConfig.sources[ii];
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
			'Vy Debugger',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			},
		);
	
		// Not currently using this but it would be nice if I could. I can't seem to use this with vydbg
		// scheme because it's blocked by cors. It's doesn't seem to work either to enhance non blocked ones
		// (e.g. vscode-resource) 
		this._contentProvider = vscode.workspace.registerTextDocumentContentProvider("vydbg",{
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
				if (message.type == 'alert') {
					vscode.window.showErrorMessage(message.text);
				} else if (message.type == 'get_breakpoints') {
					this.sendMessage({ topic:'__breakpoints__', data:vydbg_sources.search(this._session) });		
				} else if (message.type == 'debug') {
					if (this._session) {
						this._session.customRequest('stackTrace', { threadId: 1 }).then(sTrace => {
							const frameId = sTrace.stackFrames[0].id; 
							message.data.frameId = frameId;
							if (this._session) {
								this._session.customRequest(message.command, message.data);
							}
						});
					}
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		// Clean up our resources
		if (this._panel) this._panel.dispose();
		this._contentProvider.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		this._panel = undefined;
		const resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
		fs.rmdirSync(resources, { recursive: true });

	}

	private _update() {
		if (!this._panel) return;
		this._panel.title = 'Vy Debugger';
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
					<link  href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
					<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.7.0/css/all.css" integrity="sha384-lZN37f5QGtY3VHgisS14W3ExzMWZxybE1SJSEsQp9S+oqd12jhcu+A56Ebc1zFSJ" crossorigin="anonymous">
					<link href="${stylesResetUri}" rel="stylesheet">
					<link href="${stylesMainUri}" rel="stylesheet">
					<style>.vscode_vydbg_full { width:100%; height:100%; overflow:hidden }</style>
					<title>Vy Debugger</title>
				</head>
				<body class="vscode_vydbg_full">
					<div class="vscode_vydbg_full" style="position:absolute;">
						<div class="vscode_vydbg_full content"></div>
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

let VYD:VyDebuggerPanel | undefined;

const customXRequest = function(session:vscode.DebugSession, cmd:string, args) {
	session.customRequest('stackTrace', { threadId: 1 }).then(sTrace => {
		args.frameId = sTrace.stackFrames[0].id; 
		session.customRequest(cmd, args);
	});
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.debug.onDidTerminateDebugSession(session => {
			// VyDebuggerPanel._session = undefined;
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
			let variables = false;
			if (!VYD) VYD = new VyDebuggerPanel(context.extensionUri, session);
			VYD.refreshSession(session);
	
			return {
				onWillReceiveMessage: async msg => {
					console.log(`A ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					console.log(`B ${JSON.stringify(msg, undefined, 2)}`)
					if (VYD && msg.type == 'event') { // event = continue|stepIn|stepOut|next|stopped
						if (msg.event === "stopped" && msg.body && msg.body.reason == "breakpoint") {
							stoppedAt = true;
							// VYD.sendMessage({ topic:'thistop', data:{} });
						} else if (msg.event == 'output') {
							// console.log('mmmmm',msg)
						}
					} else if (VYD && msg.type == 'response') { // command = variables|stackTrace|scopes|thread
						if (msg.command == 'variables') {
						} else if (msg.command == 'evaluate') {
							console.log('evaluate::',msg)
							if (variables) variables = false;
							// 	variables.forEach(v => {
							// 		if (v.expression == msg.body.expression)
							// 	})
							// }
						} else if (stoppedAt == true && msg.command == 'stackTrace') {
							stoppedAt = false;
							let lastStackFrame = msg.body.stackFrames.slice(-1).pop();
							// if (lastStackFrame) VYD.sendMessage({topic:'__stopped__',data:lastStackFrame});
							if (lastStackFrame && !variables) {
								variables = VYD.checkBreakpoint(lastStackFrame);
								if (variables) {
									// variables.forEach(v => {
									// 	customXRequest(session,'evaluate',{expression:v.expression,context:'watch'});
									// })
								}
							}
						} else if (msg.command == 'setBreakpoints') {
							VYD.breakPointsSet(msg.body.breakpoints);
						}
					} else {
						// console.log('============== msg ',msg);
					}
				},
			};
		},
	});	

}
