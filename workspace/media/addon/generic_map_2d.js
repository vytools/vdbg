import { setup_generic_map } from "../vyjs/js/generic_map.js";

export function load(OVERLOADS) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
  OVERLOADS.DRAWDATA = {};
	document.body.insertAdjacentHTML('beforeend','<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px"></div>');
  const mapdiv = document.querySelector('.content');
  OVERLOADS.MAPFUNCS = setup_generic_map(mapdiv, OVERLOADS.DRAWDATA);
  window.resizemap = function(event) { OVERLOADS.MAPFUNCS.resize(); }
  OVERLOADS.HANDLER = function(data) {
    if (OVERLOADS.PARSERS.hasOwnProperty(data.topic)) {
      data.toggle = true;
      OVERLOADS.PARSERS[data.topic](data);
      OVERLOADS.MAPFUNCS.draw();
    }
  }
}
