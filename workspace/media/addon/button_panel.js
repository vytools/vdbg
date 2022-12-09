let panel = document.body.querySelector('#button_panel');
if (!panel) {
  document.body.insertAdjacentHTML('beforeend','<div id="button_panel" style="position:absolute; width:50%; max-height:300px; bottom:30px; left:30px"></div>');
  panel = document.body.querySelector('#button_panel');
}
export const PANEL = panel;