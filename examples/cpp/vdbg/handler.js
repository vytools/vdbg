import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/jsutilities@v1.0.0/generic_map.js";
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
	VSCODE.postMessage({type:'info',text:'i heard '+data.topic});
	let vrbls = data.variables;
	if (data.topic == 'sample') {
		DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
			x:vrbls.x, y:vrbls.y, radius:4, scaleSizeToScreen:true});
		// VSCODE.postMessage({type:'info',text:'i heard '+JSON.stringify(vrbls.a.w.z)});
		DRAWDATA.circles2 = vrbls.a.w.z.map(xy => {
			return {draw_type:'circle', strokeStyle:'blue', 
			x:xy.x, y:xy.y, radius:6, scaleSizeToScreen:true};
		})
	}
	MAPFUNCS.draw();
}
