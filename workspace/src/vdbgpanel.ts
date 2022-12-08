import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');
import * as vdbg_sources from './types/sources';
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
	private _type: vdbg_sources.LanguageDbgType | undefined;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _dynamicUri: Array<vscode.Uri> = []
	private _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];

	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vdbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}
	
	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		this._type?.check_breakpoint(bpsource, (obj:Object) => {this.sendMessage(obj)});
	}

	public setSession(session: vscode.DebugSession) {
		this._session = session;
	}

	public clearDynamicFolder() {
		let resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
		if (fs.existsSync(resources) && fs.statSync(resources).isDirectory()) {	// If the file is a directory
			fs.readdirSync(resources).forEach(function(subpth: string) {
				const pth = path.join(resources,subpth);
				if (fs.existsSync(pth) && fs.statSync(pth).isDirectory()) fs.rmSync(pth, { recursive: true });
			});
		}
	}

	public setType(typ:vdbg_sources.LanguageDbgType) {
		this._type = typ;
		this._dynamicUri.splice(0,this._dynamicUri.length);
		if (!(this._panel && this._session)) {
			vscode.window.showErrorMessage('vdbg error: No debug session or panel');
			return false;
		} else if (!this._session.workspaceFolder) {
			vscode.window.showErrorMessage('vdbg error: No workspace loaded');
			return false;
		}

		let folderUri:vscode.WorkspaceFolder = this._session.workspaceFolder;
		let vdbgConfig = this._session.configuration.vdbg;
		if (!vdbgConfig || !vdbgConfig.scripts) {
			vscode.window.showErrorMessage(`vdbg error: No "vdbg" field in launch configuration ${JSON.stringify(this._session.configuration)}`);
			return;
		}
		let vdbgs:vdbg_sources.Vdbg = this._type.get_vdbg();
		let jspaths:Array<vscode.Uri> = [];
		this.clearDynamicFolder();
		let dynamicFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', makeid());
		if (!fs.existsSync(dynamicFolder.fsPath)) fs.mkdirSync(dynamicFolder.fsPath, { recursive: true });

		// - 1. load from items in launch.configuration.vdbg.addon
		let addOnFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'addon');
		if (vdbgConfig.addon) {
			for (const [key,val] of Object.entries(vdbgConfig.addon)) {
				try {
					let src = vscode.Uri.joinPath(addOnFolder, key+".js");
					jspaths.push(src);
				} catch(err) {
					vscode.window.showErrorMessage(`vdbg error: addon "${key}" does not exist`);

				}
			}
		}

		// - 2. load from embedded <vdbg_js ... vdb_js> tags
		for (var ii = 0; ii < vdbgs.snips.length; ii++) {
			let dst = vscode.Uri.joinPath(dynamicFolder, makeid()+'.js');
			fs.writeFileSync(dst.fsPath, vdbgs.snips[ii],{encoding:'utf8'});
			jspaths.push(dst);
		}

		
		// - 3. save items in launch.configuration.vdbg.scripts and load the first one
		for (var ii = 0; ii < vdbgConfig.scripts.length; ii++) {
			let resource = vdbgConfig.scripts[ii];
			let src = vscode.Uri.joinPath(folderUri.uri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(dynamicFolder, resource.dst);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) jspaths.push(dst);
			try {
				if (fs.existsSync(src)) {
					let targetDir = path.dirname(dst.fsPath);
					if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
					if (fs.existsSync(dst.fsPath)) fs.rmSync(dst.fsPath);
					fs.copyFileSync(src, dst.fsPath);
				} else {
					vscode.window.showErrorMessage(`File ${src} does not exist`);
				}
			} catch(err) {
				vscode.window.showErrorMessage(`Problem with source file ${src}: ${err}`);
			}
		}

		let bpobj:Object = vdbgs.breakpoints.map(bp => { 
			let o = JSON.parse(JSON.stringify(bp.obj));
			o.path = bp.uri.fsPath;
			o.line = bp.line;
			return o;
		});
		let panel = this._panel;
		this._panel.title = 'vdbg';
		let styles = ['reset.css','bootstrap.min.css','vscode.css'].map(f => {
			return `<link href="${panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'styles', f))}" rel="stylesheet">`;
		}).join('\n');
		styles += ['flex.css'].map(f => {
			return `<link href="${panel.webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vyjs', 'css', f))}" rel="stylesheet">`;
		}).join('\n');
		this._panel.webview.html = `
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		${styles}
	</head>
	<body>
<script type="module">
const OVERLOADS = ${JSON.stringify(vdbgConfig)};
OVERLOADS.BREAKPOINTS = ${JSON.stringify(bpobj)};
OVERLOADS.VSCODE = acquireVsCodeApi();
OVERLOADS.PARSERS = {};
const scripts = [${jspaths.map(p => `"${this._panel?.webview.asWebviewUri(p)}"`).join(',')}];
const load_next_script = function() {
	if (scripts.length > 0) {
		import(scripts.shift())
		.then(builtin => { if (builtin.load) builtin.load(OVERLOADS); load_next_script(); })
		.catch(err => console.log('err',err));
	}
}
load_next_script();
window.addEventListener('message', event => {
	if (!OVERLOADS.HANDLER) {
		OVERLOADS.VSCODE.postMessage({type:'error',text:'vydbg HANDLER was not defined.'})
	} else if (event?.data) {
		OVERLOADS.HANDLER(event.data);
	}
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
			'vdbg',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
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
				} else if (message.type == 'add_breakpoints') {
					vscode.debug.addBreakpoints(message.breakpoints.map((bp:any) => {
						let uri = vscode.Uri.file(bp.path);
						let loc:vscode.Location = new vscode.Location(uri, new vscode.Position(bp.line, 0));
						return new vscode.SourceBreakpoint(loc, !bp.disabled, bp.condition, bp.hitCondition, bp.logMessage);
					}));
				} else if (message.type == 'remove_breakpoints') {
					let bpx = vscode.debug.breakpoints.filter(bp => {
						// let line = bp.location.range.start.line; // typescript cant imagine that bp is a vscode.SourceBreakpoint
						// let pth = bp.location.uri.fsPath;
						let line = null, pth = null;
						for (const [key,value] of Object.entries(bp)) {
							if (key == 'location') {
								line = value.range.start.line;
								pth = value.uri.fsPath;
							}
						};
						for (var ii = 0; ii < message.breakpoints.length; ii++) {
							let bpr = message.breakpoints[ii];
							if (pth == bpr.path && bpr.line == line) return true;
						}
						return false;
					});
					console.log('Attempting to remove breakpoints:',bpx);
					vscode.debug.removeBreakpoints(bpx);
				} else if (message.type == 'vdbg_bp') {
					if (message.data) this._type?.eval_breakpoint(message.data,undefined,(obj:any) => {this.sendMessage(obj)});
				} else if (message.type == 'evaluate' && this._session) {
					this._session.customRequest('evaluate', {expression:message.expression, context:'repl'}).then(response => {
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
		this.clearDynamicFolder();
	}

}