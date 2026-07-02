export const vert = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

export const frag = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uRes;
uniform sampler2D uPhoto;

in vec2 vUv;
out vec4 outColor;

#define PI 3.14159265359
#define TAU 6.28318530718

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.05;
    a *= 0.5;
  }
  return v;
}

vec2 domainWarp(vec2 p, float t) {
  vec2 q = vec2(
    fbm(p + vec2(0.0, 0.0) + t * 0.07),
    fbm(p + vec2(5.2, 1.3) - t * 0.05)
  );
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.04),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.06)
  );
  return p + 2.0 * r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdPolygon(vec2 p, vec2 v[7], int n) {
  float d = 1e9;
  int s = 0;
  for (int i = 0; i < 7; i++) {
    if (i >= n) break;
    int j = (i + 1) % n;
    vec2 a = v[i];
    vec2 b = v[j];
    d = min(d, sdSegment(p, a, b));
    vec2 e = b - a;
    bvec3 cond = bvec3(
      p.y >= a.y,
      p.y < b.y,
      e.x * (p.y - a.y) > e.y * (p.x - a.x)
    );
    if ((cond.x && cond.y && cond.z) || (!cond.x && !cond.y && !cond.z)) s++;
  }
  float sign = mod(float(s), 2.0) < 1.0 ? -1.0 : 1.0;
  return d * sign;
}

vec2 vertex(int i, float t) {
  vec2 base[7];
  base[0] = vec2(0.28, 0.36);
  base[1] = vec2(0.21, 0.54);
  base[2] = vec2(0.34, 0.73);
  base[3] = vec2(0.54, 0.79);
  base[4] = vec2(0.71, 0.66);
  base[5] = vec2(0.67, 0.41);
  base[6] = vec2(0.44, 0.31);

  float ph = float(i) * 1.37;
  vec2 breathe = vec2(
    sin(t * 0.41 + ph) * 0.018 + sin(t * 0.17 + ph * 2.1) * 0.012,
    cos(t * 0.33 + ph * 0.8) * 0.016 + cos(t * 0.21 + ph * 1.6) * 0.010
  );
  vec2 drift = vec2(
    fbm(vec2(ph, t * 0.08)) - 0.5,
    fbm(vec2(ph + 9.0, t * 0.06 + 2.0)) - 0.5
  ) * 0.028;

  return base[i] + breathe + drift;
}

vec3 neonPalette(float t, float n) {
  vec3 teal = vec3(0.18, 0.78, 0.92);
  vec3 mag = vec3(0.95, 0.08, 0.72);
  vec3 vio = vec3(0.45, 0.12, 1.0);
  vec3 lime = vec3(0.2, 1.0, 0.55);
  float w = 0.5 + 0.5 * sin(t * 0.9 + n * TAU);
  vec3 a = mix(teal, mag, 0.5 + 0.5 * sin(t * 0.35));
  vec3 b = mix(vio, lime, 0.5 + 0.5 * cos(t * 0.27 + n * 3.0));
  return mix(a, b, w);
}

void main() {
  vec2 uv = vUv;
  vec2 p = uv;
  float t = uTime;

  vec2 photoUv = uv;
  photoUv += vec2(sin(t * 0.06) * 0.004, cos(t * 0.05) * 0.003);
  float zoom = 1.0 + sin(t * 0.08) * 0.012;
  photoUv = (photoUv - 0.5) / zoom + 0.5;
  vec3 photo = texture(uPhoto, photoUv).rgb;

  float warm = smoothstep(0.0, 0.45, 1.0 - uv.y);
  warm *= 0.35 + 0.25 * sin(t * 0.7 + uv.x * 3.0);
  photo += vec3(0.18, 0.08, 0.0) * warm * 0.35;
  photo *= 0.88 + 0.08 * sin(t * 0.15);

  vec2 v[7];
  for (int i = 0; i < 7; i++) v[i] = vertex(i, t);
  float d = sdPolygon(p, v, 7);
  float edge = 1.0 - smoothstep(0.0, 0.0045, abs(d));
  float inside = smoothstep(0.006, -0.02, d);

  vec2 flowUv = domainWarp(p * 3.2 + vec2(t * 0.03, -t * 0.02), t);
  float flow = fbm(flowUv);
  float veins = fbm(flowUv * 2.4 + vec2(-t * 0.04, t * 0.05));
  veins = smoothstep(0.25, 0.85, veins);

  vec3 inner = neonPalette(t + flow * 2.0, flow);
  inner = mix(inner * 0.35, inner * 1.4, veins);
  inner += vec3(0.08, 0.35, 0.42) * (0.4 + 0.6 * flow);

  float pulse = 0.65 + 0.35 * sin(t * 1.1 + flow * 4.0);
  vec3 rim = neonPalette(t * 1.3 + d * 80.0, fract(flow + t * 0.1));
  rim *= edge * (1.2 + pulse * 0.8);

  vec3 chroma = vec3(
    neonPalette(t, 0.0).r,
    neonPalette(t, 0.33).g,
    neonPalette(t, 0.66).b
  ) * edge * 0.35;

  vec3 col = photo;
  col = mix(col, inner, inside * 0.92);
  col += rim * 1.35;
  col += chroma * (1.0 - inside) * edge;
  col += rim * inside * 0.25 * pulse;

  float glowField = exp(-max(d, 0.0) * 120.0);
  col += neonPalette(t * 0.8, glowField) * glowField * 0.45 * pulse;

  float vig = smoothstep(1.15, 0.25, length(uv - 0.5) * 1.1);
  col *= vig;

  float grain = (hash(uv * uRes + t) - 0.5) * 0.035;
  col += grain;

  col = pow(col, vec3(0.95));
  outColor = vec4(col, 1.0);
}`;
