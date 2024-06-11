import { setup_generic_map } from "../../vyjs/js/generic_map.js";
import { create_panel } from  "../../builtin/button_panel.js";
import { add_inputs } from "../../builtin/assess_inputs.js";

import * as NAMED_BREAKPOINTS from "../../builtin/named_breakpoints.js";

export function load_vdbg(VDBG) {
  document.body.style.padding = '0px';
  document.body.style.margin = '0px';
  document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
  const DRAW_DATA = {plot:[],circles:[]};
  const MAPFUNCS = setup_generic_map(document.querySelector('.content'), DRAW_DATA);
  const panel = create_panel();
  NAMED_BREAKPOINTS.toggle(VDBG, panel, ["test"]);
  NAMED_BREAKPOINTS.enable(VDBG, ["function", "sample"]);
  MAPFUNCS.CANVAS.addEventListener('click',function(ev) {
    if (ev.detail == 2) {
      if (ev.shiftKey) {
        // VDBG.dap_send_message('evaluate',{expression:`j`,context:'repl'},'info');
        // VDBG.dap_send_message('evaluate',{expression:`-exec p j`,context:'repl'},'info');
        // VDBG.dap_send_message('evaluate',{expression:"-exec show print elements",context:'repl'},'info');
        // VDBG.dap_send_message('evaluate',{expression:"-exec set print elements 200",context:'repl'},'info');
      } else {
        let P = MAPFUNCS.eventToPosition(ev);
        VDBG.dap_send_message('evaluate',{expression:`-exec p xval=${P.x}, yval=sig(${P.x})`,context:'repl'},'clicksample');
      }
    }
  });
  window.resizemap = function(event) { MAPFUNCS.resize(); }
  VDBG.register_topic('info',VDBG.info); 
  VDBG.register_topic('clicksample',(data)=> {
    VDBG.assess({topic:'sample', variables:{x:'xval',y:'yval'}})
  }); 
  add_inputs(VDBG, panel, {
    "variable_to_print":{"variables":{"$0":"$0"},"topic":"vdbglog"}
  })
  VDBG.register_topic('vdbglog',(data)=> {
    VDBG.log(data.variables);
  });
  VDBG.register_topic('sample',(data)=> {
    VDBG.log(data.variables);
    VDBG.info(data.variables);
    DRAW_DATA.circles.push({draw_type:'circle', fillStyle:'red', 
      x:data.variables.x, y:data.variables.y, radius:4, scaleSizeToScreen:true});
    MAPFUNCS.draw();
  });
  VDBG.register_topic('fullfunc',(data) => {
    DRAW_DATA.plot = {draw_type:'polygon', strokeStyle:'green', lineWidth:4,
      points:data.variables.xy, scaleSizeToScreen:true, draw_toggle:'plot'};
    MAPFUNCS.centerMapWithDimensions(0,0,5,5)
    MAPFUNCS.draw();
  });
  VDBG.register_topic('test',(data)=> {
    if (data.variables.x1 == 98 && data.variables.x2 == true && typeof(data.variables.j) == 'object') {
      VDBG.info('successfully parsed test');
    } else {
      VDBG.error('failed parsed test');
    }
  });
}
