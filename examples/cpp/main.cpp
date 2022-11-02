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

struct XY1 {
    double x;
    double y;
};

struct XY2 {
  std::vector<XY1> z;
};

struct XY3 {
  XY2 w;
  double xx;
};

int main() {
  std::unordered_map<std::string, XY1> k;
  k["hi"] = {1.0,2.0};
  k["bye"] = {3.0,4.0};
  std::tuple<std::unordered_map<std::string, XY1>,int> h = {k,3};
  std::vector<std::tuple<std::unordered_map<std::string, XY1>,int>> j;
  j.push_back(h);
  j.push_back(h);
  // <vdbg_bp {"name":"test","topic":"test","variables":{"j":"j"}} vdbg_bp>
  XY3 a;
  std::string x = "hey der bub";
  // <vdbg_bp {"name":"sample","topic":"xx","variables":{"x":"x"}} vdbg_bp>
  for (int ii = 0; ii < 100; ii++) {
    double x  = ii*0.01 - 5;
    a.w.z.push_back({x,sig(x)});
  }
  // <vdbg_bp {"name":"sample","topic":"sample","variables":{"a":"a"}} vdbg_bp>
  for (int ii = 0; ii < 8; ii++) {
    double xrr;
    bool s = bisection(-1, 1, 0.0001, ii+1, sig, xrr);
    a.xx = xrr;
    a.w.z.push_back({xrr,sig(xrr)});
    // <vdbg_bp {"name":"sample","topic":"sample","variables":{"x":"xrr","y":"sig(xrr)","a":"a"}} vdbg_bp>
    if (s) break;
  }
  return 0;
}