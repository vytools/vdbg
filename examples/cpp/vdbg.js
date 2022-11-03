import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/jsutilities@v1.0.1/generic_map.js";
import sheet from 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css' assert { type: 'css' };
document.adoptedStyleSheets = [sheet];

export function load(VSCODE, PARSERS, HANDLERS) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
	const CONTENT = document.querySelector('.content');
	const DRAWDATA = {plot:[], circles:[]};
	const MAPFUNCS = setup_generic_map(CONTENT, DRAWDATA);
	window.onresize = MAPFUNCS.resize;
	CONTENT.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			VSCODE.postMessage({type:'exec',topic:'__on_show_elements__',expression: "show print elements"});
			// VSCODE.postMessage({type:'exec',topic:'__on_set_print_elements__',expression: "set print elements 200"});
			// VSCODE.postMessage({type:'get_breakpoints'});
		}
	});

	const parse = function(data) {
		if (data.hasOwnProperty('variables')) {
			for (const [key,value] of Object.entries(data.variables)) {
				data.variables[key] = PARSERS.cpp(value);
			}
		}
	}

	HANDLERS.__on_show_elements__ = function(data) {
		VSCODE.postMessage({type:'info',text:JSON.stringify(data.response.result)});
	}

	HANDLERS.sample = function(data) {
		parse(data);
		// VSCODE.postMessage({type:'info',text:`i got ${JSON.stringify(data.variables)} sample`});
		DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
			x:data.variables.x, y:data.variables.y, radius:4, scaleSizeToScreen:true});
		MAPFUNCS.draw();
	}

	HANDLERS.list = function(data) {
		parse(data);
		DRAWDATA.plot = {draw_type:'polygon', strokeStyle:'green', lineWidth:4,
			points:data.variables.xy, scaleSizeToScreen:true, draw_toggle:'plot'};
		MAPFUNCS.draw();
	}

}
