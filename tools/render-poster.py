import numpy as np, sys
from PIL import Image
S = int(sys.argv[2]) if len(sys.argv) > 2 else 1200
def fract(x): return x - np.floor(x)
def hash2(px, py):
    px = fract(px*123.34); py = fract(py*456.21)
    d = px*(px+45.32) + py*(py+45.32)
    px = px + d; py = py + d
    return fract(px*py)
def smooth(e0, e1, x):
    t = np.clip((x-e0)/(e1-e0), 0, 1); return t*t*(3-2*t)
def noise(x, y):
    ix, iy = np.floor(x), np.floor(y); fx, fy = x-ix, y-iy
    ux, uy = fx*fx*(3-2*fx), fy*fy*(3-2*fy)
    a = hash2(ix, iy); b = hash2(ix+1, iy); c = hash2(ix, iy+1); d = hash2(ix+1, iy+1)
    return (a + (b-a)*ux) * (1-uy) + (c + (d-c)*ux) * uy
def fbm(x, y):
    v = 0; a = 0.5
    for _ in range(5):
        v = v + a*noise(x, y)
        # mat2(1.6,1.2,-1.2,1.6) column-major: m*p = (1.6x -1.2y, 1.2x + 1.6y)
        x, y = 1.6*x - 1.2*y, 1.2*x + 1.6*y
        a *= 0.5
    return v
t, ang, swirl = 14.0, 0.7, 0.45
ys, xs = np.mgrid[0:S, 0:S].astype(np.float64)
gx, gy = xs + 0.5, (S - ys) - 0.5
px = (gx - 0.5*S) / (0.5*S) / 0.84
py = (gy - 0.5*S) / (0.5*S) / 0.84
r = np.sqrt(px*px + py*py)
aa = 2.5 / (0.42*S)
a = ang + swirl*2.4*(1-r)*(1-r)
ca, sa = np.cos(a), np.sin(a)
qx, qy = ca*px - sa*py, sa*px + ca*py
wx = fbm(qx*1.5, qy*1.5 + t*0.04)
wy = fbm(qx*1.5 + 5.2 - t*0.03, qy*1.5 + 1.3)
n = fbm(qx*2.1 + wx*1.9, qy*2.1 + wy*1.9)
depth = smooth(0, 1, r)
deep = np.array([0.075, 0.010, 0.024]); mid = np.array([0.255, 0.030, 0.065])
bright = np.array([0.520, 0.085, 0.150]); fr = np.array([0.440, 0.085, 0.150])
k = np.clip(n*1.15 - 0.2 + depth*0.25, 0, 1)[..., None]
col = deep + (mid - deep)*k
fine = fbm(qx*5.0 + wx*2.5 + t*0.05, qy*5.0 + wy*2.5)
silk = smooth(0.45, 0.75, fine) * (0.3 + 0.7*depth)
vein = smooth(0.52, 0.82, n) * (0.25 + 0.75*depth)
col = col + (bright - col) * (silk*0.22 + vein*0.25 + swirl*0.08*silk)[..., None]
frange = smooth(0.88, 0.995, r)[..., None]
col = col + (fr - col) * frange*0.5
th = np.arctan2(py, px); target = 2.35
dth = np.abs(np.mod(th - target + np.pi, 2*np.pi) - np.pi)
arc = np.exp(-((r-0.955)/0.025)**2) * np.exp(-(dth/0.55)**2)
col = col + np.array([1.0, 0.9, 0.86]) * (arc*0.35)[..., None]
dth2 = np.abs(np.mod(th - target, 2*np.pi) - np.pi)
col = col + np.array([0.9, 0.55, 0.6]) * (np.exp(-((r-0.96)/0.02)**2)*np.exp(-(dth2/0.4)**2)*0.08)[..., None]
dx, dy = px + 0.32, py - 0.34
d1 = (dx - dy)*0.7071; d2 = (dx + dy)*0.7071
spec = np.exp(-(d1*d1/0.06 + d2*d2/0.008)) * (0.5 + 0.5*n)
col = col + np.array([1.0, 0.86, 0.84]) * (spec*0.12)[..., None]
inside = 1 - smooth(1 - aa, 1.0, r)
glass = np.exp(-((r - 1.03)/0.005)**2)*0.30 + np.exp(-((r - 1.05)/0.004)**2)*0.10 + np.exp(-((r - 1.04)/0.02)**2)*0.04
rng = np.random.default_rng(7)
col = col + ((rng.random((S, S)) - 0.5)*0.035)[..., None]
ring = np.array([0.93, 0.86, 0.78])
A = inside + glass*(1 - inside)
prem = col*inside[..., None] + ring*(glass*(1 - inside))[..., None]
rgb = np.where(A[..., None] > 1e-4, prem/np.maximum(A[..., None], 1e-4), 0)
out = np.dstack([np.clip(rgb, 0, 1), np.clip(A, 0, 1)])
Image.fromarray((out*255).round().astype(np.uint8), 'RGBA').save(sys.argv[1], 'WEBP', quality=86, method=6)
print('ok', S)
