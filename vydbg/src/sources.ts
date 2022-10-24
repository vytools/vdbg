import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

interface VyBreakpoint {
	name: string
	topic?: string
	variables?: object
}

export interface VyGdb {
  file: string;
	path: vscode.Uri;
	line: number;
	obj: VyBreakpoint;
}

export interface stackTraceBody {
	line: number;
	source: vscode.Uri;
}


var dive = function (dir: string | undefined, pattern: RegExp) {
	if (!dir) return [];
	let vydbgs:Array<VyGdb> = [];
	let list = fs.readdirSync(dir);
	list.forEach(function(file: string) { 				// For every file in the list
		const pth = path.join(dir,file);									// Full path of that file
		const stat = fs.statSync(pth);										// Get the file's stats
		if (stat.isDirectory() && ['.git','.hg','__pycache__'].indexOf(file) == -1) {	// If the file is a directory
			vydbgs = vydbgs.concat(dive(pth, pattern));			// Dive into the directory
		} else if (stat.isFile() && pattern.test(pth)) {	// If the file is a file
			let data = fs.readFileSync(pth,{encoding:'utf8', flag:'r'});
			let linecount = 1;
			data.split('\n').forEach((line:string) => {
				let matches = line.match( /<vydbg([\s\S]*?)vydbg>/gm);
				if (matches) {
					matches.forEach((match:string) => {
						try {
							let m = JSON.parse(match.replace('<vydbg','').replace('vydbg>',''));
							vydbgs.push({
								file:file,
								path:vscode.Uri.file(pth),
								line:linecount+1, // todo, smarter way to go to next uncommented line
								obj:m
							});
						} catch(err) {
							console.error(`Error parsing sources: ${err}`);
						}
					});
				}
				linecount++;
			});
		}
	});
	return vydbgs;
}

export function search(session: vscode.DebugSession | undefined) {
	return dive(session?.workspaceFolder?.uri.fsPath, /.*\.py/i);
}

export function checkVariables(breakpoints:Array<VyGdb>, current:stackTraceBody) {
	
	for (var ii = 0; ii < breakpoints.length; ii++) {
		let bp = breakpoints[ii];
		if (bp.path.path == current.source.path && bp.line == current.line) {
			console.log('HOOORAY',bp)
			if (bp.obj.variables) {
				return Object.keys(bp.obj.variables).map(key => { 
					return {key:key, expression:bp.obj.variables[key]}
				});
			} else {
				console.log('No variables')
			}
			break
		}
	}

}


		// let prog = vydebugConfig.active_program;
		// if (this._session && prog && vydebugConfig.programs && vydebugConfig.programs[prog]) {
		// 	
		// 	let program = vydebugConfig.programs[prog];
		// 	this._breakpoints = [];
		// 	Object.keys(program).forEach(bpname => {
		// 		vydbgs.forEach((bpp:vydbg_sources.VyGdb) => {
		// 			if (bpp.obj.name == bpname) {
		// 				this._breakpoints.push( bpp );
		// 				const pos = new vscode.Position(bpp.line, 0);
		// 				const loc = new vscode.Location(bpp.path, pos);
		// 				let bp = new vscode.SourceBreakpoint(loc, true);
		// 				vscode.debug.addBreakpoints([bp]);
		// 			}
		// 		});
		// 		// let uri = vscode.Uri.joinPath(folderUri,'junk.py');
		// 	});
		// }