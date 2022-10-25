#include <vector>
#include <cmath>
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

bool bisection(double x0, double x1, double tol, int maxit, double f (double), double &x2) {
  double f0 = f(x0);
  for (int ii = 0; ii < maxit; ii++) {
    x2 = (x0+x1)/2.0;
    double f2 = f(x2);
    if (std::fabs(f2) < tol) {
      return true;
    }
    if (f2*f0 > 0) {
      x0 = x2;
    } else {
      x1 = x2;
    }
  }
  return false;
}

int main() {
  XY3 a;
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