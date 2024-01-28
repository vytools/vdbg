import { process_results } from '../../vyjs/js/display_results.js';

const set_message = function(levl,msg) {
  document.body.querySelector('div#msgheader').innerHTML = `<div class="alert alert-${levl} m-1 p-1">${msg}</div>`;
}

export function vy_tools_results(data) {
  // this is going to be relative to whatever imports and calls this load_results function.
  // That will usually be in the instance folder in the resources folder next to the builtin
  // folder containing this function. if vy_tools_results.json is in the media folder then the
  // path is ../../vy_tools_results.json
  try {
    let bd = document.querySelector('#default-Results');
    bd.innerHTML = '';
    process_results(null, data, bd, true);
    set_message('info',`Successfully re-loaded output file ${Date()}`);
  } catch(err) {
    set_message('danger',`Failed to process results file. ${err}`);
  }
}

export function load_vdbg(VDBG) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
  document.body.insertAdjacentHTML('beforeend',`<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px">
    <div id="msgheader" style="height:50px; padding:5px">
    </div>
    <div style="width:100%; height:calc(100% - 50px); overflow:scroll; padding:10px">
      <div id="default-Results"></div>
    </div>
  </div>`);
  setInterval(VDBG.vy_tools_results,2000);
}
