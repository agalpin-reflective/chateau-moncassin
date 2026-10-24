// Verre de vin vu du dessus : robe rubis, frange plus claire, reflet de fenêtre et bord du verre.
// La même formule est reproduite en Python dans tools/render-poster.py pour l'image fixe de repli.
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSwirl;
uniform float uAngle;
uniform vec2 uPointer;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  float s = min(uRes.x, uRes.y);
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / (0.5 * s) / 0.84;
  float r = length(p);
  float aa = 2.5 / (0.42 * s);

  // Tourbillon : rotation d'ensemble et vortex plus fort au centre.
  float a = uAngle + uSwirl * 2.4 * (1.0 - r) * (1.0 - r);
  float ca = cos(a);
  float sa = sin(a);
  vec2 q = vec2(ca * p.x - sa * p.y, sa * p.x + ca * p.y);
  float t = uTime;

  vec2 w = vec2(fbm(q * 1.5 + vec2(0.0, t * 0.04)), fbm(q * 1.5 + vec2(5.2 - t * 0.03, 1.3)));
  float n = fbm(q * 2.1 + w * 1.9);
  float depth = smoothstep(0.0, 1.0, r);

  vec3 deep = vec3(0.075, 0.010, 0.024);
  vec3 mid = vec3(0.255, 0.030, 0.065);
  vec3 bright = vec3(0.520, 0.085, 0.150);
  vec3 frangeC = vec3(0.440, 0.085, 0.150);

  vec3 col = mix(deep, mid, clamp(n * 1.15 - 0.2 + depth * 0.25, 0.0, 1.0));
  float fine = fbm(q * 5.0 + w * 2.5 + vec2(t * 0.05, 0.0));
  float silk = smoothstep(0.45, 0.75, fine) * (0.3 + 0.7 * depth);
  float vein = smoothstep(0.52, 0.82, n) * (0.25 + 0.75 * depth);
  col = mix(col, bright, silk * 0.22 + vein * 0.25 + uSwirl * 0.08 * silk);
  col = mix(col, frangeC, smoothstep(0.88, 0.995, r) * 0.5);

  // Reflet en arc sur le ménisque, qui suit légèrement le pointeur.
  float th = atan(p.y, p.x);
  float target = 2.35 + uPointer.x * 0.35;
  float dth = abs(mod(th - target + 3.14159265, 6.2831853) - 3.14159265);
  col += vec3(1.0, 0.9, 0.86) * exp(-pow((r - 0.955) / 0.025, 2.0)) * exp(-pow(dth / 0.55, 2.0)) * 0.35;
  float dth2 = abs(mod(th - target, 6.2831853) - 3.14159265);
  col += vec3(0.9, 0.55, 0.6) * exp(-pow((r - 0.96) / 0.02, 2.0)) * exp(-pow(dth2 / 0.4, 2.0)) * 0.08;

  // Reflet de fenêtre à la surface.
  vec2 d = p - (vec2(-0.32, 0.34) + uPointer * 0.16);
  float d1 = (d.x - d.y) * 0.7071;
  float d2 = (d.x + d.y) * 0.7071;
  col += vec3(1.0, 0.86, 0.84) * exp(-(d1 * d1 / 0.06 + d2 * d2 / 0.008)) * (0.5 + 0.5 * n) * 0.12;

  col += (hash(gl_FragCoord.xy + fract(t) * 137.0) - 0.5) * 0.035;

  float inside = 1.0 - smoothstep(1.0 - aa, 1.0, r);
  float glass = exp(-pow((r - 1.03) / 0.005, 2.0)) * 0.30
    + exp(-pow((r - 1.05) / 0.004, 2.0)) * 0.10
    + exp(-pow((r - 1.04) / 0.02, 2.0)) * 0.04;
  float alpha = inside + glass * (1.0 - inside);
  vec3 premul = col * inside + vec3(0.93, 0.86, 0.78) * glass * (1.0 - inside);
  gl_FragColor = vec4(premul, alpha);
}
