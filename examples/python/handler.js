import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/natebu/jsutilities@v0.1.20/generic_map.js";
const DRAWDATA = {};
let MAPFUNCS = {};
let VSCODE = null;
let BREAKPOINTS = [];

export function initializer(contentdiv, vscode) {
	MAPFUNCS = setup_generic_map(contentdiv, DRAWDATA);
	contentdiv.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			vscode.postMessage({type:'get_breakpoints'});
		}
	})
	window.onresize = MAPFUNCS.resize;
	if (vscode) VSCODE = vscode;
}

export function handler(data) {
	if (!DRAWDATA.circles) DRAWDATA.circles = [];
	if (!data || !data.topic) return
	VSCODE.postMessage({type:'alert',text:'i heard '+data.topic});
	let vrbls = data.variables;
	if (data.topic == 'yo') {
		VSCODE.postMessage({type:'alert',text:'yo response = '+JSON.stringify(data.response)});
	} else if (data.topic == '__breakpoints__') {
		BREAKPOINTS = data.data;
		VSCODE.postMessage({type:'request', response_topic:'yo', command:'evaluate',
			data:{expression:'count*2',context:'watch'}
		});
		// VSCODE.postMessage({type:'alert',text:'i got breakpoints '+JSON.stringify(BREAKPOINTS)});
	} else if (data.topic == 'topicB') {
		let n = DRAWDATA.circles.length;
		DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
			x:vrbls.xy.x, y:vrbls.xy.y, radius:vrbls.xy.radius});
	}
	MAPFUNCS.draw();
}
