import * as vdbg_sources from './sources';
import * as vscode from 'vscode';
import * as JSON5 from 'json5';

const parse = function(response:any) {
    return (response.type == 'float') ? parseFloat(response.result) : 
        ((response.type == 'int') ? parseInt(response.result) : 
        ((response.type == 'dict') ? JSON5.parse(response.result) : 
    response.result));
}

export class PydbgType extends vdbg_sources.LanguageDbgType {
    constructor(session:vscode.DebugSession, frameId:number, callback:Function) {
        super(session);
        if (session.workspaceFolder) {
            let sources = vdbg_sources.dive(session.workspaceFolder.uri.fsPath,  /.*\.py/i);
            this._vdbgs = vdbg_sources.search(sources);
            this._vdbgs.breakpoints.forEach(bp => bp.line++); // add one because python uses 1 based indexing 
            callback(this);
        }
    }

    public eval_breakpoint(bp:vdbg_sources.Vbreakpoint, frameId:number|undefined, callback:Function) {
        if (bp.variables) {
            let n = Object.keys(bp.variables).length;
            let obj = JSON.parse(JSON.stringify(bp));
            for (const [key, value] of Object.entries(obj.variables)) {
                let req:any = {expression:value, context:'repl'};
                if (frameId) req.frameId = frameId;
                this?._session?.customRequest('evaluate', req).then(response => {
                    obj.variables[key] = parse(response);
                    n -= 1;
                    if (n == 0) callback(obj);
                });
            }
        } else {
            callback(bp);
        }
    }
}
