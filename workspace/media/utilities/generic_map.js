import { initialize_map } from "./zoom_pan_canvas.js";

const angle_mod = function(q) {
  let qm = q % (Math.PI*2);
  if (qm >  Math.PI) qm -= 2*Math.PI;
  if (qm < -Math.PI) qm += 2*Math.PI;
  return qm;
}

let draw_arc = function(arc, ctx) {
  let trnsfrm = ctx.get_transform();
  if (arc.lineWidth) ctx.lineWidth = arc.lineWidth / trnsfrm.a;
  if (arc.fillStyle) ctx.fillStyle = arc.fillStyle;
  if (arc.strokeStyle) ctx.strokeStyle = arc.strokeStyle
  let x0 = arc.x0 || 0;
  let y0 = arc.y0 || 0;
  let q0 = arc.q0 || 0;
  let k = arc.k || 0;
  ctx.beginPath();
  if (Math.abs(k) > 0.001) { // something happens below this limit so that it doesn't draw correctly, make it a straight line
    let dq = (k > 0) ? Math.PI/2 : -Math.PI/2;
    let r = Math.abs(1/k);
    let cx = x0 + Math.cos(q0+dq)*r;
    let cy = y0 + Math.sin(q0+dq)*r;
    ctx.arc(cx, cy, r, q0-dq, q0-dq+arc.L*k, k*arc.L < 0);
  } else {
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + arc.L*Math.cos(q0), y0 + arc.L*Math.sin(q0));
  }
  if (arc.fillStyle) ctx.fill();
  if (arc.strokeStyle) ctx.stroke();
}

let draw_image = function(img, ctx) {
  ctx.save();
  ctx.translate(img.x, img.y);
  ctx.rotate(img.rotation);
  ctx.drawImage(img.image, 0, 0, img.w, img.h);
  ctx.restore();
}

let draw_polygon = function(poly, ctx) {
  if (poly.points.length < 2) return;
  let trnsfrm = ctx.get_transform();
  if (poly.lineWidth) ctx.lineWidth = poly.lineWidth / trnsfrm.a;
  if (poly.fillStyle) ctx.fillStyle = poly.fillStyle;
  if (poly.strokeStyle) ctx.strokeStyle = poly.strokeStyle
  ctx.beginPath();
  ctx.moveTo(poly.points[0].x, poly.points[0].y);
  poly.points.forEach(p => { ctx.lineTo(p.x, p.y); })
  if (poly.fillStyle) ctx.fill();
  if (poly.strokeStyle) ctx.stroke();

  if (poly.circles && poly.circles.radius && poly.circles.color) {
    ctx.fillStyle = poly.circles.color;
    let r = (poly.circles.scaleSizeToScreen) ? poly.circles.radius/trnsfrm.a : poly.circles.radius;
    poly.points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, 2 * Math.PI, false);
      ctx.fill();
    });
  }
}

let draw_circle = function(circ, ctx) {
  let trnsfrm = ctx.get_transform();
  let radius = circ.pixradius || circ.radius; // backward compatibility with pixradius instead of scaleSizeToScreen;
  if (circ.scaleSizeToScreen || circ.pixradius) radius /= trnsfrm.a;
  if (circ.lineWidth) ctx.lineWidth = (circ.scaleSizeToScreen) ? circ.lineWidth/trnsfrm.a : circ.lineWidth; // * trnsfrm.a;
  if (circ.fillStyle) ctx.fillStyle = circ.fillStyle;
  if (circ.strokeStyle) ctx.strokeStyle = circ.strokeStyle;
  ctx.beginPath();
  ctx.arc(circ.x, circ.y, radius, 0, 2 * Math.PI, false);
  if (circ.fillStyle) ctx.fill();
  if (circ.strokeStyle || circ.lineWidth) ctx.stroke()
}

let draw_text = function(txt, ctx) {
  let font = txt.font;
  if (font && txt.scaleSizeToScreen) {
    let splt = txt.font.split('px');
    let px = parseInt(splt[0]);
    if (splt.length > 1 && !isNaN(px)) {
      let trnsfrm = ctx.get_transform();
      splt[0] = ''+(px/trnsfrm.a);
      font = splt.join('px');
      //console.log('font',font);
    }
  }
  if (font) ctx.font = font; //"30px Arial";
  if (txt.fillStyle) ctx.fillStyle = txt.fillStyle; //"red";
  if (txt.strokeStyle) ctx.strokeStyle = txt.strokeStyle; //"red";
  if (txt.textAlign) ctx.textAlign = txt.textAlign; // "center"
  ctx.scale(1,-1);
  if (txt.fillText) ctx.fillText(txt.fillText, txt.x, -txt.y);
  if (txt.strokeText) ctx.fillText(txt.strokeText, txt.x, -txt.y);
  ctx.scale(1,-1);
}

