export function load_vdbg(VDBG) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
  document.body.insertAdjacentHTML('beforeend',`
  <button id="refreshw" class="btn btn-dark" style="position:absolute;bottom:5px;left:5px">Refresh Window</button>
  <iframe id="sbot" srcdoc="<h1>Hey der Bub</h1>" 
  style="width:100vw;height:100vh;margin:0px;padding:0px;overflow:hidden;border:none;">
  </iframe>`);

  document.querySelector('#refreshw').addEventListener('click',()=>{
    VDBG.info('VDBG: refreshing!')
	// document.getElementById('sbot').src = document.getElementById('sbot').src
	document.getElementById('sbot').srcdoc = document.getElementById('sbot').srcdoc
  });
}
