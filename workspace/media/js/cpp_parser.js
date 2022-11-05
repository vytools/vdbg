export function load(OVERLOADS) {

    const cppstr = function(key,stri) {
        let newstr = stri.slice(stri.indexOf('=') + 1).trim();
        if (newstr.startsWith('"')) return newstr;
        if (!isNaN(parseFloat(newstr))) return parseFloat(newstr);
        newstr = newstr.replace(/std::[a-zA-Z0-9_\-,\s]+= /g,'');														// console.log('-A-',newstr);
        newstr = newstr.replace(/\[("[\w]+")\] = /g,'$1:'); // for std::map when a string is used?						// console.log('-B-',newstr);
        newstr = newstr.replace(/\[([0-9]+)\] = /g,'');		// for std::vector, std::list, std::tuple and std::pair?	// console.log('-C-',newstr);
        newstr = newstr.replace(/({|(, ))((\w+)) = /g,'$1"$3":');	// put quotes around variable names					// console.log('-D-',newstr);
        newstr = newstr.replace(/:([a-zA-Z_]\w+)/g,':"$1"');	// put quotes around alphanumeric values	            // console.log('-E-',newstr);
        
        // change {} to [] for arrays
        let openindex = [], newstr2 = '', started = false;
        for (var ii = 0; ii < newstr.length; ii++) {
            let c = newstr[ii];
            if (c == '{' && ii < newstr.length-1) {
                started = true;
                let isobj = newstr[ii+1]=='"';
                openindex.push(isobj);
                newstr2 += (isobj) ? '{' : '[';
            } else if (c == '}') {
                newstr2 += (openindex.pop()) ? '}' : ']';
            } else if (started) {
                newstr2 += c;
            }
        };   // console.log('-F-',newstr2);
        try {
            return JSON.parse(newstr2);
        } catch(err) {
            OVERLOADS.VSCODE.postMessage({type:'error',text:`Failed to parse ${key} see console log for details`});
            console.log('Failed to parse string as json, input: \n'+stri)
            console.log('Failed to parse string as json, output: \n'+newstr2)
        }
    }

    OVERLOADS.PARSERS.vdbg_cpp = function(data) {
        let success = true;
		if (data.hasOwnProperty('variables')) {
			for (const [key,value] of Object.entries(data.variables)) {
				let newvalue = cppstr(key, value);
                if (newvalue == undefined) {
                    success = false;
                } else {
                    data.variables[key] = newvalue;
                }
			}
		}
        return success;
	}


}

