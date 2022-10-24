import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/natebu/jsutilities@v0.1.11/generic_map.js";
const DRAWDATA = {};
let MAPFUNCS = {};
let VSCODE = null;

export function initializer(contentdiv, vscode) {
	MAPFUNCS = setup_generic_map(contentdiv, DRAWDATA);
	contentdiv.addEventListener('click',function(ev) {
		if (VSCODE) {
			VSCODE.postMessage({
				type:'debug',
				command:'evaluate',
				data:{expression:'count*2',context:'watch'}
			});
		}
		// let arg = {expression: message.text, frameId: frameId, context:'watch'};
	})
	window.onresize = MAPFUNCS.resize;
	if (vscode) {
		VSCODE = vscode;
		let state = VSCODE.getState();
		if (state) {
			Object.keys(state).forEach(key => {
				DRAWDATA[key] = state[key];
			});
			MAPFUNCS.draw();
		}
	}
}

let radius = 10;
export function handler(data) {
	if (!DRAWDATA.circles) DRAWDATA.circles = [];
	DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', x:0, y:0, radius:radius});
	radius += 10;
	if (VSCODE) {
		VSCODE.postMessage({type:'alert',text:'i heard '+data.topic});
		VSCODE.setState(DRAWDATA);
	}
	MAPFUNCS.draw();
}
