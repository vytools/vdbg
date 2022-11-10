import * as vdbg_sources from './sources';
import * as vscode from 'vscode';

const cppstr = function(key:string,stri:string) {
    let newstr = stri.slice(stri.indexOf('=') + 1).trim();
    if (newstr.startsWith('"')) return newstr;
    if (!isNaN(parseFloat(newstr))) return parseFloat(newstr);
    newstr = newstr.replace(/std::[a-zA-Z0-9_\-]+ of length 0, capacity 0/g,'[]'); // replace emptys
    newstr = newstr.replace(/std::[a-zA-Z0-9_\-,\s]+= /g,'');														// console.log('-A-',newstr);
    newstr = newstr.replace(/\[("[\w]+")\] = /g,'$1:'); // for std::map when a string is used?						// console.log('-B-',newstr);
    newstr = newstr.replace(/\[([0-9]+)\] = /g,'');		// for std::vector, std::list, std::tuple and std::pair?	// console.log('-C-',newstr);
    newstr = newstr.replace(/({|(, ))((\w+)) = /g,'$1"$3":');	// put quotes around variable names					// console.log('-D-',newstr);
    newstr = newstr.replace(/:([a-zA-Z_]\w+)/g,':"$1"');	// put quotes around alphanumeric values	            // console.log('-E-',newstr);
    
    // change {} to [] for arrays
    let openindex:Array<Boolean> = [], newstr2 = '', started = false;
    for (var ii = 0; ii < newstr.length; ii++) {
        let c = newstr[ii];
        if (c == '{' && ii < newstr.length-1) {
            started = true;
            let isobj = /^"[\w\|]+":/.test(newstr.slice(ii+1));
            openindex.push(isobj);
            newstr2 += (isobj) ? '{' : '[';
        } else if (c == '}') {
            newstr2 += (openindex.pop()) ? '}' : ']';
        } else if (started) {
            newstr2 += c;
        }
    };   // console.log('-F-',newstr2);
    try {
        return JSON.parse(newstr2);
    } catch(err) {
        // OVERLOADS.VSCODE.postMessage({type:'error',text:`Failed to parse ${key} see console log for details`});
        console.log('Failed to parse string as json, input: \n'+stri)
        console.log('Failed to parse string as json, output: \n'+newstr2)
        return stri;
    }
}

export class CppdbgType extends vdbg_sources.LanguageDbgType {
    constructor(session:vscode.DebugSession, frameId:number, callback:Function) {
        super(session);
        session.customRequest('evaluate', {expression:`-exec set print elements 0`, context:'repl'});
        session.customRequest('evaluate', {expression:`-exec set print repeats 0`, context:'repl'});
        session.customRequest('evaluate', {expression:`-exec info sources`, frameId:frameId, context:'repl'}).then(response => {
			try {
                let sources = response.result.split(/\n/g).join(', ').split(', ');
				this._vdbgs = vdbg_sources.search(sources);
                callback(this);
			} catch(err) {
				vscode.window.showErrorMessage('vdbg error: Failed to find breakpoints '+err);
				return false;
			}
		});
    }

    public check_breakpoint(bpsource:vdbg_sources.stackTraceBody, callback:Function) {
        for (var ii = 0; ii < this._vdbgs.breakpoints.length; ii++) {
            let bp = this._vdbgs.breakpoints[ii];
            if (bp.uri.path == bpsource.source.path && bp.line == bpsource.line) {
                if (bp?.obj?.variables) {
                    let n = Object.keys(bp.obj.variables).length;
                    let obj = JSON.parse(JSON.stringify(bp.obj));
                    for (const [key, value] of Object.entries(obj.variables)) {
                        let req = {expression:`-exec print ${value}`, frameId:bpsource.id, context:'repl'};
                        this?._session?.customRequest('evaluate', req).then(response => {
                            obj.variables[key] = cppstr(key,response.result);
                            n -= 1;
                            if (n == 0) callback(obj);
                        });
                    }
                } else {
                    callback(bp.obj);
                }
            }
        }
    }
}
