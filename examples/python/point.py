import math

''' <vdbg_js


vdbg_js> '''

class Point:
  def __init__(self):
    self.x = 0
    self.y = 0
    self.radius = 0
    self.count = 0

  def step(self):
    self.count += 1
    self.radius = 20+self.count
    self.x = 10*self.radius * math.sin(self.count/10); 
    self.y = 10*self.radius * math.cos(self.count/10);  

p = Point()
def point(count):
  p.step()
  # <vdbg_bp {"name":"bkpntA","topic":"topicA","variables":{"count2":"count*2","p":"p"}} vdbg_bp>
  return {"x":p.x, "y":p.y, "radius":p.radius}
