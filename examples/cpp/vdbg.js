export function load(OVERLOADS) {
	const content = document.querySelector('.content');
	if (!content) return;
	OVERLOADS.DRAWDATA.plot = [];
	OVERLOADS.DRAWDATA.circles = [];
	content.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			OVERLOADS.VSCODE.postMessage({type:'evaluate',topic:'__on_show_elements__',expression: "-exec show print elements"});
			// OVERLOADS.VSCODE.postMessage({type:'evaluate',topic:'__on_set_print_elements__',expression: "-exec set print elements 200"});
			// OVERLOADS.VSCODE.postMessage({type:'get_breakpoints'});
		}
	});

	OVERLOADS.HANDLER = function(data) {
		if (data?.topic == '__on_show_elements__') {
			OVERLOADS.VSCODE.postMessage({type:'info',text:JSON.stringify(data.response.result)});
		} else if (data?.topic == 'sample') {
			// VSCODE.postMessage({type:'info',text:`i got ${JSON.stringify(data.variables)} sample`});
			OVERLOADS.DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
				x:data.variables.x, y:data.variables.y, radius:4, scaleSizeToScreen:true});
				OVERLOADS.MAPFUNCS.draw();
		} else if (data?.topic == 'test') {
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
