import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

interface Vbreakpoint {
	name: string;
	topic?: string;
	variables?: object;
}

export interface Vbpobj {
	file: string;
	uri: vscode.Uri;
	line: number;
	obj: Vbreakpoint;
}

export interface Vdbg {
	breakpoints:Array<Vbpobj>;
	snips:Array<string>;
}

export interface stackTraceBody {
	id: number;
	line: number;
	source: vscode.Uri;
}

export class LanguageDbgType {
	protected _session: vscode.DebugSession | undefined;
	protected _vdbgs: Vdbg = {breakpoints:[], snips:[]};
    constructor(session:vscode.DebugSession) {
		this._session = session;
    }

	public get_vdbg():Vdbg {
		return this._vdbgs;
	}

    public check_breakpoint(bpsource:stackTraceBody, callback:Function) {
    }
}

export function search(sources:Array<string>):Vdbg {
	let vdbg:Vdbg = {breakpoints:[], snips:[]};
	sources.forEach(function(pth: string) { // For every file in the list
		if (fs.existsSync(pth) && fs.statSync(pth).isFile()) {	
			try {
				const uri = vscode.Uri.file(pth);
				let data = fs.readFileSync(pth,{encoding:'utf8', flag:'r'});
				let matches = data.match(/<vdbg_js([\s\S]*?)vdbg_js>/gm);
				if (matches) {
					matches.forEach((match:string) => {
						vdbg.snips.push(match.replace('<vdbg_js','').replace('vdbg_js>',''));
					});
				}
				let linecount = 1;
				data.split('\n').forEach((line:string) => {
					let matches = line.match( /<vdbg_bp([\s\S]*?)vdbg_bp>/gm);
					if (matches) {
						matches.forEach((match:string) => {
							try {
								let m = JSON.parse(match.replace('<vdbg_bp','').replace('vdbg_bp>',''));
								vdbg.breakpoints.push({file:path.basename(pth),uri:uri,line:linecount+1,obj:m});
							} catch(err) {
								console.error(`Error parsing sources: ${err}`);
							}
						});
					}
					linecount++;
				});
			} catch (err) {
				vscode.window.showErrorMessage(`vdbg: Problem reading source file ${pth}`);
			}
		}
	});
	return vdbg;
}

export function dive(dir: string | undefined, pattern: RegExp):Array<string> {
	if (!dir) return [];
	let source:Array<string> = [];
	let list = fs.readdirSync(dir);
	list.forEach(function(file: string) { 												// For every file in the list
		const pth = path.join(dir,file);												// Full path of that file
		const stat = fs.statSync(pth);													// Get the file's stats
		if (stat.isDirectory() && ['.git','.hg','__pycache__'].indexOf(file) == -1) {	// If the file is a directory
			source = source.concat(dive(pth, pattern));								    // Dive into the directory
		} else if (stat.isFile() && pattern.test(pth)) {
			source.push(pth);
		}
	});
	return source;
}
