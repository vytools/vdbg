# vdbg utilities
A group of javascript modules to make creating user interfaces simpler
You can use jsdelivr.net to get the latest modules. For example the module generic_map.js can be accessed in your javascript with (assuming a commit tag of 0.1.21 exists for this repo)

import { setup_generic_map } from "https://cdn.jsdelivr.net/gh/natebu/jsutilities@v0.1.21/generic_map.js";


## generic_map.js

generic_map.js uses zoom_pan_canvas.js to create a two dimensional grid and render objects defined in a DRAW_DATA object. These objects can be one of several types including "polygon", "circle", "text", "image", or "arc". The DRAW_DATA object does not have a specific format requirement. The object is searched recursively for sub-objects that have a "draw_type" field that matches one of the types listed above.  Here is a simple example of an html file that might use generic_map.js

```html
<html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
    <meta content="utf-8" http-equiv="encoding">    
    <style>.full {width:100%; height:100%;}</style>
  </head>

  <body class="full">
    <div id="map" class="full" onresize="resizex()"></div>
  </body>

<script type="module">
import { setup_generic_map } from "/generic_map.js";

var img1 = new Image();
img1.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAMAAABhEH5lAAAABGdBTUEAALGPC/xhBQAAAa1QTFRF5H444Ho14Xo15oQ45YQ45oI56os854Y443423HYtAAAA3HctzGAT9plE+qZM/eHE+bt///36/dy6+bVz+aFH/OHI/Nm1+aRP/vXr//jw5o9p/N/E/vPo9Kpw9bWD/vPq/vTs/enX/erW/MqV/ObT+8aR9ZM5+Zs7+sma4XRC+dGv98CR+LFs/dWt/vDh+9Ov+uDN+uDP/vj0/fDo9JRA8JFG9beG+ta686ds+6hQ+adV9ruN5oJN/PLt9MKj53Yx+qBC+J1C7qN599bD6IVM/O3h8Jxa97Bu//79+7Vu+Ld787mW/fTt8Jtf6oE78pA795c5/fPs64I77JRZ/NOq/Nu8/Lhv/unU/u7d3WQv4no343s3///++Zw995k843w3/vXt5XYy64s75H045oE45X846oo75oI554Q55YA46IU66IQ65oE56ok66IY654M56Yg62l0p3GAq3WMr5XMu6nwx53gv4Gcs/vv54mwt64Ay7YQz5HAu74c053Uv6Yc6+pw5+Jg48Ys084416Xow9JI27H8y9ZI3+Zo59pU374Y0+54695c48ow1////AGx8/AAAAA10Uk5T/fn5+fn9/fn5ywDLKOfV8VwAAAEpSURBVBjTVc5TcwMBFAXgWyVZ1LZt27YV2+aGm0YNNvc3d9PMdKbn8Xs45wBJEyKtwWi2s06bXi2kaBLoGpXX7wuFo4lkOsdlZQIaCJX3+elP4gU5BSKv/1F6uj69Upav72rQ+n03yKdnpixFFgy+0Nna1CCidPagJHkLGEPhVb6nuQNx7pCXjAPM4ahyoLuBa2lCnOclZQV7NKHkq+rrCm2IG5lUzARsInk+MYTY2V7bj8t3sYgOnKU/48ON2FrsRbyOBDVgS+ceLjcLo4h9mUU8DgYUoM9xL3ixNTaCC6k93A14JKDmsu+IV8VtXNo/Qpx0i0GYjb99vN7nbxnmZIdhulwVQMl+P/PrkWDA43Z9EkAL5P8EaCBpqoq1OKwmnUYhEVcSNPkD6BN5Z82OyewAAAAASUVORK5CYII=';
let DRAW_DATA = [
  {draw_type:'polygon', points:[{x:300,y:0},{x:400,y:0},{x:400,y:200}],circles:{radius:3,scaleSizeToScreen:true,color:'lime'},fillStyle:'red',strokeStyle:'rgba(0,0,0,0.5)'},
  {draw_type:'polygon', points:[{x:0,y:0},{x:200,y:0},{x:200,y:200}],fillStyle:'red',strokeStyle:'rgba(0,0,0,0.5)'},
  {draw_type:'circle', x:-200, y:-200, radius:10, fillStyle:'red',strokeStyle:'rgba(0,0,0,0.5)'},
  {draw_type:'circle', x:-230, y:-200, radius:10, fillStyle:'green',strokeStyle:'rgba(0,0,0,0.5)', scaleSizeToScreen:true},
  {draw_type:'text',x:200,y:-200,fillText:'hi',font:'30px Arial',fillStyle:'red',textAlign:'center'},
  {draw_type:'text',x:200,y:-250,fillText:'hi',font:'30px Arial',fillStyle:'green',textAlign:'center', scaleSizeToScreen:true},
  {draw_type:'image', x:-200, y:200, w:100, h:100, rotation:1.57, image:img1},
  {draw_type:'arc', x0:400, y0:-300, q0:Math.PI*4/2, k:0.01, L:100, strokeStyle:'blue', lineWidth:2}
];

let DRAW_EXT = {};
let MAPDIV = document.querySelector('#map');
let MAPFUNCS = setup_generic_map(MAPDIV, DRAW_DATA, DRAW_EXT);
window.resizex = function(event) { if (MAPFUNCS) MAPFUNCS.resize(); }
</script>

</html>
```

