#include <vector>
#include <cmath>

#ifndef BISECTION_CPP
#define BIESECTION_CPP

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

#endif