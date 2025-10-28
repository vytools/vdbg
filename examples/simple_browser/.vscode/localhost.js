export function load_vdbg(VDBG) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';
  document.body.insertAdjacentHTML('beforeend',`
  <div class="d-flex flex-column p-4">
    <button id="refreshw" class="btn btn-dark flex-shrink-0">Nothing</button>
    <div class="md markdown-body flex-grow-1"></div>
  </div>`);

	VDBG.register_topic('markdown',(data) => {
    VDBG.log(data.data)
    document.querySelector('div.md').innerHTML = data.data;
	})

  VDBG.listen('test.md','markdown')

  document.querySelector('#refreshw').addEventListener('click',()=>{
    VDBG.info('VDBG: does nothing!')
  });
}
