import * as vscode from 'vscode';
const fs = require('fs');
var path = require('path');
import { search } from './sources';
// protocol.registerSchemesAsPrivileged([
// 	{
// 		scheme: 'vydbg',
// 		privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, allowServiceWorkers: true, }
// 	}
// ]);

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('vyDebugger.start', () => {
			// VyDebuggerPanel.createOrShow(context.extensionUri);
		})
	);

	context.subscriptions.push(
		vscode.debug.onDidTerminateDebugSession(session => {
			// VyDebuggerPanel.currentSession = undefined;
		})
	);

	vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker: (session: vscode.DebugSession) => {
			VyDebuggerPanel.currentSession = session;
			VyDebuggerPanel.createOrShow(context.extensionUri);
			search(session);
			return {
				onWillReceiveMessage: async msg => {
					// console.log(`> ${JSON.stringify(msg, undefined, 2)}`)
				},
				onDidSendMessage: async msg => {
					if (!VyDebuggerPanel.currentPanel) return;
					// console.log('event:',msg)
					if (msg.type == 'event') { // event = continue|stepIn|stepOut|next|stopped
						if (msg.event === "stopped") {
							if (VyDebuggerPanel.currentSession) {
								VyDebuggerPanel.currentSession.customRequest('stackTrace', { threadId: 1 }).then(sTrace => {
									const frameId = sTrace.stackFrames[0].id; 
									let arg = {expression: 'count*3', frameId: frameId, context:'watch'};
									if (VyDebuggerPanel.currentSession) VyDebuggerPanel.currentSession.customRequest('evaluate', arg)
								});
								VyDebuggerPanel.sendMessage({ topic:'thistop', data:{} });
							}
						}
					} else if (msg.type == 'response') { // command = variables|stackTrace|scopes|thread
						// console.log('response:',msg.command)
						if (msg.command == 'variables') {
							// console.log('variables: ',msg.body)
						} else if (msg.command == 'evaluate') {
							// console.log('watch: ',msg)
						} else if (msg.command == 'setBreakpoints') {
							VyDebuggerPanel.breakPointsSet(msg.body.breakpoints);
						}
					} else {
						// console.log('============== msg ',msg);
					}
				},
			};
		},
	});	

}

class VyDebuggerPanel {
	 // Track the currently panel. Only allow a single panel to exist at a time.
	public static currentPanel: VyDebuggerPanel | undefined;
	public static currentSession: vscode.DebugSession | undefined;
	public static variableList: Object | {};

	public static readonly viewType = 'vyDebugger';
	private readonly _breakpoints: Object;
	private readonly _handlerUri: vscode.Uri|undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _disposables: vscode.Disposable[] = [];
	
	public static breakPointsSet(breakpoints : Object) {
		console.log('setBreakpoints: ',breakpoints);
	}

	public static sendMessage(data: Object) {
		if (VyDebuggerPanel.currentPanel) {
			VyDebuggerPanel.currentPanel._panel.webview.postMessage(data);
		} else {
			console.log('would send '+JSON.stringify(data)+' but no current webview')
		}
	}

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.ViewColumn.Two; // vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

		// If we already have a panel, show it.
		if (VyDebuggerPanel.currentPanel) {
			VyDebuggerPanel.currentPanel._panel.reveal(column);
			return;
		}
		const session = VyDebuggerPanel.currentSession;
		if (!session) {
			vscode.window.showErrorMessage('vydbg error: No debug session');
		} else {
			const folder = session.workspaceFolder;
			if (!folder) {
				vscode.window.showErrorMessage('vydbg error: No workspace loaded');
			} else {
				const options = {
					enableScripts: true,
					localResourceRoots: [
						vscode.Uri.joinPath(extensionUri, 'media')
					]
				}
		
				// Otherwise, create a new panel.
				const panel = vscode.window.createWebviewPanel(
					VyDebuggerPanel.viewType,
					'Vy Debugger',
					column || vscode.ViewColumn.Two,
					options,
				);
		
				VyDebuggerPanel.currentPanel = new VyDebuggerPanel(panel, extensionUri, folder.uri);
			}
		}

	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, folderUri: vscode.Uri) {
		this._panel = panel;
		this._breakpoints = {};
		this._extensionUri = extensionUri;
		this._contentProvider = vscode.workspace.registerTextDocumentContentProvider(
			"vydbg",{
			provideTextDocumentContent(uri: vscode.Uri): string {
				return 'console.log("BY JOVE!")';
			}
		});

		let vydebugConfig = null;
		try {
			vydebugConfig = require(vscode.Uri.joinPath(folderUri,'vydbg.json').fsPath);
		} catch(err) {
			vscode.window.showErrorMessage('vydbg error: No parseable vydbg.json file in '+folderUri.fsPath);
			return;
		}
		// vscode.workspace.fs.writeFile(vydbgFile);
		
		// Not currently using this but it would be nice if I could. I can't seem to use this with vydbg
		// scheme because it's blocked by cors. It's doesn't seem to work either to enhance non blocked ones
		// (e.g. vscode-resource) 
		let prog = vydebugConfig.active_program;
		if (VyDebuggerPanel.currentSession && prog && vydebugConfig.programs && vydebugConfig.programs[prog]) {
			let program = vydebugConfig.programs[prog];
			const breakpoints: vscode.Breakpoint[] = [];
			Object.keys(program).forEach(bpname => {
				let uri = vscode.Uri.joinPath(folderUri,'junk.py');
				let bp = new vscode.SourceBreakpoint(new vscode.Location(uri, new vscode.Position(3, 0)));
				breakpoints.push(bp)
			});
			vscode.debug.addBreakpoints(breakpoints)
		}

		for (var ii = 0; ii < vydebugConfig.sources.length; ii++) {
			let resource = vydebugConfig.sources[ii];
			let src = vscode.Uri.joinPath(folderUri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(extensionUri, 'media', 'resources', resource.dst);
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


		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => {
			this.dispose();
		}, null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				if (message.type == 'alert') {
					vscode.window.showErrorMessage(message.text);
				} else if (message.type == 'debug') {
					if (VyDebuggerPanel.currentSession) {
						VyDebuggerPanel.currentSession.customRequest('stackTrace', { threadId: 1 }).then(sTrace => {
							const frameId = sTrace.stackFrames[0].id; 
							message.data.frameId = frameId;
							if (VyDebuggerPanel.currentSession) {
								VyDebuggerPanel.currentSession.customRequest(message.command, message.data);
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
		VyDebuggerPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();
		this._contentProvider.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
		const resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
		fs.rmdirSync(resources, { recursive: true });

	}

	private _update() {
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