let draw_thing = function(thing, ctx, toggleable, togname) {
  try {
    if (typeof(thing) == "object") {
      if (thing.draw_toggle) {
        let current = Boolean(thing._draw_toggle_off_);
        thing._draw_toggle_off_ = (thing.draw_toggle == togname) ? !current : current;
        let cls = (thing._draw_toggle_off_) ? 'btn-light' : 'btn-dark';
        let but = `<button class="btn btn-sm ${cls} form-control mt-1">${thing.draw_toggle}</button>`;
        toggleable.insertAdjacentHTML('beforeend',but)
      }
      if (thing._draw_toggle_off_) return;
      if (thing.hasOwnProperty('draw_type')) {
        if (thing.draw_type == 'polygon') {
          draw_polygon(thing,ctx);
        } else if (thing.draw_type == 'none') {
        } else if (thing.draw_type == 'arc') {
          draw_arc(thing,ctx);
        } else if (thing.draw_type == 'circle') {
          draw_circle(thing,ctx);
        } else if (thing.draw_type == 'text') {
          draw_text(thing,ctx);
        } else if (thing.draw_type == 'image') {
          draw_image(thing,ctx);
        } else if (ctx.RenderFuncs && ctx.RenderFuncs.hasOwnProperty(thing.draw_type)) {
          ctx.RenderFuncs[thing.draw_type](thing,ctx);
        }
      } else {
        for (const [key, val] of Object.entries(thing)) {
          if (Array.isArray(val)) {
            val.forEach(v => draw_thing(v, ctx, toggleable, togname));
          } else {
            draw_thing(val, ctx, toggleable, togname);
          }
        }  
      }
    }
  } catch(err) {
    console.error(err);
  }
}

let draw = function(ctx, data, togname) {
  ctx.save();
  ctx.clear_all();
  ctx.scale(1,-1);
  ctx.draw_grid();
  ctx.draw_mouse();
  let toggleable = ctx.canvas.parentElement.querySelector('div.toggleable');
  while (toggleable.firstChild) toggleable.removeChild(toggleable.lastChild);
  draw_thing(data, ctx, toggleable, togname);
  ctx.restore();
}

export function center_map(ctx, xc, yc) { // x, y, map coordinates of center and desired width/height
  let t = ctx.get_transform();
  let w = ctx.canvas.width;
  let h = ctx.canvas.height;
  t.e = w/2 - xc*t.a;
  t.f = yc*t.a + h/2;
  ctx.set_transform(t);
}

export function center_map_with_dimensions(ctx, xc, yc, width,height) { // x, y, map coordinates of center and desired width/height
  let t = ctx.get_transform();
  let w = ctx.canvas.width;
  let h = ctx.canvas.height;
  let scl = Math.min(h/height, w/width);
  t.a = scl;
  t.d = scl;
  t.e = w/2 - xc*scl;
  t.f = yc*scl + h/2;
  ctx.set_transform(t);
}

export function setup_generic_map(contentdiv, DATA, RenderFuncs) {
  let CANVAS = document.createElement('canvas');
  let CTX = null;
  contentdiv.appendChild(CANVAS);
  contentdiv.insertAdjacentHTML('beforeend',`
  <div class="toggleable form-group" style="position: absolute; bottom:30px; right:10px; width:200px">
  </div>`);
  let TOGGLEABLE = contentdiv.querySelector('div.toggleable');

  const resize = function() {
    let transform = null;
    if (CTX) {
      transform = CTX.get_transform();
    }
    CTX = initialize_map(CANVAS);
    if (RenderFuncs) CTX.RenderFuncs = RenderFuncs;
    CANVAS.width = contentdiv.offsetWidth;
    CANVAS.height = contentdiv.offsetHeight;
    // console.log('w','h',CANVAS.width, CANVAS.height)
    CTX.SCREEN.lastX=CANVAS.width/2, CTX.SCREEN.lastY=CANVAS.height/2;
    if (transform) CTX.set_transform(transform);
    draw(CTX, DATA, null);
  }
  resize();
  window.onresize = resize;
  TOGGLEABLE.addEventListener('click',(e) => {
    let tog = e.target.closest('button');
    if (tog && tog.innerText) draw(CTX, DATA, tog.innerText);
  })
  CANVAS.addEventListener('mousedown',(e) => { 
    if (DATA.disable_map_events) return;
    CTX.handleMouseDown(e) 
  }, false);
  CANVAS.addEventListener('mousemove',(e) => { 
    if (DATA.disable_map_events) return;
    if (CTX.handleMouseMove(e)) {
      draw(CTX,DATA, null);
    } else {
      CTX.draw_mouse();
    }
  }, false);
  CANVAS.addEventListener('mouseup',(e) => { 
    // if (DATA.disable_map_events) return;
    CTX.handleMouseUp(e) 
  }, false);
  CANVAS.addEventListener('DOMMouseScroll',(e) => { 
    if (DATA.disable_map_events) return;
    CTX.handleScroll(e); draw(CTX,DATA, null);    
  }, false);
  CANVAS.addEventListener('mousewheel',(e) => { 
    if (DATA.disable_map_events) return;
    CTX.handleScroll(e); draw(CTX,DATA, null);        
  }, false);
  return {
    draw:() => { draw(CTX, DATA, null) },
    resize:() => { resize() },
    eventToPosition:(e) => { 
      let P = CTX.eventToPosition(e);
      P.y = -P.y; // because of the -1 scale applied above
      return P;
    },
    positionToScreen:(x,y) => {
      return CTX.positionToScreen(x,-y);
    },
    CANVAS:CANVAS,
    CTX:CTX
  };
}

