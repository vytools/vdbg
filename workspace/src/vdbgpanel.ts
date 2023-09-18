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
	private _variable_parser: vdbg_sources.LanguageDbgType | undefined;
	public channel = vscode.window.createOutputChannel("vdbg");
	public readonly viewType = 'vDbg';
	public currentThreadId: string|undefined;
	private readonly _extensionUri: vscode.Uri;
	private readonly _contentProvider: vscode.Disposable;
	private _dynamicUri: Array<vscode.Uri> = [];
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
		this._variable_parser?.check_breakpoint(bpsource, (obj:Object) => {this.sendMessage(obj)});
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

	public setType(variable_parser:vdbg_sources.LanguageDbgType) {
		this.channel.clear();
		this._variable_parser = variable_parser;
		this._dynamicUri.splice(0,this._dynamicUri.length);
		if (!(this._panel && this._session)) {
			vscode.window.showErrorMessage('vdbg error: No debug session or panel');
			return false;
		} else if (!this._session.workspaceFolder) {
			vscode.window.showErrorMessage('vdbg error: No workspace loaded');
			return false;
		}

		let folderUri:vscode.WorkspaceFolder = this._session.workspaceFolder;
		let vdbg_scripts = this._session.configuration.vdbg_scripts;
		if (!vdbg_scripts) {
			vscode.window.showErrorMessage(`vdbg error: No "vdbg_scripts" field in launch configuration ${JSON.stringify(this._session.configuration)}`);
			return;
		}
		let vdbgs:vdbg_sources.Vdbg = this._variable_parser.get_vdbg();
		let jspaths:Array<vscode.Uri> = [];
		this.clearDynamicFolder();
		let dynamicFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'resources', makeid());
		if (!fs.existsSync(dynamicFolder.fsPath)) fs.mkdirSync(dynamicFolder.fsPath, { recursive: true });

		// - 1. load from items in launch.configuration.vdbg.builtin
		// let builtinFolder = vscode.Uri.joinPath(this._extensionUri, 'media', 'builtin');
		// if (vdbg_extension.builtin) {
		// 	for (const [key,val] of Object.entries(vdbg_extension.builtin)) {
		// 		try {
		// 			let src = vscode.Uri.joinPath(builtinFolder, key+".js");
		// 			jspaths.push(src);
		// 		} catch(err) {
		// 			vscode.window.showErrorMessage(`vdbg error: builtin "${key}" referenced in "vdbg_extension" of launch file does not exist`);
		// 		}
		// 	}
		// }

		// - 2. load from embedded <vdbg_js ... vdb_js> tags
		// for (var ii = 0; ii < vdbgs.snips.length; ii++) {
		// 	let dst = vscode.Uri.joinPath(dynamicFolder, makeid()+'.js');
		// 	fs.writeFileSync(dst.fsPath, vdbgs.snips[ii],{encoding:'utf8'});
		// 	jspaths.push(dst);
		// }

		
		// - 3. save items in launch.configuration.vdbg.scripts and load the first one
		for (var ii = 0; ii < vdbg_scripts.length; ii++) {
			let resource = vdbg_scripts[ii];
			let src = (path.isAbsolute(resource.src)) ? resource.src : vscode.Uri.joinPath(folderUri.uri, resource.src).fsPath;
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
		let new_jspaths:any = jspaths.map(original => {return {original:original+'',resource:this._panel?.webview.asWebviewUri(original)+''}});

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
const __topic_functions__ = {}
const __api__ = acquireVsCodeApi();
const get_vdbg = function() {
	const VDBG = {};
	VDBG.breakpoints = ${JSON.stringify(bpobj)};
	VDBG.log = function() {
		let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
		__api__.postMessage({type:'log',text:message});
	}
	VDBG.error = function() {
		let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
		__api__.postMessage({type:'error',text:message});
	}
	VDBG.info = function() {
		let message = ''; for (var i = 0; i < arguments.length; i++) message += JSON.stringify(arguments[i],null,2)+' ';
		__api__.postMessage({type:'info',text:message});
	}
	VDBG.assess = (data) => {__api__.postMessage({type:'vdbg_bp', data});}
	VDBG.add_breakpoints = (bp) => {__api__.postMessage({type:'add_breakpoints',breakpoints:bp});}
	VDBG.remove_breakpoints = (bp) => {__api__.postMessage({type:'remove_breakpoints',breakpoints:bp});}
	VDBG.dap_send_message = (command,args,topic) => {__api__.postMessage({type:'dap_send_message',command,arguments:args,topic});}
	VDBG.register_topic = (topic,f) => {
		if (typeof f === 'function') {
			if (__topic_functions__.hasOwnProperty(topic)) {
				__api__.postMessage({type:'info',text:'Overwriting duplicate vdbg topic "'+topic+'"'});
			}
			__api__.postMessage({type:'log',text:'Registering vdbg topic "'+topic+'"'});
			__topic_functions__[topic] = f;
		}
	}
	return VDBG;
}

window.addEventListener('message', event => {
	try {
		if (__topic_functions__.__handler__) {
			__topic_functions__.__handler__(event.data);
		} else if (event.data.topic && __topic_functions__.hasOwnProperty(event.data.topic)) {
			__topic_functions__[event.data.topic](event.data);
		} else {
			__api__.postMessage({type:'info',text:'Unhandled data: '+JSON.stringify(event.data,null,2)});
		}
	} catch(err) {
		__api__.postMessage({type:'log',text:'Topic error running vdbg script for topic "'+event.data.topic+'": '+err});
		__api__.postMessage({type:'error',text:'Topic error running vdbg script for topic "'+event.data.topic+'": see "vdbg" output channel'});
	}
});

const scripts = ${JSON.stringify(new_jspaths)};
const load_next_script = function() {
	if (scripts.length > 0) {
		let script = scripts.shift();
		import(script.resource)
		.then(imprtd => {
			if (imprtd.load_vdbg) imprtd.load_vdbg(get_vdbg());
			load_next_script();
		})
		.catch(err => {
			__api__.postMessage({type:'log',text:'Error loading vdbg script "'+script.original+'": '+err})
			__api__.postMessage({type:'error',text:'Error loading vdbg script "'+script.original+'": see vdbg output channel'})
		});
	}
}
load_next_script();

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
				} else if (message.type == 'log') {
					this.channel.appendLine(message.text);
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
					if (message.data) this._variable_parser?.eval_breakpoint(message.data,undefined).then((obj:any) => {this.sendMessage(obj)});
				} else if (message.type == 'dap_send_message' && message.hasOwnProperty('command') && this._session) {
					if (!message.hasOwnProperty('arguments')) message.arguments = {};
					if (!message.arguments.hasOwnProperty('threadId') && this.currentThreadId) message.arguments.threadId = this.currentThreadId;
					this._session.customRequest(message.command, message.arguments).then(response => {
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