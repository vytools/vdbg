import math

class Point:
  def __init__(self):
    self.x = 0
    self.y = 0
    self.radius = 0
    self.count = 0

  def step(self):
    self.count += 1
    self.radius = 20+self.count
    self.x = self.radius * math.sin(self.count/10); 
    self.y = self.radius * math.cos(self.count/10);  

p = Point()
def point(count):
  p.step()
  # <vydbg {"name":"bkpntA","topic":"topicA","variables":{"count2":"count*2","p":"p"}} vydbg>
  return {"x":p.x, "y":p.y}
