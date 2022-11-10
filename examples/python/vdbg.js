import { setup_generic_map } from "../../utilities/generic_map.js";

export function load(OVERLOADS) {
	console.log('----reload!!')
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

	OVERLOADS.PARSERS.topicB = function(data) {
		OVERLOADS.DRAWDATA.circles.push({draw_type:'circle', strokeStyle:'green', lineWidth:4,
		  x:data.variables.x, y:data.variables.y, radius:data.variables.radius,
		  scaleSizeToScreen:true});
	}

	OVERLOADS.HANDLER = function(data) {
		if (OVERLOADS.PARSERS.hasOwnProperty(data?.topic)) {
			OVERLOADS.PARSERS[data.topic](data);
			OVERLOADS.MAPFUNCS.draw();
		}
	}

}
