import * as vdbg_sources from './sources';
import * as vscode from 'vscode';

const parse = function(key:string,stri:string) {
}

export class PydbgType extends vdbg_sources.LanguageDbgType {
    constructor(session:vscode.DebugSession, frameId:number, callback:Function) {
        super(session);
        if (session.workspaceFolder) {
            let sources = vdbg_sources.dive(session.workspaceFolder.uri.fsPath,  /.*\.py/i);
            this._vdbgs = vdbg_sources.search(sources);
            callback(this);
        }
    }

    public check_breakpoint(bpsource:vdbg_sources.stackTraceBody, callback:Function) {
        for (var ii = 0; ii < this._vdbgs.breakpoints.length; ii++) {
            let bp = this._vdbgs.breakpoints[ii];
            if (bp.uri.path == bpsource.source.path && bp.line == bpsource.line) {
                if (bp?.obj?.variables) {
                    let n = Object.keys(bp.obj.variables).length;
                    let obj = JSON.parse(JSON.stringify(bp.obj));
                    for (const [key, value] of Object.entries(obj.variables)) {
                        let req = {expression:value, frameId:bpsource.id, context:'repl'};
                        this?._session?.customRequest('evaluate', req).then(response => {
                            console.log('--',key,value,response)
                            // obj.variables[key] = response.result; //parse(key,response.result);
                            // n -= 1;
                            // if (n == 0) callback(obj);
                        });
                    }
                } else {
                    callback(bp.obj);
                }
                break;
            }
        }
    }
}
