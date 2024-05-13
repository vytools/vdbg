import { setup_generic_map } from "../../vyjs/js/generic_map.js";

export function load_vdbg(VDBG) {
	console.log('----reload!!')
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
	const content = document.querySelector('.content');
	const DRAWDATA = {plot:[], circles:[]};
	const MAPFUNCS = setup_generic_map(content, DRAWDATA);
	window.onresize = MAPFUNCS.resize;
	content.addEventListener('click',function(ev) {
		if (ev.detail == 2) { // double click
			VDBG.dap_send_message('evaluate',{expression:'j',context:'repl'},'checkj');
		}
	});
	VDBG.register_topic('checkj',(data) => {
		VDBG.log(data);
		VDBG.info(data);
	})
	VDBG.register_topic('topicB',(data)=> {
		VDBG.log(data)
		DRAWDATA.circles.push({draw_type:'circle', strokeStyle:'green', lineWidth:4,
			x:data.variables.xy.x, y:data.variables.xy.y, radius:data.variables.xy.radius,
			scaleSizeToScreen:true});
		MAPFUNCS.draw();
	})
	VDBG.register_topic('print',VDBG.log);

	VDBG.info(`Ready!`);

}
