import { setup_generic_map } from "../../vyjs/js/generic_map.js";

export function load(OVERLOADS) {
	
	if (OVERLOADS.context != 'mysigmoidplotter') return;

	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
	const content = document.querySelector('.content');
	OVERLOADS.DRAWDATA = {plot:[], circles:[]};
	OVERLOADS.MAPFUNCS = setup_generic_map(content, OVERLOADS.DRAWDATA);
	window.onresize = OVERLOADS.MAPFUNCS.resize;
	content.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			OVERLOADS.VSCODE.postMessage({type:'evaluate',topic:'__on_show_elements__',expression: "-exec show print elements"});
			// OVERLOADS.VSCODE.postMessage({type:'evaluate',topic:'__on_set_print_elements__',expression: "-exec set print elements 200"});
			// OVERLOADS.VSCODE.postMessage({type:'get_breakpoints'});
		}
	});

	OVERLOADS.HANDLER =function(data) {
		if (data?.topic == '__on_show_elements__') {
			OVERLOADS.VSCODE.postMessage({type:'info',text:JSON.stringify(data.response.result)});
		} else if (data?.topic == 'sample') {
			// VSCODE.postMessage({type:'info',text:`i got ${JSON.stringify(data.variables)} sample`});
			OVERLOADS.DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
				x:data.variables.x, y:data.variables.y, radius:4, scaleSizeToScreen:true});
				OVERLOADS.MAPFUNCS.draw();
		} else if (data?.topic == 'test') {
			console.log('data',data)
			if (data.variables.x1 == 98 && data.variables.x2 == true && typeof(data.variables.j) == 'object') {
				OVERLOADS.VSCODE.postMessage({type:'info',text:`successfully parsed test`});
			} else {
				OVERLOADS.VSCODE.postMessage({type:'error',text:`failed to parse test`});
			}
		} else if (OVERLOADS.PARSERS.hasOwnProperty(data?.topic)) {
			OVERLOADS.PARSERS[data.topic](data);
		} else {
			OVERLOADS.VSCODE.postMessage({type:'info',text:`unhandled vdbg breakpoint ${JSON.stringify(data)}`});
		}
	}
}
