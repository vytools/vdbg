import * as vscode from 'vscode';
import * as vdbg_sources from './types/sources';
const fs = require('fs');
const path = require('path');

const makeid = function() {
    var result           = 'x';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 20; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const copy_source = function(src:string, dst:vscode.Uri) {
	let targetDir = path.dirname(dst.fsPath);
	if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
	if (fs.existsSync(dst.fsPath)) fs.rmSync(dst.fsPath);
	fs.copyFileSync(src, dst.fsPath);
}

export interface VyScript {
	src: string;
	dst: string;
};

export interface VyJson {
	panel_scripts: VyScript[] | undefined;
};

export class vyPanel {
	public _channel:vscode.OutputChannel;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	protected _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	// private _workspace:vscode.WorkspaceFolder|undefined;
	// private _bpobj:Object = {};
	// private _scripts:VyScript[] = [];
	// private _messageParser:any;
	public sendMessage(data: Object) {
		if (this._panel) {
			this._panel.webview.postMessage(data);
		} else {
			vscode.window.showErrorMessage('vdbg error: would send '+JSON.stringify(data)+' but no current webview');
		}
	}

	public clearDynamicFolder() {
		let resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
		if (fs.existsSync(resources) && fs.statSync(resources).isDirectory()) {	// If the file is a directory
			fs.readdirSync(resources).forEach(function(subpth: string) {
				const pth = path.join(resources,subpth);
				if (fs.existsSync(pth) && fs.statSync(pth).isDirectory()) {
					fs.rmSync(pth, { recursive: true });
				} else if (fs.existsSync(pth)) {
					fs.rmSync(pth);
				}
			});
		}
	}

	public createPanel(bpobj:Object, workspace:vscode.WorkspaceFolder, scripts:VyScript[], messageParser:any) {
		// this._messageParser = messageParser;
		// this._bpobj = bpobj;
		// this._workspace = workspace;
		// this._scripts = scripts;
		if (this._panel) return;
		this._panel = vscode.window.createWebviewPanel(
			this.viewType,
			'vdbg',
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
			},
		);

		// // Not currently using this but it would be nice if I could. I can't seem to use this with vdbg
		// // scheme because it's blocked by cors. It's doesn't seem to work either to enhance non blocked ones
		// // (e.g. vscode-resource) 
		// this._contentProvider = vscode.workspace.registerTextDocumentContentProvider("vdbg",{
		// 	provideTextDocumentContent(uri: vscode.Uri): string {
		// 		return 'console.log("BY JOVE!")';
		// 	}
		// });

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => { this.dispose(); }, null, this._disposables);

		// Update the content based on view changes, this happens way too much
		// this._panel.onDidChangeViewState(
		// 	e => { if (this._panel && this._panel.visible) this._update(); }, null, this._disposables
		// );
		let vy_tools_results = vscode.Uri.joinPath(this._extensionUri, 'media','vy_tools_results.json').fsPath;
		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				if (message.type == 'error') {
					vscode.window.showErrorMessage(message.text);
				} else if (message.type == 'vy_tools_results') {
					try {
						this.sendMessage({
							__vy_tools_results__:true,
							data:JSON.parse(fs.readFileSync(vy_tools_results))
						});
					} catch(err) {}
				} else if (message.type == 'log' && this._channel) {
					this._channel.appendLine(message.text);
				} else if (message.type == 'info') {
					vscode.window.showInformationMessage(message.text);
				} else {
					messageParser(message);
				}
			},
			null,
			this._disposables
		);
		let TopLevelFileOriginal:vscode.Uri|undefined;
		this.clearDynamicFolder();
		let dynamicFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', makeid());
		if (!fs.existsSync(dynamicFolder.fsPath)) fs.mkdirSync(dynamicFolder.fsPath, { recursive: true });

		// - 3. save items in launch.configuration.vdbg.scripts and load the first one
		for (var ii = 0; ii < scripts.length; ii++) {
			let resource = scripts[ii];
			let src = (path.isAbsolute(resource.src)) ? resource.src : vscode.Uri.joinPath(workspace.uri, resource.src).fsPath;
			let dst = vscode.Uri.joinPath(dynamicFolder, resource.dst);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) TopLevelFileOriginal = dst;
			try {
				if (fs.existsSync(src) && fs.statSync(src).isFile()) {
					copy_source(src, dst)
				} else if (fs.existsSync(src) && TopLevelFileOriginal) {
					vdbg_sources.dive(src,  /.*/i).forEach(s => {
						if (fs.existsSync(s) && fs.statSync(s).isFile()) {
							copy_source(s, vscode.Uri.joinPath(dynamicFolder, s.replace(src,resource.dst)));
						}
					})
				} else {
					vscode.window.showErrorMessage(`File ${src} does not exist`);
				}
			} catch(err) {
				vscode.window.showErrorMessage(`Problem with source file ${src}: ${err}`);
			}
		}
		if (!TopLevelFileOriginal) {
			vscode.window.showErrorMessage(`No valid script defined in scripts specified in launch configuration`);
			return;
		}
		
		let TopLevelFileResource:vscode.Uri = this._panel?.webview.asWebviewUri(TopLevelFileOriginal);

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
		const __topic_functions__ = {}
		const __api__ = acquireVsCodeApi();
		const __postMessage__ = __api__.postMessage;
		const VDBG = {};
		VDBG.breakpoints = ${JSON.stringify(bpobj)};
		VDBG.log = function() {
			let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
			__postMessage__({type:'log',text:message});
		}
		VDBG.error = function() {
			let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
			__postMessage__({type:'error',text:message});
		}
		VDBG.info = function() {
			let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
			__postMessage__({type:'info',text:message});
		}
		VDBG.assess = (data) => {__postMessage__({type:'vdbg_bp', data});}
		VDBG.add_breakpoints = (bp) => {__postMessage__({type:'add_breakpoints',breakpoints:bp});}
		VDBG.remove_breakpoints = (bp) => {__postMessage__({type:'remove_breakpoints',breakpoints:bp});}
		VDBG.dap_send_message = (command,args,topic) => {__postMessage__({type:'dap_send_message',command,arguments:args,topic});}
		VDBG.vy_tools_results = () => { __postMessage__({type:'vy_tools_results'}); };
		VDBG.register_topic = (topic,f) => {
			if (typeof f === 'function') {
				if (__topic_functions__.hasOwnProperty(topic)) {
					__postMessage__({type:'info',text:'Overwriting duplicate vdbg topic "'+topic+'"'});
				}
				__postMessage__({type:'log',text:'Registering vdbg topic "'+topic+'"'});
				__topic_functions__[topic] = f;
			}
		}

		window.addEventListener('message', event => {
			if (event.data.__vy_tools_results__ && VDBG.vy_tools_results_cb) {
				VDBG.vy_tools_results_cb(event.data.data);
			} else {
				try {
					if (__topic_functions__.__handler__) {
						__topic_functions__.__handler__(event.data);
					} else if (event.data.topic && __topic_functions__.hasOwnProperty(event.data.topic)) {
						__topic_functions__[event.data.topic](event.data);
					} else {
						__postMessage__({type:'log',text:'Unhandled data: '+JSON.stringify(event.data,null,2)});
					}
				} catch(err) {
					__postMessage__({type:'log',text:'Topic error running vdbg script for topic "'+event.data.topic+'": '+err});
					__postMessage__({type:'error',text:'Topic error running vdbg script for topic "'+event.data.topic+'": see "vdbg" output channel'});
				}
			}
		});

		import("${TopLevelFileResource}").then(imprtd => {
			if (imprtd.load_vdbg) imprtd.load_vdbg(VDBG);
			if (imprtd.vy_tools_results) VDBG.vy_tools_results_cb = imprtd.vy_tools_results;
		}).catch(err => {
			__postMessage__({type:'log',text:'Error loading vdbg script "${TopLevelFileOriginal}": '+err})
			__postMessage__({type:'error',text:'Error loading vdbg script "${TopLevelFileOriginal}": see vdbg output channel'})
		});

		</script>
			</body>
		</html>`;

		this._panel.reveal();
	}

	constructor(extensionUri: vscode.Uri, channel:vscode.OutputChannel) {
		this._extensionUri = extensionUri;
		this._channel = channel;
	}

	public disposed() {
		return this._disposables.length == 0;
	}

	public dispose() {
		// Clean up our resources
		if (this._panel) this._panel.dispose();
		// this._contentProvider.dispose();
		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) x.dispose();
		}
		this._panel = undefined;
		this.clearDynamicFolder();
	}

}