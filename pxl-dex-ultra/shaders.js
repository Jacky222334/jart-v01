export const VERT = `#version 300 es
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

export const MAIN_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_buffer;
uniform sampler2D u_base;
uniform vec2 u_dims;
uniform float u_time;
uniform float u_density;
uniform vec4 u_rects[24];
uniform int u_modes[24];
in vec2 v_uv;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

bool inRect(vec2 uv, vec4 r) {
  vec2 a = r.xy / u_dims;
  vec2 b = (r.xy + r.zw) / u_dims;
  return uv.x >= a.x && uv.y >= a.y && uv.x < b.x && uv.y < b.y;
}

vec3 sampleBuf(vec2 uv) {
  return texture(u_buffer, uv).rgb;
}

vec3 sampleBase(vec2 uv) {
  return texture(u_base, uv).rgb;
}

void main() {
  vec2 uv = v_uv;
  vec3 rgb = sampleBuf(uv);
  vec2 px = vec2(1.0) / u_dims;
  vec2 cell = floor(uv * u_dims);

  for (int i = 0; i < 24; i++) {
    vec4 r = u_rects[i];
    if (r.z <= 0.0) continue;
    if (!inRect(uv, r)) continue;

    vec2 local = cell - r.xy;
    int mode = u_modes[i];

    if (mode == 0) {
      vec2 n = vec2(noise(uv * 22.0 + u_time * 1.4), noise(uv * 17.0 - u_time * 1.1)) - 0.5;
      rgb = sampleBuf(uv + n * px * 8.0);
    } else if (mode == 1) {
      float x = (noise(vec2(uv.y * 100.0, u_time * 3.0)) - 0.5) * 10.0 * px.x;
      float y = (noise(vec2(u_time * 2.2, uv.x * 60.0)) - 0.5) * 10.0 * px.y;
      rgb = sampleBuf(uv + vec2(x, y));
    } else if (mode == 2) {
      rgb = sampleBuf(uv + vec2((noise(vec2(uv.x * 3.0, u_time * 6.0)) - 0.5) * 12.0 * px.x,
                                (noise(vec2(u_time * 4.0, uv.y * 2.0)) - 0.5) * 12.0 * px.y));
    } else if (mode == 3) { rgb = sampleBuf(uv + vec2(px.x, 0.0));
    } else if (mode == 4) { rgb = sampleBuf(uv - vec2(px.x, 0.0));
    } else if (mode == 5) { rgb = sampleBuf(uv + vec2(0.0, px.y));
    } else if (mode == 6) { rgb = sampleBuf(uv - vec2(0.0, px.y));
    } else if (mode == 7) {
      float step = floor(mod(u_time * 32.0, 16.0));
      if (mod(local.y, 2.0) == 0.0 && step < 8.0) rgb = sampleBuf(uv + vec2(px.x * 2.0, 0.0));
      else if (mod(local.y, 2.0) == 1.0 && step >= 8.0) rgb = sampleBuf(uv - vec2(px.x * 2.0, 0.0));
    } else if (mode == 8) {
      float step = floor(mod(u_time * 80.0, 4.0));
      if (step == 0.0) {
        if (mod(local.x + local.y, 2.0) == 0.0) rgb = sampleBuf(uv + vec2(px.x, px.y));
        else rgb = sampleBuf(uv + vec2(-px.x, px.y));
      }
    } else if (mode == 9) {
      if (mod(local.x + local.y, 2.0) == 0.0) rgb = sampleBuf(uv + vec2(px.x, -px.y));
      else rgb = sampleBuf(uv + vec2(-px.x, px.y));
    } else if (mode == 10) {
      rgb = sampleBuf(uv + vec2(sin(local.y * 0.08 + u_time * 4.0) * px.x * 4.0, 0.0));
    } else if (mode == 11) {
      if (hash(uv + floor(u_time * 12.0)) < 0.12) rgb = sampleBase(uv);
    } else if (mode == 12) {
      if (mod(local.x, 12.0) == floor(mod(u_time * 60.0, 12.0))) rgb = sampleBase(uv);
    } else if (mode == 13) {
      if (mod(local.y, 12.0) == floor(mod(u_time * 60.0, 12.0))) rgb = sampleBase(uv);
    } else if (mode == 14) {
      float c = sin(u_time * 5.0 + uv.x * 40.0) * px.x * 4.0;
      rgb.r = sampleBuf(uv + vec2(c, 0.0)).r;
      rgb.g = sampleBuf(uv).g;
      rgb.b = sampleBuf(uv - vec2(c, 0.0)).b;
    } else if (mode == 15) {
      rgb = sampleBuf(uv + vec2(sin(u_time * 7.0 + float(i)) * px.x * 5.0,
                                cos(u_time * 6.0 + float(i) * 0.5) * px.y * 5.0));
    } else if (mode == 16) {
      vec2 c = uv - 0.5;
      float ang = u_time * 0.4 + float(i) * 0.2;
      mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
      rgb = sampleBuf(rot * c * 0.98 + 0.5);
    } else if (mode == 17) {
      float fall = mod(u_time * 40.0 + local.x * 0.3, r.w);
      if (abs(local.y - fall) < 2.0) rgb = sampleBase(uv + vec2(0.0, px.y * 3.0));
      else rgb = sampleBuf(uv + vec2(0.0, px.y));
    } else if (mode == 18) {
      if (mod(floor(u_time * 8.0), 2.0) == 0.0) rgb = vec3(1.0) - rgb;
    } else if (mode == 19) {
      vec2 block = floor(uv * u_dims / 8.0) * 8.0 / u_dims;
      rgb = sampleBuf(block + fract(uv * u_dims) / u_dims);
    }
  }

  float token = hash3(vec3(cell, floor(u_time * 3.0)));
  float sparse = step(token, 1.0 - u_density);
  rgb *= mix(0.08, 1.0, 1.0 - sparse * 0.85);

  outColor = vec4(clamp(rgb, 0.0, 1.0), 1.0);
}`;

