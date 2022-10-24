import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/natebu/jsutilities@v0.1.11/generic_map.js";
const DRAWDATA = {};
let MAPFUNCS = {};
let VSCODE = null;
let BREAKPOINTS = [];
let PROGRAMS = {
  "active_program": "test",
  "programs": {
    "test": {
      "bkpntA": {"stop":"count > 2","static":{"z":1}},
      "bkpntB": {"stop":true,"static":{"z":1}}
    }
  }
}

export function initializer(contentdiv, vscode) {
	MAPFUNCS = setup_generic_map(contentdiv, DRAWDATA);
	contentdiv.addEventListener('click',function(ev) {
		console.log('ev',ev)
		if (ev.detail == 3) { // triple click
			vscode.postMessage({type:'get_breakpoints'});
		}
		// if (VSCODE) {
		// 	VSCODE.postMessage({
		// 		type:'debug',
		// 		command:'evaluate',
		// 		data:{expression:'count*2',context:'watch'}
		// 	});
		// }
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
	if (!data || !data.topic) return
	if (data.topic == '__breakpoints__') {
		BREAKPOINTS = data.data;
	} else if (data.topic == '__stopped__') {
		// for (var ii = 0; ii < BREAKPOINTS.length; ii++) {
		// 	let bp = BREAKPOINTS[ii];
		// 	if (bp.path.path == data.data.source.path && bp.line == data.data.line) {
		// 		console.log('HOOORAY',bp)
		// 		if (bp.obj.variables) {
		// 			Object.keys(bp.obj.variables).forEach(key => {
		// 				VSCODE.postMessage({
		// 					type:'debug',
		// 					command:'evaluate',
		// 					data:{expression:bp.obj.variables[key],context:'watch'}
		// 				});						
		// 			})
		// 		}

		// 		if (bp.obj.name == 'bkpntA') {
		// 			// bp.obj.variables.
		// 		}
		// 		break;
		// 	}
		// }
	} else if (false) {
		DRAWDATA.circles.push({draw_type:'circle', fillStyle:'red', x:0, y:0, radius:radius});
		radius += 10;
		if (VSCODE) {
			VSCODE.postMessage({type:'alert',text:'i heard '+data.topic});
			VSCODE.setState(DRAWDATA);
		}
	}
	MAPFUNCS.draw();
}
