import { PANEL } from "./button_panel.js";
export function load(OVERLOADS) {
	if (OVERLOADS.addon && OVERLOADS.addon.command_inputs) {
	  function escapeHtml(unsafe) {
		return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	  }
	  for (const [key,val] of Object.entries(OVERLOADS.addon.command_inputs)) {
		let v = escapeHtml(JSON.stringify(val));
		PANEL.insertAdjacentHTML('beforeend',`
		<div class="input-group mb-1" data-keyword="${key}">
		  <input type="text" class="border form-control" title="${v}" placeholder="${key}" aria-label="${key}">
		  <span class="cmd_bp input-group-text">+</span>
		</div>`);
	  }
	  document.body.querySelectorAll('span.cmd_bp').forEach(button => {
		button.addEventListener('click',function(ev) {
		  let d = ev.target.closest('div');
		  let kw = d.dataset.keyword;
		  let expr = JSON.stringify(OVERLOADS.addon.command_inputs[kw]);
		  let words = d.querySelector('input').value.split(/\s+/g);
		  for (var ii = 0; ii < words.length; ii++) {
			let r = new RegExp('\\$'+ii,'g');
			expr = expr.replace(r,words[ii]);
		  }
		  OVERLOADS.VSCODE.postMessage({type:'vdbg_bp',data:JSON.parse(expr)});
		});
	  });
	}
  }