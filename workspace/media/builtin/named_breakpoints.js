export function toggle(VDBG, panel, toggle_named_breakpoints) {
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
      VDBG.remove_breakpoints(bplist[nbp]);
      VDBG.add_breakpoints(bplist[nbp]);
    }
  };

  toggle_named_breakpoints.forEach(nbp => {
    panel.insertAdjacentHTML('beforeend',`<button class="toggle_named_breakpoints m-1 btn btn-light">${nbp}</button>`);
    bplist[nbp] = VDBG.breakpoints.filter(bp => bp.name == nbp).map(bp => {
      let bpnew = JSON.parse(JSON.stringify(bp));
      bpnew.disabled = false;
      bpnew.line-=1;
      return bpnew
    });
  });
  panel.querySelectorAll('button.toggle_named_breakpoints').forEach(el => {
    el.addEventListener('click',(ev) => {toggle(ev.target.closest('button'));});
    toggle(el);
  });
}

export function enable(VDBG,enable_named_breakpoints) {
  VDBG.add_breakpoints(VDBG.breakpoints.map(bp => {
    let bpnew = JSON.parse(JSON.stringify(bp));
    bpnew.disabled = enable_named_breakpoints.indexOf(bp.name) < 0;
    bpnew.line-=1;  // zero based line numbers!
    return bpnew;
  }));
}

export function disable(VDBG,disable_named_breakpoints) {
  VDBG.add_breakpoints(VDBG.breakpoints.map(bp => {
    let bpnew = JSON.parse(JSON.stringify(bp));
    bpnew.disabled = disable_named_breakpoints.indexOf(bp.name) > -1;
    bpnew.line-=1;  // zero based line numbers!
    return bpnew;
  }));
}