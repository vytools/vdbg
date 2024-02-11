import json
from pathlib import Path
print('done')
Path('./test.json').write_text(json.dumps({}))
print('done')
Path('./test.json').write_text(json.dumps({
  "problems":[
    {
      "name": "Just an example",
      "inputs": {
        "roots": [1,2],
        "x0": -1,
        "x1": 1.5,
        "tol": 0.001,
        "max_iterations":10
      },
      "outputs": {
        "success": {"points_possible":1, "expected":True},
        "root": {"points_possible":4,"tolerance":0.00001, "expected":0.99951171875}
      }
    }
  ]
}))
print('done')
Path('./test.json').write_text(json.dumps({}))
print('done')
