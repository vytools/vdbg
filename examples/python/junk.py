import time, math
import point
count = 0
while True:
  time.sleep(0.1)
  count += 1

  
  xy = point.point(count)
  # <vydbg {"name":"bkpntB","topic":"topicB","variables":{"count3":"count*3"}} vydbg>
  print('Count = {}'.format(count))
