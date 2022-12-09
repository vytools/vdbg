import { PANEL } from "./button_panel.js";
export function load(OVERLOADS) {
	if (OVERLOADS.addon && OVERLOADS.addon.toggle_named_breakpoints) {
        const bplist = {};
        const toggle = function(butt) {
            let nbp = butt.innerText;
            if (bplist[nbp]) {
                let disabled = null;
                bplist[nbp].forEach(bp => {
                    if (disabled == null) disabled = !bp.disabled;
                    bp.disabled = disabled;
                });
                if (disabled != null) {
                    butt.classList.remove((disabled) ? 'btn-dark' : 'btn-light');
                    butt.classList.add((disabled) ? 'btn-light' : 'btn-dark');
                }
                OVERLOADS.VSCODE.postMessage({type:'remove_breakpoints',breakpoints:bplist[nbp]});
                OVERLOADS.VSCODE.postMessage({type:'add_breakpoints',breakpoints:bplist[nbp]});
            }
        };

        OVERLOADS.addon.toggle_named_breakpoints.forEach(nbp => {
            PANEL.insertAdjacentHTML('beforeend',`<button class="toggle_named_breakpoints m-1 btn btn-light">${nbp}</button>`);
            bplist[nbp] = OVERLOADS.BREAKPOINTS.filter(bp => bp.name == nbp).map(bp => {
                let bpnew = JSON.parse(JSON.stringify(bp));
                bpnew.disabled = false;
                bpnew.line-=1;
                return bpnew
            });
        });
        PANEL.querySelectorAll('button.toggle_named_breakpoints').forEach(el => {
            el.addEventListener('click',(ev) => {toggle(ev.target.closest('button'));});
            toggle(el);
        });
	}
}
