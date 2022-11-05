import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

interface Vbreakpoint {
	name: string
	topic?: string
	variables?: object
}

interface Vbpobj {
	file: string;
	path: vscode.Uri;
	line: number;
	obj: Vbreakpoint;
}

export interface Vdbg {
	breakpoints:Array<Vbpobj>,
	snips:Array<string>
}

export interface stackTraceBody {
	id: number;
	line: number;
	source: vscode.Uri;
}


export function search(source_string:string) {
	let vdbg:Vdbg = {breakpoints:[], snips:[]};
	let sources = source_string.split(/\n/g).join(', ').split(', ');
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
								vdbg.breakpoints.push({file:path.basename(pth),path:uri,line:linecount+1,obj:m});
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
