import * as vscode from 'vscode';
const fs = require('fs');
const path = require('path');

var dive = function (dir: string | undefined, pattern: RegExp) {
	if (!dir) return;
  fs.readdir(dir, function(err: Error, list: Array<string>) {			// Read the directory
    if (err) return err;										// Return the error if something went wrong
    list.forEach((file: string) => { 					// For every file in the list
      const pth = path.join(dir,file);			// Full path of that file
      fs.stat(pth, function(err: Error, stat) {		// Get the file's stats
        if (err || !stat) return err;
				console.log('fB', file, stat.isFile(), pattern.test(pth))
        if (stat.isDirectory() && ['.git','.hg','__pycache__'].indexOf(file) == -1) {	// If the file is a directory
          dive(pth, pattern);								// Dive into the directory
				} else if (stat.isFile() && pattern.test(pth)) {	// If the file is a file
					fs.readFile(pth,'utf8',(err: Error, data) => {
						console.log('fC',file)
						// data.match( /<vygdb([\s\S]*?)vygdb>/gm).forEach(match => {
							// console.log('AA',match)
						// });
					})
				}
      });
    });
  });
}

export async function search(session: vscode.DebugSession) {
	dive(session.workspaceFolder?.uri.fsPath, /.*\.py/gm);
}

// string = file.read() #vyscripts += delimiter.findall(file.read())
// line = [m.end() for m in re.finditer('.*\n',string)]

// for m in re.finditer(delimiter, string):
// lineno = next(i for i in range(len(line)) if line[i]>m.start(1))
// mtch = m.group(1)
// try:
// 	cmd = json.loads(mtch)
// 	cmd['source'] = filename.split('/')[-1]+':'+str(lineno+1)
// 	if 'active' not in cmd:
// 		cmd['active'] = False # Always default to false
// 	for c in parsed_breakpoints.values():
// 		if cmd['source']==c['source']:
// 			raise ParseSourceException('Duplicate source breakpoint "'+c['source']+'"')            
