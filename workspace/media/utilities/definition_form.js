const native = {
    "bool":{type:"checkbox",default:false,cl:"form-check-input d_f_d_chk",attributes:'',op:x => x == 'true'},
    "string":{type:"text",default:'',cl:"form-control",attributes:'',op: x=>x},
    "float32":{type:"number",default:0,cl:"form-control",attributes:'step="any"',op:parseFloat},
    "float64":{type:"number",default:0,cl:"form-control",attributes:'step="any"',op:parseFloat},
    "int16":{type:"number",default:0,cl:"form-control",attributes:'step:"1" min="-32768" max="32767"',op:parseInt},
    "uint16":{type:"number",default:0,cl:"form-control",attributes:'step:"1" min="0" max="32767"',op:parseInt},
    "int8":{type:"number",default:0,cl:"form-control",attributes:'step:"1" min="-128" max="127"',op:parseInt},
    "uint8":{type:"number",default:0,cl:"form-control",attributes:'step:"1" min="0" max="255"',op:parseInt},
    "int32":{type:"number",default:0,cl:"form-control",attributes:'step:"1"',op:parseInt},
    "uint32":{type:"number",default:0,cl:"form-control",attributes:'step:"1" min="0"',op:parseInt},
}
const INITIALCHAR = '_';

const create_fields = function(topcontainer, definitions, topdef, obj, accumulated_name, deletable, ignore) {
    let labl = (deletable > -1) ? `<button class="btn d_f_d_xs btn-dark d_f_d_rf" data-rmv="${accumulated_name}">-</button>` : '';
    if (native.hasOwnProperty(topdef.type)) {
        let n = native[topdef.type];
        topcontainer.classList.add('row');
        let val = (obj == null) ? n.default : obj;
        let inp = `<div class="col-sm-6 col-form-label-sm">
            <input type="${n.type}" data-ntyp="${topdef.type}" data-pth="${accumulated_name}" class="form-control-sm ${n.cl}" ${n.attributes} value="${val}"></div>`;
        let txt = `<label class="col-sm-6">${labl + (topdef.name || '')}</label>${inp}`
        
        topcontainer.insertAdjacentHTML('beforeend',txt);
    } else if (definitions.hasOwnProperty(topdef.type)) {

        topcontainer.insertAdjacentHTML('beforeend',`<div class="d_f_d_0"><div class="d_f_d_1">${labl}</div><div class="d_f_d_2"></div></div>`);
        let nodes = topcontainer.querySelectorAll('div.d_f_d_2');
        let container = nodes[nodes.length-1];
    
        definitions[topdef.type].forEach(d => {
            let isarray = d.hasOwnProperty('length');
            let val = (obj != null && obj.hasOwnProperty(d.name)) ? obj[d.name] : null;
            let n = 0, unlimited = d.length == '?';
            let accname = accumulated_name + '.' + d.name;
            let subcontainer = container;
            if (ignore.filter(ig => accname.match(ig)).length == 0) {
                if (definitions.hasOwnProperty(d.type)) {
                    let nn = ((unlimited) ? '<button class="btn d_f_d_xs btn-dark d_f_d_a">+</button>&nbsp;' : '') + d.name;
                    container.insertAdjacentHTML('beforeend',`<label class="d_f_d_t" data-name="${accname}">${nn}</label>
                    <div class="d_f_d_s hide" data-name="${accname}"></div>`);
                    subcontainer = container.querySelector(`div[data-name='${accname}']`);
                }
                if (isarray) {
                    if (val == null) val = []
                    n = parseInt(d.length) || val.length;
                    if (isNaN(parseInt(d.length)) && d.length != '?') {
                        subcontainer.insertAdjacentHTML('beforeend',`<p>Problem with ${JSON.stringify(d)}`);
                    } else {
                        for (var ii = 0; ii < n; ii++) {
                            create_fields(subcontainer, definitions, d, (val.length > ii) ? val[ii] : null,accname + '.' + ii,(unlimited) ? ii : -1, ignore);
                        }
                    }
                } else {
                    create_fields(subcontainer, definitions, d, val, accname, -1, ignore);
                }
            }
        });
    } else {
        console.log('Failed to find type: '+topdef)
        topcontainer.insertAdjacentHTML('beforeend','<pre>'+topdef+': '+JSON.stringify(obj,null,2)+'</pre>');
    }
}

const toggle_by_li = function(li,toggle) {
    if (li) {
        let div = li.parentElement.querySelector(`div[data-name='${li.dataset.name}']`);
        if (div) { if (toggle) { div.classList.toggle("hide"); } else { div.classList.remove("hide");} }
    }
}

const create_object_of_type = function(typ, definitions) {
    if (native.hasOwnProperty(typ)) {
        return native[typ].default;
    } else if (definitions.hasOwnProperty(typ)) {
        let obj = {};
        definitions[typ].forEach(d => {
            if (d.hasOwnProperty('length')) {
                obj[d.name] = [];
                let n = parseInt(d.length);
                if (~isNaN(n)) {
                    for (var ii = 0; ii < n; ii++) {
                        obj[d.name].push(create_object_of_type(d.type, definitions));
                    }
                }
            } else {
                obj[d.name] = create_object_of_type(d.type, definitions);
            }
        })
        return obj;
    } else {
        return null;
    }
}

