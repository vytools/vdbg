import time, point

count = 0

while True:
  time.sleep(0.1)
  count += 1
  xy = point.point(count)
  # <vdbg_bp {"name":"bkpntB","topic":"topicB","variables":{"x":"xy.x", "y":"xy.y", "radius":"xy.radius","count3":"count*3"}} vdbg_bp>
  print('Count = {}'.format(count))
