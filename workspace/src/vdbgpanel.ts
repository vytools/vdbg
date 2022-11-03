import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
import * as vdbg_sources from './sources';
// https://microsoft.github.io/debug-adapter-protocol/specification

export class vDbgPanel {
	public _session: vscode.DebugSession | undefined;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	private _breakpoints: Array<vdbg_sources.Vdbg>;
	private _handlerUri: vscode.Uri|undefined;
	private _firststop: Boolean = true;

	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vdbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}

	public setupGdb() {
		let top = this;
		top?._session?.customRequest('evaluate', {expression:`-exec set print elements 0`, context:'repl'}).then(r1 => {
			top?._session?.customRequest('evaluate', {expression:`-exec set print repeats 0`, context:'repl'}).then(r2 => {
			});
		});
	}
	
	public terminatedDebug() {
		this._firststop = true;
	}
	
	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		if (this._firststop) {
			this._firststop = false;
			this.setupGdb();
		}

		for (var ii = 0; ii < this._breakpoints.length; ii++) {
			let bp = this._breakpoints[ii];
			if (bp.path.path == bpsource.source.path && bp.line == bpsource.line) {
				if (bp?.obj?.variables) {
					let n = Object.keys(bp.obj.variables).length;
					let obj = JSON.parse(JSON.stringify(bp.obj));
					for (const [key, value] of Object.entries(obj.variables)) {
						this?._session?.customRequest('evaluate', {expression:`-exec print ${value}`, context:'repl'}).then(response => {
							obj.variables[key] = response.result;
							n -= 1;
							if (n == 0) this.sendMessage(obj);
						});
					}
				} else {
					this.sendMessage(bp.obj);
				}
				break;
			}
		}
	}

	public refreshVgdbBreakpoints() {
		if (!(this._panel && this._session)) {
			vscode.window.showErrorMessage('vdbg error: No debug session or panel');
			return false;
		};
		try {
			this._breakpoints = vdbg_sources.search(this._session);
		} catch(err) {
			vscode.window.showErrorMessage('vdbg error: Failed to find breakpoints '+err);
			return false
		}
		this.sendMessage({ topic:'__on_get_breakpoints__', data:this._breakpoints });		
		return true;
	}

	public refreshSession(session: vscode.DebugSession) {
		this._session = session;
		if (!session.workspaceFolder) {
			vscode.window.showErrorMessage('vdbg error: No workspace loaded');
			return;
		};
		let folderUri:vscode.WorkspaceFolder = session.workspaceFolder;
		let vdbgConfig = session.configuration.vdbg;
		if (!vdbgConfig || !vdbgConfig.sources) {
			vscode.window.showErrorMessage(`vdbg error: No "vdbg" field in launch configuration ${JSON.stringify(session.configuration)}`);
			return;
		}		

		for (var ii = 0; ii < vdbgConfig.sources.length; ii++) {
			let resource = vdbgConfig.sources[ii];
			let src = vscode.Uri.joinPath(folderUri.uri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', resource.dst);
			// vscode.window.showInformationMessage(`vdbg: Installing ${src} to ${dst}`);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) this._handlerUri = (dst).with({ 'scheme': 'vscode-resource' });
			try {
				if (fs.existsSync(src)) {
					let targetDir = path.dirname(dst.fsPath);
					if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
					if (fs.existsSync(dst.fsPath)) fs.rmSync(dst.fsPath);
					fs.copyFileSync(src,dst.fsPath);
				} else {
					vscode.window.showErrorMessage(`File ${src} does not exist`);
				}
			} catch(err) {
				vscode.window.showErrorMessage(`Problem with source file ${src}: ${err}`);
			}
		}
		this._update();
		this._panel?.reveal(vscode.ViewColumn.Two);
		if (!this.refreshVgdbBreakpoints()) return;
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
					this.refreshVgdbBreakpoints();
				} else if (message.type == 'vdbg_bp') {
				} else if (message.type == 'exec' && this._session) {
					this._session.customRequest('evaluate', {expression:`-exec ${message.expression}`, context:'repl'}).then(response => {
						if (message.topic) this.sendMessage({topic:message.topic,response:response});
					});
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
		// const stylesResetUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		// const stylesMainUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		let html = fs.readFileSync(vscode.Uri.joinPath(this._extensionUri, 'media', '__handler__.html').fsPath,{encoding:'utf8', flag:'r'});
		console.log('_update')
		this._panel.webview.html = html.replace('/*HANDLER_IMPORT*/',`"${this._handlerUri}"`);;	
	}

}