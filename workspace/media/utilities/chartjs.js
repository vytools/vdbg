// chart.js should be loaded first e.g. this has been tested:
// import 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.2/Chart.bundle.min.js'

let CHART_INITIALIZED = {};

const chart_transform = function(xyA, xyB, chart, typ, cb) {
  if (!(xyA && xyB)) return;
  var scrollscale = 0.05;
  var ok = (typ !== 'zoom') || Math.abs(xyA.x-xyB.x) > 5 && Math.abs(xyA.y-xyB.y) > 5;
  if  (!ok) return;
  var chart_area = chart.chartArea;
  var xy = {x:'xAxes',y:'yAxes'};
  for (var jj in xy) {
    var top = (jj=='y') ? chart_area.top : chart_area.left;
    var bottom = (jj=='y') ? chart_area.bottom : chart_area.right;
    for (var ii = 0; ii < chart.options.scales[xy[jj]].length; ii++) {
      var ax = chart.options.scales[xy[jj]][ii];
      if (ax.type != 'linear') {
        console.log('Axis is not of type linear');
        continue;
      }
      var id = ax.id;
      if (!ax.ticks.hasOwnProperty('min')) {
        ax.ticks.min = chart.scales[id].min;
        ax.ticks.max = chart.scales[id].max;
      } 
      if (typ == 'reset') {
        delete ax.ticks.min;
        delete ax.ticks.max;
      } else if (typ == 'scrollup') {
        var d = ax.ticks.max - ax.ticks.min;
        ax.ticks.max += scrollscale*d;
        ax.ticks.min -= scrollscale*d;
      } else if (typ == 'scrolldown') {
        var d = ax.ticks.max - ax.ticks.min;
        ax.ticks.max -= scrollscale*d;
        ax.ticks.min += scrollscale*d;
      } else if (['pan','zoom'].indexOf(typ) > -1) {
        var mult = Math.abs(chart.scales[id].max - chart.scales[id].min);
        var a = Math.abs((xyA[jj] - top) / (bottom - top));
        var b = Math.abs((xyB[jj] - top) / (bottom - top));
        a = (((jj=='y') ? (1 - a) : a) * mult) + chart.scales[id].min;
        b = (((jj=='y') ? (1 - b) : b) * mult) + chart.scales[id].min;
        ax.ticks.min = (typ == 'pan') ? ax.ticks.min + b - a : Math.min(a, b);
        ax.ticks.max = (typ == 'pan') ? ax.ticks.max + b - a : Math.max(a, b);
      }
    }
  }
  chart.update(0);
  if (cb) cb(chart);
  
}

const init = function(data, id, parentNode, cb) {
  let canvas = parentNode.querySelector('canvas#'+id);
  if (canvas) {
    canvas.parentNode.removeChild(canvas);
  } 

  let canvas_element = document.createElement('canvas');
  canvas_element.id = id;
  canvas = parentNode.appendChild(canvas_element);  
  canvas.setAttribute('data-drag','false');
  let chart = null;
  chart = new Chart(canvas, data);
  let chart_start_click = null;
  let rect = {};

  canvas.addEventListener('wheel', function(evt) {
    if (evt.shiftKey) {
      var action = (evt.deltaY>0) ? 'scrollup' : 'scrolldown';
      chart_transform(true, true, chart, action, cb);
    }
  });

  canvas.addEventListener('mouseup', function(evt) {
    if (this.dataset.drag === "true") {
      chart_transform({x:evt.offsetX, y:evt.offsetY}, chart_start_click, chart, 'zoom', cb);
      chart.update(0);
    }
    this.dataset.drag = "false";
    chart_start_click = null;
  });

  canvas.addEventListener('mousemove', function(evt) {
    let x = evt.offsetX, y = evt.offsetY;
    //let x = evt.this.offsetX, y = evt.this.offsetY;
    if (this.dataset.drag === "true") {
      rect.w = x - rect.startX;
      rect.h = y - rect.startY ;
      chart.update(0);
      chart.ctx.fillStyle = "rgba(60, 60, 60, 0.4)";
      chart.ctx.fillRect(rect.startX, rect.startY, rect.w, rect.h);
    } else if (chart_start_click) {
      var dx = x - chart_start_click.x;
      var dy = y - chart_start_click.y;
      chart_transform({x:x, y:y}, chart_start_click, chart, 'pan', cb);
      chart_start_click.x = x;
      chart_start_click.y = y;
    }
  });
  
  canvas.addEventListener('mousedown', function(evt) {
    chart_start_click = {x:evt.offsetX, y:evt.offsetY};
    if (evt.shiftKey) {
      rect.startX = evt.offsetX;
      rect.startY = evt.offsetY;
      this.dataset.drag = "true";
    }
  });
  
  canvas.addEventListener('dblclick', function(evt) {
    chart_transform(true, true, chart, 'reset', cb);
  })

  return chart;
}

const try_init = function(data, id, parentNode, resolve, reject, cb) {
  try {  
    resolve(init(data, id, parentNode, cb));  
  } catch(err) {
    reject(err);
  }
}

export function dynamic_chart(data, id, parentNode, cb) {

  return new Promise((resolve, reject) => {
    if (!CHART_INITIALIZED.hasOwnProperty(id)) {
      CHART_INITIALIZED[id] = true;
      setTimeout(() => try_init(data, id, parentNode, resolve, reject, cb),1000); // Get errors otherwise :(
    } else {
      try_init(data, id, parentNode, resolve, reject, cb);
    }  
  });

}      