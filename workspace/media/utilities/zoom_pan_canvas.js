// Adds ctx.get_transform() - returns an SVGMatrix
//      ctx.set_transform(x) - sets an SVGMatrix
//      ctx.transformedPoint(x,y) - takes screen point, returns map point
//      ctx.handleMouseDown(event)
//      ctx.handleMouseMove(event)
//      ctx.handleMouseUp(event)
//      ctx.handleScroll(event)
//      ctx.SCREEN = some internal details

// DRAWDATA.transform = CTX.get_transform();
// draw(CANVAS, CTX, DRAWDATA, SCREEN);
// CANVAS.addEventListener('mousedown',(e) => { CTX.handleMouseDown(e) }, false);
// CANVAS.addEventListener('mousemove',(e) => { CTX.handleMouseMove(e) }, false);
// CANVAS.addEventListener('mouseup',(e) => { CTX.handleMouseUp(e) }, false);
// CANVAS.addEventListener('DOMMouseScroll',(e) => { CTX.handleScroll(e) }, false);
// CANVAS.addEventListener('mousewheel',(e) => { CTX.handleScroll(e) }, false);

const trackTransforms = function(ctx) {
  var svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
  var xform = svg.createSVGMatrix();
  ctx.get_transform = function(){ 
    return {a:xform.a,b:xform.b,c:xform.c,d:xform.d,d:xform.d,e:xform.e,f:xform.f};
  };
  ctx.set_transform = function(x) {
    if (x) ctx.setTransform(x.a, x.b, x.c, x.d, x.e, x.f);
  }

  var savedTransforms = [];
  var save = ctx.save;
  ctx.save = function(){
    savedTransforms.push(xform.translate(0,0));
    return save.call(ctx);
  };
  var restore = ctx.restore;
  ctx.restore = function(){
    xform = savedTransforms.pop();
    return restore.call(ctx);
  };

  var scale = ctx.scale;
  ctx.scale = function(sx,sy){
    xform = xform.scaleNonUniform(sx,sy);
    return scale.call(ctx,sx,sy);
  };
  var rotate = ctx.rotate;
  ctx.rotate = function(radians){
    xform = xform.rotate(radians*180/Math.PI);
    return rotate.call(ctx,radians);
  };
  var translate = ctx.translate;
  ctx.translate = function(dx,dy){
    xform = xform.translate(dx,dy);
    return translate.call(ctx,dx,dy);
  };
  var transform = ctx.transform;
  ctx.transform = function(a,b,c,d,e,f){
    var m2 = svg.createSVGMatrix();
    m2.a=a; m2.b=b; m2.c=c; m2.d=d; m2.e=e; m2.f=f;
    xform = xform.multiply(m2);
    return transform.call(ctx,a,b,c,d,e,f);
  };
  var setTransform = ctx.setTransform;
  ctx.setTransform = function(a,b,c,d,e,f){
    xform.a = a;
    xform.b = b;
    xform.c = c;
    xform.d = d;
    xform.e = e;
    xform.f = f;
    return setTransform.call(ctx,a,b,c,d,e,f);
  };
  var pt  = svg.createSVGPoint();
  ctx.transformedPoint = function(x,y){
    pt.x=x; pt.y=y;
    let ptt = pt.matrixTransform(xform.inverse());
    return {x:ptt.x, y:ptt.y};
  }
}

