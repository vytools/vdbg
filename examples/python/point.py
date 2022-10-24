import math
def point(count):
  x = (20+count) * math.sin(count/10); 
  y = (20+count) * math.cos(count/10);  
  # <vydbg {"name":"bkpntA","topic":"topicA","variables":{"count2":"count*2","x":"x","y":"y"}} vydbg>
  return {"x":x, "y":y}
