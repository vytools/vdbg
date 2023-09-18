import * as vdbg_sources from './sources';
import * as vscode from 'vscode';

export class CppdbgType extends vdbg_sources.LanguageDbgType {
    protected nelements:Number = 100;
    protected nrepeats:Number = 9;
    constructor(channel:vscode.OutputChannel, session:vscode.DebugSession, frameId:number, callback:Function) {
        super(channel, session);
        session.customRequest('evaluate', { expression: `-exec show print elements`, context: 'repl' }).then(response => {
            let nelements = parseInt(response.result.trim().split(/\s/g).slice(-1))
            if (!isNaN(nelements)) this.nelements = nelements;
        });
        session.customRequest('evaluate', { expression: `-exec show print repeats`, context: 'repl' }).then(response => {
            let nrepeats = parseInt(response.result.trim().split(/\s/g).slice(-1))
            if (!isNaN(nrepeats)) this.nrepeats = nrepeats;
        });

        session.customRequest('evaluate', {expression:`-exec info sources`, frameId:frameId, context:'repl'}).then(response => {
			try {
                let sources = response.result.split(/\n/g).join(', ').split(', ');
				this._vdbgs = vdbg_sources.search(sources)
                this._vdbgs.breakpoints.forEach(bp => bp.line++); // add one because gdb uses 1 based indexing 
                callback(this);
			} catch(err) {
				vscode.window.showErrorMessage('vdbg error: Failed to find breakpoints '+err);
				return false;
			}
		});
    }
    protected async parse(obj:any) {
        return this.cppstr(obj.result);
    }

    protected async request_format(value:any) {
		return {expression:`-exec print ${value}`, context:'repl'};
	}

	protected async pre_eval(obj:any) {
        if (this && this._session) {
            await this._session.customRequest('evaluate',{expression:'-exec set print elements 0', context:'repl'});
            await this._session.customRequest('evaluate',{expression:'-exec set print repeats 0', context:'repl'});
        }
    }

	protected async post_eval(obj:any) {
        if (this && this._session) {
            await this._session.customRequest('evaluate',{expression:`-exec set print elements ${this.nelements}`, context:'repl'});
            await this._session.customRequest('evaluate',{expression:`-exec set print repeats ${this.nrepeats}`, context:'repl'});
        }
    }

    protected cppstr(stri:string) {
        let newstr = stri.slice(stri.indexOf('=') + 1).trim();
        if (newstr.startsWith('"')) return newstr;
        if (newstr.indexOf('{') == -1) newstr = newstr.split(/:/g).pop() || '';
        if (newstr == 'true') return true;
        if (newstr == 'false') return false;
        if (!isNaN(parseFloat(newstr))) return parseFloat(newstr);
        newstr = newstr.replace(/std::[a-zA-Z0-9_\-]+ of length 0, capacity 0/g,'[]'); // replace emptys
        newstr = newstr.replace(/std::[a-zA-Z0-9_\-,\s]+= /g,'');
        newstr = newstr.replace(/nan\(0x8000000000000\)/g,'null'); // nan => null
        newstr = newstr.replace(/\[("[\w]+")\] = /g,'$1:'); // for std::map when a string is used?
        newstr = newstr.replace(/\[([0-9]+)\] = /g,'');		// for std::vector, std::list, std::tuple and std::pair?
        newstr = newstr.replace(/({|(, ))((\w+)) = /g,'$1"$3":');	// put quotes around variable names
        newstr = newstr.replace(/:([a-zA-Z_]\w+)/g,(a,b) => {return (a==':true' || a==':false') ? a : `:"${b}"`});	// put quotes around alphanumeric values
        newstr = newstr.replace(/([0-9]+) '.{1,4}'/g,'$1');	// uint8_t and int8_t have some kind of char string after them
        newstr = newstr.replace(/"::"/g,'::'); // namespaced enums e.g.  "my_namespace"::"ONE" becomes "my_namespace::ONE"
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
        };   
        try {
            return JSON.parse(newstr2);
        } catch(err) {
            vscode.window.showErrorMessage(`Failed to parse variable see vdbg output channel for details`);
            this.channel.appendLine('Failed to parse string as json, input: \n'+stri);
            this.channel.appendLine('Failed to parse string as json, output: \n'+newstr2);
            return stri;
        }
    }
    
    

}
