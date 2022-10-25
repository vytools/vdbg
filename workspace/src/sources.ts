import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

interface Vbreakpoint {
	name: string
	topic?: string
	variables?: object
}

export interface Vdbg {
	file: string;
	path: vscode.Uri;
	line: number;
	obj: Vbreakpoint;
}

export interface stackTraceBody {
	line: number;
	source: vscode.Uri;
}

var dive = function (dir: string | undefined, pattern: RegExp) {
	if (!dir) return [];
	let vdbg:Array<Vdbg> = [];
	let list = fs.readdirSync(dir);
	list.forEach(function(file: string) { 												// For every file in the list
		const pth = path.join(dir,file);												// Full path of that file
		const stat = fs.statSync(pth);													// Get the file's stats
		if (stat.isDirectory() && ['.git','.hg','__pycache__'].indexOf(file) == -1) {	// If the file is a directory
			vdbg = vdbg.concat(dive(pth, pattern));										// Dive into the directory
		} else if (stat.isFile() && pattern.test(pth)) {								// If the file is a file
			let data = fs.readFileSync(pth,{encoding:'utf8', flag:'r'});
			let linecount = 1;
			data.split('\n').forEach((line:string) => {
				let matches = line.match( /<vdbg_bp([\s\S]*?)vdbg_bp>/gm);
				if (matches) {
					matches.forEach((match:string) => {
						try {
							let m = JSON.parse(match.replace('<vdbg_bp','').replace('vdbg_bp>',''));
							vdbg.push({
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
	return vdbg;
}

export function search(session: vscode.DebugSession | undefined) {
	return dive(session?.workspaceFolder?.uri.fsPath, /.*/); // /.*\.py/i
}
