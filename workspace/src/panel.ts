import * as vscode from 'vscode';
import * as vdbg_sources from './types/sources';
const fs = require('fs');
const path = require('path');

const makeid = function() {
    let result = 'x';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for ( let i = 0; i < 20; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

const copy_source = function(src:string, dst:vscode.Uri) {
	const targetDir = path.dirname(dst.fsPath);
	if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
	if (fs.existsSync(dst.fsPath)) fs.rmSync(dst.fsPath);
	fs.copyFileSync(src, dst.fsPath);
};

export interface VyConfigScript {
	config: string;
	files: VyScript[];
}

export interface VyScript {
	src: string;
	dst: string;
}

export interface VyAccess {
	src: string;
	label: string;
	listen: string;
}

export interface VyJson {
	panel_scripts: VyScript[];
	access_scripts: VyAccess[];
	vdbg_scripts: VyConfigScript[];
}

export class vyPanel {
	public _channel:vscode.OutputChannel;
	public readonly viewType = 'vDbg';
	private readonly _extensionUri: vscode.Uri;
	protected _panel: vscode.WebviewPanel|undefined;
	private _disposables: vscode.Disposable[] = [];
	private _access:VyAccess[] = [];
	public sendMessage(data: any) {
		if (this._panel) this._panel.webview.postMessage(data);
	}

	public clearDynamicFolder() {
		const resources = vscode.Uri.joinPath(this._extensionUri,'media','resources').fsPath;
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
	public messageParser(message:any) {
		if (message.type == 'error') {
			vscode.window.showErrorMessage(message.text);
		} else if (message.type == 'listen') {
			for (let ii = 0; ii < this._access.length; ii++) {
				if (this._access[ii].label == message.label) this._access[ii].listen = message.text;
			}
		} else if (message.type == 'write') {
			try {
				let found = false;
				for (let ii = 0; ii < this._access.length; ii++) {
					if (this._access[ii].label == message.label) {
						found = true;
						fs.writeFileSync(this._access[ii].src, message.text);
					}
				}
				if (!found) vscode.window.showErrorMessage(`"${message.label}" could not be written because it hasn't been configured in vdbg.json "access_scripts"`);
			} catch(err) {
				vscode.window.showErrorMessage(`"${message.label}" could not be written. ${err}`);
			}
		} else if (message.type == 'read') {
			if (!message.callback_topic) {
				vscode.window.showErrorMessage(`"${message.label}" not read because no callback topic is required`);
			} else {
				try {
					let found = false;
					for (let ii = 0; ii < this._access.length; ii++) {
						if (this._access[ii].label == message.label) {
							found = true;
							this.sendMessage({
								topic:message.callback_topic,
								data:fs.readFileSync(this._access[ii].src, { encoding: 'utf8', flag: 'r' })
							});
							break;
						}
					}
					if (!found) vscode.window.showErrorMessage(`"${message.label}" could not be read because it hasn't been configured in vdbg.json "access_scripts"`);
				} catch(err) {
					this.sendMessage({topic:message.callback_topic, error:err});
				}	
			}
		} else if (message.type == 'log' && this._channel) {
			this._channel.appendLine(message.text);
		} else if (message.type == 'info') {
			vscode.window.showInformationMessage(message.text);
		} else {
			return false;
		}
		return true;
	}

	public createPanel(
		bpobj:any,
		label:string,
		workspace:vscode.WorkspaceFolder,
		scripts:VyScript[],
		access:VyAccess[],
		onDispose:() => void)
	{
		if (this._panel) return;
		this._access = access;
		this._panel = vscode.window.createWebviewPanel(
			this.viewType,
			label,
			vscode.ViewColumn.Two,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
			},
		);

		this._panel.onDidDispose(() => {
			this.dispose();
			onDispose();
		}, null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => { this.messageParser(message); },
			null,
			this._disposables
		);
		let TopLevelFileOriginal:vscode.Uri|undefined;
		this.clearDynamicFolder();
		const dynamicFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', makeid());
		if (!fs.existsSync(dynamicFolder.fsPath)) fs.mkdirSync(dynamicFolder.fsPath, { recursive: true });

		// - 3. save items in launch.configuration.vdbg.scripts and load the first one
		for (let ii = 0; ii < scripts.length; ii++) {
			const resource = scripts[ii];
			const src = (path.isAbsolute(resource.src)) ? resource.src : vscode.Uri.joinPath(workspace.uri, resource.src).fsPath;
			const dst = vscode.Uri.joinPath(dynamicFolder, resource.dst);
			if (dst.fsPath.indexOf('..') > -1) continue;
			if (ii == 0) TopLevelFileOriginal = dst;
			try {
				if (fs.existsSync(src) && fs.statSync(src).isFile()) {
					copy_source(src, dst);
				} else if (fs.existsSync(src) && TopLevelFileOriginal) {
					vdbg_sources.dive(src,  /.*/i).forEach(s => {
						if (fs.existsSync(s) && fs.statSync(s).isFile()) {
							copy_source(s, vscode.Uri.joinPath(dynamicFolder, s.replace(src,resource.dst)));
						}
					});
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
		
		const TopLevelFileResource:vscode.Uri = this._panel?.webview.asWebviewUri(TopLevelFileOriginal);

		const panel = this._panel;
		this._panel.title = label;
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
		VDBG.write = function(label, text) {
			__postMessage__({type:'write', label:label, text:text});
		}
		VDBG.listen = function(label, text) {
			__postMessage__({type:'listen', label:label, text:text});
		}
		VDBG.read = function(label, callback_topic) {
			__postMessage__({type:'read', label:label, callback_topic:callback_topic});
		}
		VDBG.assess = (data) => {__postMessage__({type:'vdbg_bp', data});}
		VDBG.add_breakpoints = (bp) => {__postMessage__({type:'add_breakpoints',breakpoints:bp});}
		VDBG.remove_breakpoints = (bp) => {__postMessage__({type:'remove_breakpoints',breakpoints:bp});}
		VDBG.dap_send_message = (command,args,topic) => {__postMessage__({type:'dap_send_message',command,arguments:args,topic});}
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
		});

		import("${TopLevelFileResource}").then(imprtd => {
			if (imprtd.load_vdbg) imprtd.load_vdbg(VDBG);
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