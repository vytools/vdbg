import time, math
import point
count = 0
while True:
  time.sleep(0.1)
  count += 1
  xy = point.point(count)
  print('Count = {}'.format(count))
