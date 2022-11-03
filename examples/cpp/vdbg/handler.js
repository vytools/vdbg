import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/jsutilities@v1.0.0/generic_map.js";

export function load(VSCODE, PARSERS, HANDLERS) {
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
	const CONTENT = document.querySelector('.content');
	const DRAWDATA = {circles:[],circles2:[]};
	const MAPFUNCS = setup_generic_map(CONTENT, DRAWDATA);
	CONTENT.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			VSCODE.postMessage({type:'exec',topic:'__on_set_print_elements__',expression: "set print elements 0"});
			VSCODE.postMessage({type:'get_breakpoints'});
		}
	});

	const parse = function(data) {
		if (data.hasOwnProperty('variables')) {
			for (const [key,value] of Object.entries(data.variables)) {
				data.variables[key] = PARSERS.cpp(value);
			}
		}
	}


	HANDLERS.__on_set_print_elements__ = function(data) {
		VSCODE.postMessage({type:'exec',topic:'__on_show_elements__',expression: "show print elements"});
	}
	HANDLERS.__on_show_elements__ = function(data) {
		VSCODE.postMessage({type:'info',text:JSON.stringify(data.response)});
	}

	window.onresize = MAPFUNCS.resize;

	HANDLERS.sample = function(data) {
		parse(data);
		VSCODE.postMessage({type:'info',text:`i got ${JSON.stringify(data.variables)} sample`});
		DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
			x:data.variables.x, y:data.variables.y, radius:4, scaleSizeToScreen:true});
		MAPFUNCS.draw();
	}

	HANDLERS.list = function(data) {
		parse(data);
		DRAWDATA.circles2 = {draw_type:'polygon', strokeStyle:'green', lineWidth:4,
			points:data.variables.xy, scaleSizeToScreen:true};
		MAPFUNCS.draw();
	}

}
