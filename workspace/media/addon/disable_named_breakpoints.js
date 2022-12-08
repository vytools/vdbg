export function load(OVERLOADS) {
	if (OVERLOADS.addon && OVERLOADS.addon.disable_named_breakpoints) {
		let add = OVERLOADS.BREAKPOINTS
			.map(bp => {
				let bpnew = JSON.parse(JSON.stringify(bp));
				bpnew.disabled = OVERLOADS.addon.disable_named_breakpoints.indexOf(bp.name) > -1;
				bpnew.line-=1;
				return bpnew
			}); // zero based line numbers!
		OVERLOADS.VSCODE.postMessage({type:'add_breakpoints',breakpoints:add});
	}
}