In addition custom draw_types can be defined. For example:

```html
<html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
    <meta content="utf-8" http-equiv="encoding">    
    <style>.full {width:100%; height:100%;}</style>
  </head>

  <body class="full">
    <div id="map" class="full" onresize="resizex()"></div>
  </body>

<script type="module">
import { setup_generic_map } from "/generic_map.js";
let DRAW_DATA = [
  {draw_type:'special_circle',xx:100,yy:-100}
];

let DRAW_EXT = {
  special_circle:function(obj,ctx) {
    let trnsfrm = ctx.get_transform();
    ctx.lineWidth = 1/trnsfrm.a;
    ctx.strokeStyle = 'black';
    ctx.beginPath();
    ctx.arc(obj.xx, obj.yy, 10/trnsfrm.a, 0, 2 * Math.PI, false);
    ctx.stroke();
    let fontsize = Math.max(1,Math.floor(12/trnsfrm.a));
    console.log(fontsize)
    ctx.font = fontsize + 'px Courier';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'black';
    ctx.scale(1,-1);
    ctx.fillText('Special!',obj.xx,-obj.yy)
    ctx.scale(1,-1);
  }
};

let MAPDIV = document.querySelector('#map');
let MAPFUNCS = setup_generic_map(MAPDIV, DRAW_DATA, DRAW_EXT);
window.resizex = function(event) { if (MAPFUNCS) MAPFUNCS.resize(); }
</script>

</html>
```



Finally, the visibility of the sub-objects can be made to toggle on off
```html
<html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
    <meta content="utf-8" http-equiv="encoding">    
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
    <style>.full {width:100%; height:100%;}</style>
  </head>

  <body class="full">
    <div id="map" class="full" onresize="resizex()"></div>
  </body>

<script type="module">
import { setup_generic_map } from "/generic_map.js";
let DRAW_DATA = [
  {
    draw_toggle:'circleA',
    x:{draw_type:'circle',fillStyle:'blue',x:100,y:-100,radius:100,strokeStyle:'black',lineWidth:1}
  },
  {
    draw_toggle:'circleB',
    _draw_toggle_off_:true,
    somestuff:[
        {draw_type:'circle',fillStyle:'red',x:100,y:-300,radius:100,strokeStyle:'black',lineWidth:5},
        {draw_type:'circle',fillStyle:'purple',x:300,y:-300,radius:100,strokeStyle:'black',lineWidth:5,scaleSizeToScreen:true}
    ]
  }
];

let MAPDIV = document.querySelector('#map');
let MAPFUNCS = setup_generic_map(MAPDIV, DRAW_DATA, DRAW_EXT);
window.resizex = function(event) { if (MAPFUNCS) MAPFUNCS.resize(); }
</script>

</html>

```


## flex.js and flex.css 

Tools for resizable divs, use the \<flex\>, \<flexitem\> and \<flexresizer\> tags along with the "display:flex" style properties

```html
<html>
  <head>
    <meta content="text/html;charset=utf-8" http-equiv="Content-Type">
    <meta content="utf-8" http-equiv="encoding">    
    <link rel="stylesheet" href="/flex.css">
    <script type="text/javascript" src="/flex.js" defer></script>
    <style>.full {width:100%; height:100%;}</style>
  </head>

  <body class="full">
    <div class="full" style="display:flex;">
      <flex class="h full">
        <flexitem class="full" style="flex: 1;min-width:300px;overflow: auto;">
          <flex class="v full">
            <flexitem class="full" style="flex: 1;">
              <h1>hey der bub</h1>
            </flexitem>
            <flexresizer></flexresizer>
            <flexitem class="full" style="flex: 3;">
              <h1>hey der bub agin</h1>
            </flexitem>
          </flex>
        </flexitem>
        <flexresizer></flexresizer>
        <flexitem class="full" style="flex: 3;">
          <h1>O hi</h1>
        </flexitem>
      </flex>
    </div>
  </body>
</html>
```
## mousefollower.js

In progress...

## chartjs.js

In progress...

## definition_form.js definition_form.css

In progress...
