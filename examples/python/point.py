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
    self.x = 10*self.radius * math.sin(self.count/10); 
    self.y = 10*self.radius * math.cos(self.count/10);  

  def __repr__(self):
    return str(vars(self))

p = Point()
def point(count):
  p.step()
  return p;
