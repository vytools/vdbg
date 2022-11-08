import time, point

count = 0

'''<vdbg_js 
export function load(OVERLOADS) {
  OVERLOADS.PARSERS.topicB = function(data) {
    OVERLOADS.DRAWDATA.plot = {draw_type:'polygon', strokeStyle:'green', lineWidth:4,
      points:data.variables.xy, scaleSizeToScreen:true, draw_toggle:'plot'};
    OVERLOADS.MAPFUNCS.draw();
  }
}
vdbg_js>'''

while True:
  time.sleep(0.1)
  count += 1
  xy = point.point(count)
  # <vdbg_bp {"name":"bkpntB","topic":"topicB","variables":{"xy":"xy","count3":"count*3"}} vdbg_bp>
  print('Count = {}'.format(count))
