import { process_results } from '../vyjs/js/display_results.js';
try {
    import('https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.0/purify.min.js').then();
} catch(err) {
}

export function load(OVERLOADS) {
	document.body.style.padding = '0px';
	document.body.style.margin = '0px';

    document.body.insertAdjacentHTML('beforeend',`<div class="content" style="position:absolute; width:100%; height:100%; overflow:hidden; padding:0px; margin:0px">
        <div style="height:50px; padding:5px">
            <a class="btn btn-dark btn-sm load">Load Results</a>
        </div>
        <div style="width:100%; height:calc(100% - 50px); overflow:scroll; padding:10px">
            <div id="default-Results"></div>
        </div>
    </div>`);

    // window.vysubmit = function() {
    //     console.log('vy submit')
    // }
    
    const load_results = function() {
        import('../vy_tools_results.json', {assert: {type: 'json'}}).then((exports) => { // assume vy_tools_results.json is at the top of the "media" folder
            let bd = document.querySelector('#default-Results');
            bd.innerHTML = '';
            bd.insertAdjacentHTML('beforeend', process_results(null, exports.default, bd, true));
        });
    }
    
    document.querySelector('a.load').addEventListener('click',load_results);
    OVERLOADS.HANDLER = function(data) {
        if (OVERLOADS.PARSERS.hasOwnProperty(data.topic)) {
            data.toggle = true;
            OVERLOADS.PARSERS[data.topic](data);
            OVERLOADS.MAPFUNCS.draw();
        }
        if (data.topic == '__terminate_debug_session__') {
            load_results();
        }
    }
}
