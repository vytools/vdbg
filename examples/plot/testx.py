import json, math
from pathlib import Path

Path('./plot.json').write_text(json.dumps({}))

a = 5
d0cosx_at_a =  math.cos(a)
d1cosx_at_a = -math.sin(a)
d2cosx_at_a = -math.cos(a)
d3cosx_at_a =  math.sin(a)

def cos(x):
  y  = d0cosx_at_a*(x-a)**0/math.factorial(0)
  y += d1cosx_at_a*(x-a)**1/math.factorial(1)
  y += d2cosx_at_a*(x-a)**2/math.factorial(2)
  y += d3cosx_at_a*(x-a)**3/math.factorial(3)
  y += d0cosx_at_a*(x-a)**4/math.factorial(4)
  y += d1cosx_at_a*(x-a)**5/math.factorial(5)
  return y

if __name__ == '__main__':
  xmin = -9
  xmax =  9
  n = 200
  x = []; yapprox = []; yact = []
  for ii in range(n):
    xi = xmin + ii/(n-1)*(xmax-xmin)
    x.append(xi)
    yapprox.append(cos(xi))
    yact.append(math.cos(xi))

  Path('./plot.json').write_text(json.dumps({
    "plots":[
      {
        "config":{"responsive":True},
        "layout":{
            "legend":{"x":0.5,"y":1,"xanchor":"center","yanchor":"bottom"},
            "yaxis": {"range": [-3, 3], "title":{"text":"y"}},
            "xaxis": {"title":{"text":"x"}}
        },
        "data":[{
          "x": x,
          "y": yact,
          "mode": 'lines+markers',
          "type": 'scatter',
          "name": 'cos(x)',
          "marker": { "size": 4 }
        },{
          "x": x,
          "y": yapprox,
          "mode": 'lines+markers',
          "type": 'scatter',
          "name": 'Taylor Series Approximation of cos(x)',
          "marker": { "size": 4 }
        }]
      }
    ]
  },indent=2))

print('done')