export function initialize_map(CANVAS) {
  let CTX = CANVAS.getContext('2d');
  
  CTX.SCREEN = {lastX:0, lastY:0, dragged:false, dragStart:null, mouseLoc:'', lastMapPoint:{x:0, y:0} };

  trackTransforms(CTX);

  const xyfromevent_ = function(evt, ctx) {
    let sx = evt.offsetX || (evt.pageX - ctx.canvas.offsetLeft);
    let sy = evt.offsetY || (evt.pageY - ctx.canvas.offsetTop);
    let p = ctx.transformedPoint(sx, sy);
    p.screenx = sx;
    p.screeny = sy;
    return p;
  }

  const xyfromevent = function(evt, ctx) {
    let p = xyfromevent_(evt, ctx);
    ctx.SCREEN.lastX = p.screenx;
    ctx.SCREEN.lastY = p.screeny;
    ctx.SCREEN.lastMapPoint = p;
  }
  
  const zoom = function(clicks, ctx) {
    let scaleFactor = 1.1;
    let pt = ctx.transformedPoint(ctx.SCREEN.lastX, ctx.SCREEN.lastY);
    ctx.translate(pt.x,pt.y);
    let factor = Math.pow(scaleFactor,clicks);
    ctx.scale(factor,factor);
    ctx.translate(-pt.x,-pt.y);
  }

  const p_to_screen = function(x,y,t) {
    return {x:x*t.a+t.e,y:y*t.d+t.f};
  }

  const setFont = function(ctx) {
    try {
      ctx.font = "12px Arial";
      ctx.fillStyle = 'gray';
      ctx.strokeStyle = 'lightgray';
    } catch(err) {}
  }

  const fillText = function(ctx,txt,x,y) {
    try {
      ctx.fillText(txt,x,y);
    } catch(err) { }
  }

  CTX.draw_mouse = function() {
    this.save();
    this.setTransform(1, 0, 0, 1, 0, 0);
    let w = this.canvas.width, h = this.canvas.height;
    this.clearRect(0, h-20, w, 20);
    setFont(this);
    this.textAlign = 'right';
    fillText(this, this.SCREEN.mouseLoc, w-10, h-10);
    this.restore();
  }

  const stringifie = function(num,pwr) {
    let s = ''+num;
    return (s.length > (Math.max(0,-pwr)+3)) ? num.toFixed(Math.max(0,1-pwr)) : s;
  }

  CTX.draw_grid = function() {
    let w = this.canvas.width, h = this.canvas.height;
    let a = this.transformedPoint(0,h); // bottom left
    let b = this.transformedPoint(w,0); // top right
    let t = this.get_transform();
    let dx = Math.abs(b.x-a.x);
    if (dx == 0) {
      console.log('too much zoom!')
      return;
    }
    let n = w/40;             // want roughly this many intervals
    let pwr = Math.floor(Math.log10(dx/n));
    let delta10 = Math.pow(10,pwr+1);  // nearest base 10
    let px = w/(dx/delta10); // number of pixels at this delta10
    let nsmall = (px > 500) ? 10 : (px > 200) ? 4 : (px > 100) ? 2 : 1;
    let delta = delta10/nsmall; // adjust delta
    let sgnx = (b.x > a.x) ? 1 : -1;
    let sgny = (b.y > a.y) ? 1 : -1;
    let x0 = parseInt(a.x/delta-sgnx)*delta;
    let y0 = parseInt(a.y/delta-sgny)*delta;
    let nx = parseInt((b.x-a.x)/delta*sgnx)+2;
    let ny = parseInt((b.y-a.y)/delta*sgny)+2;
    this.save();
    this.setTransform(1, 0, 0, 1, 0, 0);
    this.lineWidth = 1;
    setFont(this);
    for (var ii = 0; ii < ny+1; ii++) {
      let y  = y0 + ii*sgny*delta;
      let xy_ = p_to_screen(0,y,t);
      this.beginPath();
      this.moveTo(0, xy_.y);
      this.lineTo(w, xy_.y);
      this.stroke();
      fillText(this, stringifie(y,pwr), 5, xy_.y);
    }
    for (var ii = 0; ii < nx+1; ii++) {
      let jj = 0;
      let x  = x0 + ii*sgnx*delta;
      let xy_ = p_to_screen(x,0,t);
      this.beginPath();
      this.moveTo(xy_.x, 0);
      this.lineTo(xy_.x, h);
      this.stroke();
      if (jj==0) fillText(this, stringifie(x,pwr), xy_.x, 10); 
    }
    this.restore();
  }

  CTX.clear_all = function() {
    this.save();
    this.setTransform(1, 0, 0, 1, 0, 0);
    this.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.restore();
  }

  CTX.handleScroll = function(evt) {
    let delta = evt.wheelDelta ? evt.wheelDelta/40 : evt.detail ? -evt.detail : 0;
    if (delta) zoom(delta, this);
    return evt.preventDefault() && false;
  };

  CTX.handleMouseDown = function(evt) {
    if (evt.buttons == 1) {
      document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
      xyfromevent(evt, this);
      this.SCREEN.dragStart = CTX.transformedPoint(this.SCREEN.lastX, this.SCREEN.lastY);
      this.SCREEN.dragged = false;
    }
    return false;
  }

  CTX.handleMouseMove = function(evt) {
    xyfromevent(evt, this);
    this.SCREEN.mouseLoc = `x = ${this.SCREEN.lastMapPoint.x.toPrecision(3)} y =${this.SCREEN.lastMapPoint.y.toPrecision(3)}`;
    if (evt.buttons == 1) {
      this.SCREEN.dragged = true;
      if (this.SCREEN.dragStart){
        let pt = this.transformedPoint(this.SCREEN.lastX, this.SCREEN.lastY);
        this.translate(pt.x-this.SCREEN.dragStart.x, pt.y-this.SCREEN.dragStart.y);
        return true;
      }
    } else {
      this.SCREEN.dragStart = null;
    }
    return false;
  }

  CTX.handleMouseUp = function(evt) {
    this.SCREEN.dragStart = null;
  }

  CTX.positionToScreen = function(x,y) {
    return p_to_screen(x,y,this.get_transform());
  }

  CTX.eventToPosition = function(evt) {
    return xyfromevent_(evt,CTX);
  }
  
  return CTX;

}