export const POST_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_time;
uniform float u_zoom;
uniform float u_rot;
uniform float u_beat;
in vec2 v_uv;
out vec4 outColor;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.3, 289.1))) * 982451653.0);
}

vec2 xform(vec2 uv) {
  vec2 c = uv - 0.5;
  float ca = cos(u_rot), sa = sin(u_rot);
  c = vec2(c.x * ca - c.y * sa, c.x * sa + c.y * ca);
  c /= u_zoom;
  return c + 0.5;
}

vec3 neonBoost(vec3 c) {
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 n = c;
  n.r = pow(c.r, 0.75) * (1.0 + 0.35 * sin(u_time * 2.0 + l * 12.0));
  n.g = pow(c.g, 0.75) * (1.0 + 0.35 * sin(u_time * 2.3 + l * 10.0));
  n.b = pow(c.b, 0.75) * (1.0 + 0.35 * sin(u_time * 1.7 + l * 14.0));
  return n * (1.15 + l * 0.5 + u_beat * 0.2);
}

void main() {
  vec2 uv = xform(v_uv);
  vec2 px = vec2(1.0 / 1920.0, 1.0 / 1080.0);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.05, 1.0);
    return;
  }

  float ca = sin(u_time * 3.0) * 0.003;
  vec3 col;
  col.r = texture(u_tex, uv + vec2(ca, 0.0)).r;
  col.g = texture(u_tex, uv).g;
  col.b = texture(u_tex, uv - vec2(ca, 0.0)).b;

  vec2 block = floor(uv * vec2(48.0 + sin(u_time) * 8.0)) / vec2(48.0 + sin(u_time) * 8.0);
  float dither = hash(block + u_time * 0.01);
  col = mix(col, neonBoost(col), 0.85 + dither * 0.15);

  float vig = 0.5 + 0.5 * sqrt(4.0 * v_uv.y * (1.0 - v_uv.y));
  col *= vig;

  float scan = 0.92 + 0.08 * sin(v_uv.y * 800.0 + u_time * 10.0);
  col *= scan;

  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export const BLIT_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
in vec2 v_uv;
out vec4 outColor;
void main() { outColor = texture(u_tex, v_uv); }`;
