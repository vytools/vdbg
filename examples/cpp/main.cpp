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

struct XY {
    double x;
    double y;
};

struct XY1 {
    double x;
    double y;
    bool h = false;
    std::vector<int8_t> z = {};
    XY1(double x_, double y_) {
      x = x_;
      y = y_;
      z.clear();
      for (int ii=0; ii<256; ii++) {
        z.push_back(static_cast<int8_t>(ii));
      }
    }
};

struct XY2 {
  std::vector<XY1> z = {};
};

struct XY3 {
  XY2 w;
  double xx;
};

void some_stuff() {
  std::unordered_map<std::string, XY1> k;
  XY1 zz(3.3, 4.4);
  k.insert({"hi",XY1(1.0,2.0)});
  k.insert({"bye",XY1(3.3,4.4)});
  std::tuple<std::unordered_map<std::string, XY1>,int> h = {k, 42};
  std::vector<std::tuple<std::unordered_map<std::string, XY1>,int>> j;
  j.push_back(h);
  j.push_back(h);
  uint8_t x1 = 98;
  bool x2 = true;
  // <vdbg_bp {"name":"test","topic":"test","variables":{"j":"j","x1":"x1","x2":"x2"}} vdbg_bp>
  std::string x = "hey der bub";

  // <vdbg_bp {"name":"junk","topic":"xx","variables":{"x":"x"}} vdbg_bp>
  x += "-";
}

int main() {
  double xval=0, yval=0;
  some_stuff();
  std::vector<XY> xy;
  for (int ii = 0; ii < 1000; ii++) {
    double x  = ii*0.01 - 5;
    xy.push_back({x,sig(x)});
  }
  // <vdbg_bp {"name":"function","topic":"fullfunc","variables":{"xy":"xy"}} vdbg_bp>
  for (int ii = 0; ii < 12; ii++) {
    double xrr;
    bool s = bisection(-1, 1, 0.0001, ii+1, sig, xrr);
    // <vdbg_bp {"name":"sample","topic":"sample","variables":{"x":"xrr","y":"sig(xrr)"}} vdbg_bp>
    if (s) break;
  }
  return 0;
}