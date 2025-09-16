import * as vscode from 'vscode';
import * as vdbg_sources from './types/sources';
import { VyAccess, VyConfigScript, VyScript, vyPanel } from './panel';
// https://microsoft.github.io/debug-adapter-protocol/specification
const has = function(obj:any, prop:string) {
	return Object.prototype.hasOwnProperty.call(obj,prop);
};

export class vDbgPanel extends vyPanel {
	public _session: vscode.DebugSession | undefined;
	private _variable_parser: vdbg_sources.LanguageDbgType | undefined;
	public currentThreadId: string|undefined;
	public currentFrameId: number|undefined;
	private _dynamicUri: Array<vscode.Uri> = [];

	public checkBreakpoint(bpsource:vdbg_sources.stackTraceBody) {
		this._variable_parser?.check_breakpoint(bpsource, (obj:any) => {
			this.sendMessage(obj);
		});
	}

	public setSession(session: vscode.DebugSession) {
		this._session = session;
	}

	public messageParser(message:any) {
		if (super.messageParser(message)) {
		} else if (message.type == 'add_breakpoints') {
			vscode.debug.addBreakpoints(message.breakpoints.map((bp:any) => {
				const uri = vscode.Uri.file(bp.path);
				const loc:vscode.Location = new vscode.Location(uri, new vscode.Position(bp.line, 0));
				return new vscode.SourceBreakpoint(loc, !bp.disabled, bp.condition, bp.hitCondition, bp.logMessage);
			}));
		} else if (message.type == 'remove_breakpoints') {
			const bpx = vscode.debug.breakpoints.filter(bp => {
				// let line = bp.location.range.start.line; // typescript cant imagine that bp is a vscode.SourceBreakpoint
				// let pth = bp.location.uri.fsPath;
				let line = null, pth = null;
				for (const [key,value] of Object.entries(bp)) {
					if (key == 'location') {
						line = value.range.start.line;
						pth = value.uri.fsPath;
					}
				}
				for (let ii = 0; ii < message.breakpoints.length; ii++) {
					const bpr = message.breakpoints[ii];
					if (pth == bpr.path && bpr.line == line) return true;
				}
				return false;
			});
			console.log('Attempting to remove breakpoints:',bpx);
			vscode.debug.removeBreakpoints(bpx);
		} else if (message.type == 'vdbg_bp') {
			if (message.data) this._variable_parser?.eval_breakpoint(message.data,undefined).then((obj:any) => {this.sendMessage(obj);});
		} else if (message.type == 'dap_send_message' && has(message,'command')) {
			if (!has(message, 'arguments')) message.arguments = {};
			if (!has(message.arguments,'frameId') && this.currentFrameId) message.arguments.frameId = this.currentFrameId;
			if (!has(message.arguments,'threadId') && this.currentThreadId) message.arguments.threadId = this.currentThreadId;
			this._session?.customRequest(message.command, message.arguments).then(response => {
				if (message.topic) this.sendMessage({topic:message.topic,response:response});
			});
		} else {
			return false;
		}
		return true;
	};

	public setType(variable_parser:vdbg_sources.LanguageDbgType, all_vdbg_scripts:VyConfigScript[], access_scripts:VyAccess[]) {
		this._channel?.clear();
		this._variable_parser = variable_parser;
		this._dynamicUri.splice(0,this._dynamicUri.length);
		if (!(this._session && this._session.workspaceFolder)) return false;
		const folderUri:vscode.WorkspaceFolder = this._session.workspaceFolder;
		const configname = this._session.configuration.name;
		let vdbg_scripts:VyScript[] = [];
		const all_names:string[] = [];
		all_vdbg_scripts.forEach(vs => {
			all_names.push(vs.config);
			if (vs.config == configname) vdbg_scripts = vs.files;
		});
		if (vdbg_scripts.length == 0) {
			if (all_names.length != 0) {
				vscode.window.showInformationMessage(`vdbg inactive since ${configname} is not in ${all_names.join(',')}`);
			}
			return;
		}
		const bpobj:any = this._variable_parser.get_vdbg().breakpoints.map(bp => { 
			const o = JSON.parse(JSON.stringify(bp.obj));
			o.path = bp.uri.fsPath;
			o.line = bp.line;
			return o;
		});
		this.createPanel(bpobj, this._session.configuration.name, folderUri, vdbg_scripts, access_scripts, () => undefined);
	}

	constructor(extensionUri:vscode.Uri, channel:vscode.OutputChannel) {
		super(extensionUri, channel);
	}

}