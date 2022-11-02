import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/jsutilities@v1.0.0/generic_map.js";
const DRAWDATA = {};
let MAPFUNCS = {};
let VSCODE = null;

const cpp_pretty_parse = function(str) {
	str = str.slice(str.indexOf('=') + 1).trim();
	console.log(str,str.startsWith('"'))
	if (str.startsWith('"')) {
		return str.replace(/(^"|"$)/g,'');
	} else if (!isNaN(parseFloat(str))) {
		return parseFloat(str);
	} else if (str.startsWith('std::')) {
		let nxt = null;
		return cpp_pretty_parse(str);
		return {x:str}
	}
}

export function initializer(contentdiv, vscode) {
	MAPFUNCS = setup_generic_map(contentdiv, DRAWDATA);
	contentdiv.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
			vscode.postMessage({type:'get_breakpoints'});
		}
	})
	window.onresize = MAPFUNCS.resize;
	if (vscode) VSCODE = vscode; // don't send messages yet
}

export function handler(data) {
	// console.log('--data',JSON.stringify(data))
	if (!DRAWDATA.circles) DRAWDATA.circles = [];
	if (!data || !data.topic) return
	if (data.topic == '__on_breakpoint__') {
	} else if (data.topic == '__on_get_breakpoints__') {
		VSCODE.postMessage({type:'exec',topic:'__on_set_print_elements__',expression: "set print elements 0"});
	} else if (data.topic == '__on_set_print_elements__') {
		VSCODE.postMessage({type:'exec',topic:'__on_show_elements__',expression: "show print elements"});
	} else if (data.topic == '__on_show_elements__') {
		VSCODE.postMessage({type:'info',text: '-- '+JSON.stringify(data.response)});
	} else {
		if (data.hasOwnProperty('variables')) {
			for (const [key,value] of Object.entries(data.variables)) {
				data.variables[key] = cpp_pretty_parse(value);
			}
			console.log(data.variables)
		}
		if (data.topic == 'sample') {
			// VSCODE.postMessage({type:'info',text:`i got ${vrbls.a.w.z.length} samples`});
			// DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', 
			// 	x:vrbls.x, y:vrbls.y, radius:4, scaleSizeToScreen:true});
			// // VSCODE.postMessage({type:'info',text:'i heard '+JSON.stringify(vrbls.a.w.z)});
			// DRAWDATA.circles2 = vrbls.a.w.z.map(xy => {
			// 	return {draw_type:'circle', strokeStyle:'green', lineWidth:1,
			// 	x:xy.x, y:xy.y, radius:6, scaleSizeToScreen:true};
			// })
		}
	}
	MAPFUNCS.draw();
}
