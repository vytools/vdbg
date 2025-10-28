# Example Markdown
Here is a meaningless equation    
$$
\vec{c} = \frac{\vec{a}}{b}
$$


And here's some code

```python
def lagrng(t, w, t_desired):
    summ = 0
    n = length of w
    for i = (0,1,...,n-1)
        product = w[i]
        for j = (0,1,...,n-1)
            if i != j:
                product *= (t_desired-t[j])/(t[i]-t[j])
        summ += product    
    return summ
```
