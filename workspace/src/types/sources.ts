import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

export interface Vbreakpoint {
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

function paths_are_equal(path1:string, path2:string) {
	let path1_ = path.resolve(path1);
	let path2_ = path.resolve(path2);
	if (process.platform == "win32")
	  	return path1_.toLowerCase() === path2_.toLowerCase();
	return path1_ === path2_;
}

export class LanguageDbgType {
	protected channel:vscode.OutputChannel;
	protected _session: vscode.DebugSession | undefined;
	protected _vdbgs: Vdbg = {breakpoints:[], snips:[]};
    constructor(channel:vscode.OutputChannel, session:vscode.DebugSession) {
		this._session = session;
		this.channel = channel;
    }

	public get_vdbg():Vdbg {
		return this._vdbgs;
	}

	protected async parse(obj:any) {
		return null;
	}

	protected async pre_eval(obj:any) {
	}

	protected async post_eval(obj:any) {
	}

	protected async request_format(value:any) {
		return {expression:value, context:'repl'};
	}

    public async eval_breakpoint(bp:Vbreakpoint, frameId:number|undefined) {
        if (bp.variables) {
            const obj = JSON.parse(JSON.stringify(bp));
			await this.pre_eval(obj);
            for (const [key, value] of Object.entries(obj.variables)) {
                const req:any = await this.request_format(value);
                if (frameId) req.frameId = frameId;
                const response = await this?._session?.customRequest('evaluate', req);
                obj.variables[key] = await this.parse(response);
				// this.channel.appendLine('responseDB: '+JSON.stringify(obj,null,2));
            }
			// this.channel.appendLine('responseDC: '+JSON.stringify(obj,null,2));
			await this.post_eval(obj);
            return obj;
        } else {
            return bp;
        }
    }

    public check_breakpoint(bpsource:stackTraceBody, callback:Function) {
        for (let ii = 0; ii < this._vdbgs.breakpoints.length; ii++) {
            const bp = this._vdbgs.breakpoints[ii];
            if (paths_are_equal(bp.uri.fsPath, bpsource.source.path) && bp.line == bpsource.line && bp.obj) {
                this.eval_breakpoint(bp.obj, bpsource.id).then((obj:any) => {callback(obj)});
            }
        }
    }
}

export function search(sources:Array<string>):Vdbg {
	const vdbg:Vdbg = {breakpoints:[], snips:[]};
	sources.forEach(function(pth: string) { // For every file in the list
		if (fs.existsSync(pth) && fs.statSync(pth).isFile()) {	
			try {
				const uri = vscode.Uri.file(pth);
				const data = fs.readFileSync(pth,{encoding:'utf8', flag:'r'});
				const matches = data.match(/<vdbg_js([\s\S]*?)vdbg_js>/gm);
				if (matches) {
					matches.forEach((match:string) => {
						vdbg.snips.push(match.replace('<vdbg_js','').replace('vdbg_js>',''));
					});
				}
				let linecount = 0;
				data.split('\n').forEach((line:string) => {
					const matches = line.match( /<vdbg_bp([\s\S]*?)vdbg_bp>/gm);
					if (matches) {
						matches.forEach((match:string) => {
							const match2 = match.replace('<vdbg_bp','').replace('vdbg_bp>','');
							try {
								const m = JSON.parse(match2);
								vdbg.breakpoints.push({file:path.basename(pth),uri:uri,line:linecount+1,obj:m}); // breakpoint at line after (linecount+1)
							} catch(err) {
								vscode.window.showErrorMessage(`Invalid vdbg breakpoint at ${pth} line ${linecount}: ${match2}`);
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
	const list = fs.readdirSync(dir);
	list.forEach(function(file: string) { 												// For every file in the list
		const pth = path.join(dir,file);												// Full path of that file
		const stat = fs.statSync(pth);													// Get the file's stats
		if (stat.isDirectory() && ['.git','.hg','__pycache__','.pycache','node_modules'].indexOf(file) == -1) {	// If the file is a directory
			source = source.concat(dive(pth, pattern));								    // Dive into the directory
		} else if (stat.isFile() && pattern.test(pth)) {
			source.push(pth);
		}
	});
	return source;
}
