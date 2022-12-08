export function load(OVERLOADS) {
	if (OVERLOADS.addon && OVERLOADS.addon.command_inputs) {
	  function escapeHtml(unsafe) {
		return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
	  }
	  let panel = document.body.querySelector('#button_panel');
	  if (!panel) {
		document.body.insertAdjacentHTML('beforeend','<div id="button_panel" style="position:absolute; width:50%; max-height:300px; bottom:30px; left:30px"></div>');
		panel = document.body.querySelector('#button_panel');
	  }
	  for (const [key,val] of Object.entries(OVERLOADS.addon.command_inputs)) {
		let v = escapeHtml(JSON.stringify(val));
		panel.insertAdjacentHTML('beforeend',`
		<div class="input-group mb-1" data-keyword="${key}">
		  <input type="text" class="border form-control" title="${v}" aria-label="${v}">
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