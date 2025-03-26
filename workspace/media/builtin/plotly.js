import "../../vyjs/js/plotly-3.0.1.min.js"

export function load_vdbg(VDBG) {
  document.body.style.padding = '0px';
  document.body.style.margin = '0px';
  document.body.insertAdjacentHTML('beforeend',`<div class="content" style="position:absolute; width:100%; height:100%; overflow-x:hidden; overflow-y:auto; padding:0px; margin:0px">
  </div>`);
  let LAST = ''
  VDBG.register_topic('plotly_callback',(data) => {
    if (data.data == LAST) return;
    LAST = data.data;
    let bd = document.querySelector('.content');
    bd.innerHTML = '';
    try {
      let d = JSON.parse(data.data);
      if (!d.hasOwnProperty('plots')) {
        bd.insertAdjacentHTML('beforeend',`Plot file should have a "plots" element which is a list of plots:<br/><pre id="json-display">${data.data}</pre>`);
      } else {
        for (var i = 0; i < d.plots.length; i++) { // TODO is there any way at all to DOMPurify this?  
          let plotly_div = document.createElement('div');
          bd.appendChild(plotly_div);  
          Plotly.newPlot(plotly_div, d.plots[i].data || [], d.plots[i].layout || {}, d.plots[i].config || {});
        }
      }
    } catch(err) {
      bd.insertAdjacentHTML('beforeend',`Failed to plot (err=${err}):<br/><pre id="json-display">${data.data}</pre>`);
    }
  });
  setInterval(() => {
    VDBG.read("plotly","plotly_callback")
  },1000);
}