const by_path = function(container, topdef, path, mod, newval, D) {
    if (D.definitions.hasOwnProperty(topdef.type)) {
        let defs = D.definitions[topdef.type];
        let subobj = D.object;
        let paths = path.replace(INITIALCHAR+'.','').split('.');
        for (var jj = 0; jj < paths.length; jj++) {
            let p = paths[jj];
            let last = jj+1 == paths.length;
            if (!isNaN(parseInt(p))) {
                if (subobj.hasOwnProperty(p)) {
                    if (last) {
                        if (mod=='rmv') {
                            subobj.splice(p,1);
                            recreate_new_form_with_visible(container, topdef, path, D);
                        } else if (mod == 'mod') {
                            subobj[p] = newval;
                        } // add is taken care of before you ever get here
                        if (D.functions.on_change) D.functions.on_change(path,newval,D.object);
                    } else {
                        subobj = subobj[p];
                    }
                } else {
                    console.log('fail 1 in by_path');
                }
            } else {
                let exists = subobj.hasOwnProperty(p);
                for (var ii = 0; ii < defs.length; ii++) {
                    let def = defs[ii];
                    if (def.name == p) {
                        if (last || !exists) {
                            if (mod == 'rmv') {} else { // can't remove an object only an array item
                                let o = create_object_of_type(def.type, D.definitions);
                                let is_array = def.hasOwnProperty('length');
                                if (mod == 'mod' && last) {
                                    subobj[p] = newval;
                                } else if (is_array) {
                                    if (!exists) subobj[p] = [];
                                    subobj[p].push(o);
                                    recreate_new_form_with_visible(container, topdef, path, D);
                                } else {
                                    subobj[p] = o;
                                    recreate_new_form_with_visible(container, topdef, path, D);
                                }
                                if (D.functions.on_change) D.functions.on_change(path,newval,D.object);
                            }
                            return;
                        } else if (D.definitions.hasOwnProperty(def.type)) {
                            defs = D.definitions[def.type];
                            subobj = subobj[p];
                        } else {
                            console.log('fail 2 in by_path')
                        }
                        break;
                    }
                }
            }
        }
    }
}

const create_new_form = function(container, topdef, D) {
    let f = container.querySelector('div.data_form_top_div');
    while(f.firstChild){ f.removeChild(f.firstChild);}
    let ignore = D.functions.ignore || [];
    create_fields(f, D.definitions, topdef, D.object, INITIALCHAR, -1, ignore);
    container.querySelectorAll("label.d_f_d_t").forEach(li => {
        li.addEventListener('click', (ev) => { 
            ev.stopPropagation();
            ev.preventDefault();
            toggle_by_li(ev.target,true);
        });
    });
    container.querySelectorAll("button.d_f_d_rf").forEach(button => {
        button.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            let b = ev.target.closest('button');
            if (b) {
                by_path(container, topdef, b.dataset.rmv, 'rmv', 0, D);
            }
        });
    });
    container.querySelectorAll("button.d_f_d_a").forEach(button => {
        button.addEventListener('click', (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            let li = ev.target.closest('label.d_f_d_t');
            if (li) {
                toggle_by_li(li,false);
                by_path(container, topdef, li.dataset.name, 'add', 0, D);
            }
        });
    });
    container.querySelectorAll('input').forEach(inp => {
        inp.addEventListener('input', (ev) => {
            if (native.hasOwnProperty(inp.dataset.ntyp)) {
                let val = native[inp.dataset.ntyp].op(inp.value);
                by_path(container, topdef, inp.dataset.pth, 'mod', val, D);
            }
        });
    });
    
}

const recreate_new_form_with_visible = function(container, topdef, path, D) {
    create_new_form(container, topdef, D);
    container.querySelectorAll('div[data-name]').forEach(el => {
        if (path.startsWith(el.dataset.name)) el.classList.remove('hide');
    });
}

export function create(container, definitions, def, obj, functions) {
    if (!definitions.hasOwnProperty(def)) {
        console.log(`Definitions do not container "${def}"`);
        return;
    }
    let D = {
        definitions:definitions,
        object:obj || create_object_of_type(def,definitions),
        functions:functions
    };
    while(container.firstChild){ container.removeChild(container.firstChild);}
    container.insertAdjacentHTML('beforeend',`
        <input class="upload" type="file" style="display: none;"/>
        <div class="definition_form_buttons" style="padding:5px">
            <button class="btn btn-sm btn-dark upload">Upload</button>
            ${(functions.save) ? '<button class="btn btn-sm btn-dark upload">Save</button>' : ''}
        </div>
        <div class="data_form_top_div" style="flex:1"></div>
    `);
    if (functions.save) {
        container.querySelector('button.save').addEventListener('click',function(ev) {
            functions.save(D.object)
        });
    }
    container.querySelector('button.upload').addEventListener('click',function(ev) {
        container.querySelector('input.upload').click();
    });
    container.querySelector('input.upload').addEventListener('change',function(event) {
        event.preventDefault();
        var self = this;
        if (!(event.target.files && event.target.files.length>0)) return;
        var isbinary = self.isbinary;
        var file = event.target.files[0]; //TODO Modify for multiple files
        var reader = new FileReader();
        reader.onload = function(event) {
          var rslt = reader.result;
          var data = JSON.parse((isbinary) ? new Uint8Array(rslt) : rslt);
          for (var key in data) { D.object[key] = data[key];}
          create_new_form(container, {type:def}, D);
          if (D.functions.on_change) D.functions.on_change('',null,D.object);
        };
        if (isbinary) {
          reader.readAsArrayBuffer(file); //read the file as arraybuffer
        } else {
          reader.readAsText(file);
        }
    });
    create_new_form(container, {type:def}, D);
}