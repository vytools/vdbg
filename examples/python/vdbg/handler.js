import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/vytools/jsutilities@v1.0.2/generic_map.js";
import sheet from 'https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css' assert { type: 'css' };
document.adoptedStyleSheets = [sheet];

export function load(OVERLOADS) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
	const content = document.querySelector('.content');
	OVERLOADS.DRAWDATA = {plot:[], circles:[]};
	OVERLOADS.MAPFUNCS = setup_generic_map(content, OVERLOADS.DRAWDATA);
	window.onresize = OVERLOADS.MAPFUNCS.resize;
	content.addEventListener('click',function(ev) {
		if (ev.detail == 3) { // triple click
		}
	});

	return function(data) {
		console.log('**py',data)
		// if (data?.topic == '__on_show_elements__') {
		// 	OVERLOADS.VSCODE.postMessage({type:'info',text:JSON.stringify(data.response.result)});
		// } else if (data?.topic == 'sample') {
		// }
	}

}
