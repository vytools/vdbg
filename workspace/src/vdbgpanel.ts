import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
import * as vdbg_sources from './sources';
// https://microsoft.github.io/debug-adapter-protocol/specification

const makeid = function() {
    var result           = 'x';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 20; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export class vDbgPanel {
	public _session: vscode.DebugSession | undefined;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _dynamicUri: Array<vscode.Uri> = []
	private _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	private _vdbgs: vdbg_sources.Vdbg = {breakpoints:[], snips:[]};
	private _freshstart: Boolean = true;

	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vdbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}
	
	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		if (this._freshstart) {
			this._freshstart = false;
			this?._session?.customRequest('evaluate', {expression:`-exec set print elements 0`, context:'repl'});
			this?._session?.customRequest('evaluate', {expression:`-exec set print repeats 0`, context:'repl'});
		}

		for (var ii = 0; ii < this._vdbgs.breakpoints.length; ii++) {
			let bp = this._vdbgs.breakpoints[ii];
			if (bp.path.path == bpsource.source.path && bp.line == bpsource.line) {
				if (bp?.obj?.variables) {
					let n = Object.keys(bp.obj.variables).length;
					let obj = JSON.parse(JSON.stringify(bp.obj));
					for (const [key, value] of Object.entries(obj.variables)) {
						let req = {expression:`-exec print ${value}`, frameId:bpsource.id, context:'repl'};
						if (!this?._session) {
							vscode.window.showInformationMessage('zoinks!')
						}
						this?._session?.customRequest('evaluate', req).then(response => {
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

	public refreshSession(vdbgs:vdbg_sources.Vdbg, session: vscode.DebugSession) {
		this._freshstart = true;
		this._session = session;
		this._dynamicUri.splice(0,this._dynamicUri.length);
		if (!(this._panel && this._session)) {
			vscode.window.showErrorMessage('vdbg error: No debug session or panel');
			return false;
		} else if (!this._session.workspaceFolder) {
			vscode.window.showErrorMessage('vdbg error: No workspace loaded');
			return false;
		}

		this._vdbgs = vdbgs;
		let folderUri:vscode.WorkspaceFolder = this._session.workspaceFolder;
		let vdbgConfig = this._session.configuration.vdbg;
		if (!vdbgConfig || !vdbgConfig.sources) {
			vscode.window.showErrorMessage(`vdbg error: No "vdbg" field in launch configuration ${JSON.stringify(this._session.configuration)}`);
			return;
		}

		let jspaths:Array<vscode.Uri> = [];

		// order will end up being:
		// - 1. load from media/js (vdbg built in, )
		let jspath = vscode.Uri.joinPath(this._extensionUri, 'media','js');
		let files = fs.readdirSync(jspath.fsPath);
		for (var ii = 0; ii < files.length; ii++) {
			let p = vscode.Uri.joinPath(jspath,files[ii]);
			if (fs.statSync(p.fsPath).isFile()) jspaths.push(this._panel?.webview.asWebviewUri(p));
		}

		// - 2. load from embedded <vdbg_js ... vdb_js> tags
		let dynamicFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'dynamic');
		if (!fs.existsSync(dynamicFolder.fsPath)) fs.mkdirSync(dynamicFolder.fsPath, { recursive: true });
		for (var ii = 0; ii < this._vdbgs.snips.length; ii++) {
			let dst = vscode.Uri.joinPath(dynamicFolder, makeid()+'.js');
			fs.writeFileSync(dst.fsPath, this._vdbgs.snips[ii],{encoding:'utf8'});
			jspaths.push((dst).with({ 'scheme': 'vscode-resource' }));
		}

		// - 3. load from first item in launch.configuration.vdbg.sources
		for (var ii = 0; ii < vdbgConfig.sources.length; ii++) {
			let resource = vdbgConfig.sources[ii];
			let src = vscode.Uri.joinPath(folderUri.uri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', resource.dst);
			// vscode.window.showInformationMessage(`vdbg: Installing ${src} to ${dst}`);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) jspaths.push((dst).with({ 'scheme': 'vscode-resource' }));
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

		this._panel.title = 'Vdbg Window';
		// // const stylesResetUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		// // const stylesMainUri = this._panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		this._panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Vdbg Window</title>
	</head>
	<body>
<script type="module">
let HANDLER = null;
const OVERLOADS = {VSCODE:acquireVsCodeApi(), PARSERS:{}};
[${jspaths.map(p => `"${p}"`).join(',')}].forEach(importpath => {
	import(importpath)
		.then(builtin => { if (builtin.load) HANDLER = builtin.load(OVERLOADS) })
		.catch(err => console.log('err',err));
});
window.addEventListener('message', event => {
	if (event?.data && HANDLER) HANDLER(event.data);
});
</script>
	</body>
</html>`;
		this._panel.reveal(vscode.ViewColumn.Two);
		
	}

	constructor(extensionUri: vscode.Uri) {
		this._extensionUri = extensionUri;
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

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => { this.dispose(); }, null, this._disposables);

		// Update the content based on view changes, this happens way too much
		// this._panel.onDidChangeViewState(
		// 	e => { if (this._panel && this._panel.visible) this._update(); }, null, this._disposables
		// );

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				if (message.type == 'error') {
					vscode.window.showErrorMessage(message.text);
				} else if (message.type == 'info') {
					vscode.window.showInformationMessage(message.text);
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
		vscode.window.showInformationMessage('Disposed vdbg')
		let pths = [vscode.Uri.joinPath(this._extensionUri,'media','dynamic'),vscode.Uri.joinPath(this._extensionUri,'media','resources')];
		pths.forEach(pth => {
			if (fs.existsSync(pth.fsPath) && fs.statSync(pth.fsPath).isDirectory()) fs.rmSync(pth.fsPath, { recursive: true });
		})
	}

}