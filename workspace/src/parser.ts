import * as vscode from 'vscode';
import { vDbgPanel } from './vdbgpanel';
const JSON5 = require('json5');

const set_by_path = function(obj:any, path:Array<string>, val:any) {
	let p0 = path[0].replace(/^\[/, '').replace(/\]$/, '').replace(/'$/, '').replace(/^'/, '');
	path = path.slice(1);
	if (path.length == 0) {
		obj[p0] = val;
	} else {
		if (!obj.hasOwnProperty(p0) || (!Array.isArray(obj[p0]) && path[0] == '[0]')) {
			obj[p0] = (path[0] == '[0]') ? [] : {};
		}
		set_by_path(obj[p0], path, val);
	}
}

const parse_value = function(v:string) {
	try {
		return JSON5.parse(v);
	} catch(err) {
		let vv = parseFloat(v);
		return (isNaN(vv)) ? v : vv;
	}
}

const sub_variables = function(session:vscode.DebugSession, response:any, arg2:any, path:Array<string>, panel:vDbgPanel|undefined) {
	// console.log('->',response)
	if (response.command == 'evaluate' && response.variablesReference != 0) {
		set_by_path(arg2.obj, path, {});
		// https://microsoft.github.io/debug-adapter-protocol/specification#Requests_Variables
		session.customRequest('variables', {variablesReference:response.variablesReference}).then(response2 => {
			response2.command = 'variables';
			sub_variables(session, response2, arg2, path, panel);
		});
	} else if (response.command == 'variables') {
		arg2.nvariables -= 1;
		arg2.nvariables += response.variables.length;
		response.variables.forEach((varx:any) => {
			if (['special variables','function variables','len()'].indexOf(varx.name) > -1) {
				arg2.nvariables -= 1;
			} else if (varx.variablesReference == 0) {
				set_by_path(arg2.obj, path.concat([varx.name]), parse_value(varx.value));
				arg2.nvariables -= 1;
			} else {
				session.customRequest('variables', {variablesReference:varx.variablesReference}).then(response2 => {
					response2.command = 'variables';
					sub_variables(session, response2, arg2, path.concat([varx.name]), panel);
				});
			}
			if (arg2.nvariables == 0 && panel) {
				panel.sendMessage(arg2.obj);
			}
		});
	} else {
		set_by_path(arg2.obj, path, parse_value(response.result));
		arg2.nvariables -= 1;
		if (arg2.nvariables == 0 && panel) {
			panel.sendMessage(arg2.obj);
		}
	}
}

export function get_variables(session:vscode.DebugSession, breakpoint:any, frameId:number, panel:vDbgPanel|undefined) {
	if (!panel) return;
	let arg2 = {
		nvariables: Object.keys(breakpoint.variables).length,
		frameId:frameId,
		obj:breakpoint
	};
	for (const [key, exprsn] of Object.entries(breakpoint.variables)) {
		let args = {expression:exprsn,context:'watch',frameId:frameId}; 
		session.customRequest('evaluate', args).then(response => {
			response.command = 'evaluate';
			sub_variables(session, response, arg2, ["variables",key], panel);
		});
	}
}
