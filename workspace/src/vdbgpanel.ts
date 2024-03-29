import * as vscode from 'vscode';
import * as vdbg_sources from './types/sources';
import { vyPanel } from './panel';
// https://microsoft.github.io/debug-adapter-protocol/specification

export class vDbgPanel extends vyPanel {
	public _session: vscode.DebugSession | undefined;
	private _variable_parser: vdbg_sources.LanguageDbgType | undefined;
	public currentThreadId: string|undefined;
	private _dynamicUri: Array<vscode.Uri> = [];

	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		this._variable_parser?.check_breakpoint(bpsource, (obj:Object) => {this.sendMessage(obj)});
	}

	public setSession(session: vscode.DebugSession) {
		this._session = session;
	}

	public setType(variable_parser:vdbg_sources.LanguageDbgType) {
		this._channel?.clear();
		this._variable_parser = variable_parser;
		this._dynamicUri.splice(0,this._dynamicUri.length);
		if (!(this._session && this._session.workspaceFolder)) return false;
		let folderUri:vscode.WorkspaceFolder = this._session.workspaceFolder;
		let vdbg_scripts = this._session.configuration.vdbg_scripts;
		if (!vdbg_scripts) return;
		let access_scripts = this._session.configuration.access_scripts || [];
		let bpobj:Object = this._variable_parser.get_vdbg().breakpoints.map(bp => { 
			let o = JSON.parse(JSON.stringify(bp.obj));
			o.path = bp.uri.fsPath;
			o.line = bp.line;
			return o;
		});
		let CURRENT_THREAD_ID = this.currentThreadId;
		let sendMessage = this.sendMessage;
		let SESSION = this._session;
		const messageParser = function(message:any) {
			if (message.type == 'add_breakpoints') {
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
				if (message.data) variable_parser?.eval_breakpoint(message.data,undefined).then((obj:any) => {sendMessage(obj)});
			} else if (message.type == 'dap_send_message' && message.hasOwnProperty('command') && SESSION) {
				if (!message.hasOwnProperty('arguments')) message.arguments = {};
				if (!message.arguments.hasOwnProperty('threadId') && CURRENT_THREAD_ID) message.arguments.threadId = CURRENT_THREAD_ID;
				SESSION.customRequest(message.command, message.arguments).then(response => {
					if (message.topic) sendMessage({topic:message.topic,response:response});
				});
			}
		}
		this.createPanel(bpobj, folderUri, vdbg_scripts, access_scripts, messageParser);
	}

	constructor(extensionUri:vscode.Uri, channel:vscode.OutputChannel) {
		super(extensionUri, channel);
	}

}