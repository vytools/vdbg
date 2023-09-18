import * as vdbg_sources from './sources';
import * as vscode from 'vscode';
import * as JSON5 from 'json5';

export class PydbgType extends vdbg_sources.LanguageDbgType {
    constructor(channel:vscode.OutputChannel, session:vscode.DebugSession, frameId:number, callback:Function) {
        super(channel, session);
        if (session.workspaceFolder) {
            let sources = vdbg_sources.dive(session.workspaceFolder.uri.fsPath,  /.*\.py/i);
            this._vdbgs = vdbg_sources.search(sources);
            this._vdbgs.breakpoints.forEach(bp => bp.line++); // add one because python uses 1 based indexing 
            callback(this);
        }
    }

    private async expand(response:any) {
        if (response.variablesReference) {
            let reslt = await this?._session?.customRequest('variables',{variablesReference:response.variablesReference});
            if (reslt.variables) {
                let islst = ['list','tuple'].indexOf(response.type) > -1;
                let lst:any = (islst) ? [] : {};
                for (var ii = 0; ii < reslt.variables.length; ii++) {
                    let v = reslt.variables[ii];
                    if (['special variables','function variables','len()'].indexOf(v.name) > -1) continue;
                    let nme = (islst) ? parseInt(reslt.variables[ii].name) : reslt.variables[ii].name; //.slice(1,-1);
                    lst[nme] = await this.parse(reslt.variables[ii]);
                }
                return lst;
            }
        }
        return {};
    }

    protected async post_eval(obj: any): Promise<void> {
        let jsonlst = (obj?.json5 && Array.isArray(obj.json5)) ? obj.json5 : []
        jsonlst.forEach((key:string) => {
            try {
                if (obj.variables.hasOwnProperty(key)) obj.variables[key] = JSON5.parse(obj.variables[key]);
            } catch(err) {
                this.channel.appendLine(JSON.stringify(err));
            }
        });
    }

    protected async parse(response:any) {
        if (!response.hasOwnProperty('result')) response.result = response.value;
        let x =  (response.type == 'float') ? parseFloat(response.result) : 
            (response.type == 'int') ? parseInt(response.result) : 
            (response.type == 'str') ? response.result.slice(1,-1) : await this.expand(response)
        return x;
    }
    
}
