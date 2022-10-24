import time, point
count = 0
while True:
  time.sleep(0.1)
  count += 1
  xy = point.point(count)
  # <vdbg {"name":"bkpntB","topic":"topicB","variables":{"xy":"xy","count3":"count*3"}} vdbg>
  print('Count = {}'.format(count))
