#include <vector>
#include <cmath>
#include <string>
#include <tuple>
#include <unordered_map>
#include "bisection.cpp"
double line(double x) { return x; }
double sq(double x) { return x*x-4; }
double sig(double x) { return 1/(1+std::exp(-(x-0.4)*12))-0.04; }
double powr(double x) { return std::pow(x+1.2,8) - 1; }

/*<vdbg_js 
export function load(OVERLOADS) {
  OVERLOADS.PARSERS.fullfunc = function(data) {
      OVERLOADS.DRAWDATA.plot = {draw_type:'polygon', strokeStyle:'green', lineWidth:4,
        points:data.variables.xy, scaleSizeToScreen:true, draw_toggle:'plot'};
      OVERLOADS.MAPFUNCS.draw();
  }
}
vdbg_js>*/

struct XY {
    double x;
    double y;
};

struct XY1 {
    double x;
    double y;
    std::vector<int> z = {0,1,2};
};

struct XY2 {
  std::vector<XY1> z;
};

struct XY3 {
  XY2 w;
  double xx;
};

void some_stuff() {
  std::unordered_map<std::string, XY1> k;
  k["hi"] = {1.1, 2.2};
  k["bye"] = {3.3, 4.4};
  std::tuple<std::unordered_map<std::string, XY1>,int> h = {k, 42};
  std::vector<std::tuple<std::unordered_map<std::string, XY1>,int>> j;
  j.push_back(h);
  j.push_back(h);
 
  // <vdbg_bp {"name":"test","topic":"test","variables":{"j":"j"}} vdbg_bp>
  std::string x = "hey der bub";

  // <vdbg_bp {"name":"junk","topic":"xx","variables":{"x":"x"}} vdbg_bp>
  x += "-";
}

int main() {
  some_stuff();
  std::vector<XY> xy;
  for (int ii = 0; ii < 1000; ii++) {
    double x  = ii*0.01 - 5;
    xy.push_back({x,sig(x)});
  }
  // <vdbg_bp {"name":"function","topic":"fullfunc","variables":{"xy":"xy"}} vdbg_bp>
  for (int ii = 0; ii < 8; ii++) {
    double xrr;
    bool s = bisection(-1, 1, 0.0001, ii+1, sig, xrr);
    // <vdbg_bp {"name":"sample","topic":"sample","variables":{"x":"xrr","y":"sig(xrr)"}} vdbg_bp>
    if (s) break;
  }
  return 0;
}