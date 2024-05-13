import time, point

xy = point.point(2)
# tuple won't work, to str(j) and then json5
# j = ["a",1,{"b":[0,1,2],"c":{"a":1,"d":(1,2),"e":[i for i in range(30)]}},xy]
j = ["a",1,{"b":[0,1,2],"c":{"a":1,"d":[1,2],"e":[i for i in range(30)]}},xy]
# <vdbg_bp {"name":"x","variables":{"j":"str(j)"},"json5":["j"],"topic":"print"} vdbg_bp>
count = 0
while True:
  time.sleep(0.1)
  count += 1
  xy = point.point(count)
  # <vdbg_bp {"name":"bkpntB","topic":"topicB","variables":{"xy":"str(xy)"},"json5":["xy"]} vdbg_bp>
  print('Count = {}'.format(count))
