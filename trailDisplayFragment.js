export const trailDisplayFragmentShader = /*glsl*/`
precision highp float;

uniform sampler2D u_trail;
uniform sampler2D u_properties;
uniform float u_intensity;
uniform float u_gamma;
uniform float u_aberration;
uniform float u_time;
uniform vec2 u_resolution;
uniform float u_ratio;
uniform float u_mandalaRings;
uniform float u_mandalaPointsPerRing;
uniform float u_mandalaRadius;
uniform float u_mandalaRotationSpeed;
uniform float u_avoiderRadius;
uniform float u_toggleAvoiderDisplay;
uniform float u_redOrGreen;
uniform float u_bloom;

varying vec2 v_uv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float softStep(float edge, float width, float x) {
  return smoothstep(edge - width, edge + width, x);
}

vec3 sampleTrail(vec2 uv, float aberration) {
  float r = texture2D(u_trail, uv + vec2(aberration, aberration * 0.35)).r;
  float g = texture2D(u_trail, uv).r;
  float b = texture2D(u_trail, uv - vec2(aberration, aberration * 0.2)).r;
  return vec3(r, g, b) * u_intensity;
}

vec3 bloom(vec2 uv, float aberration) {
  vec2 px = 1.0 / u_resolution;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;

  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 off = vec2(float(x), float(y)) * px * 2.4;
      float w = 1.0 / (1.0 + float(x * x + y * y));
      acc += sampleTrail(uv + off, aberration) * w;
      wsum += w;
    }
  }

  return acc / wsum;
}

void main() {
  float aberration = u_aberration * (1000.0 / u_resolution.x);
  aberration *= 1.0 + 0.07 * sin(u_time * 0.35 + v_uv.y * 10.0);

  vec3 raw = sampleTrail(v_uv, aberration);
  raw = pow(max(raw, vec3(0.0)), vec3(1.0 / max(1e-6, u_gamma)));

  vec2 uvShift = v_uv;
  uvShift.x += 0.02;
  vec3 gSample = sampleTrail(uvShift, aberration);
  gSample = pow(max(gSample, vec3(0.0)), vec3(1.0 / max(1e-6, u_gamma)));

  vec3 color = raw;

  if (u_redOrGreen == 0.0) {
    color.g = softStep(0.28, 0.06, gSample.g);
  } else if (u_redOrGreen == 1.0) {
    color.r = softStep(0.08, 0.05, gSample.g);
  }

  color = vec3(color.r - color.g, color.g - color.r, color.b - color.g - color.r);
  color = softStep(0.008, 0.02, color);

  if (u_redOrGreen == 2.0) {
    color = softStep(0.85, 0.08, color);
    color = vec3(color.r + color.b, 0.0, 0.0);
  }

  float colorPicker = texture2D(u_properties, v_uv).b;
  float lum = color.r + color.g + color.b;
  float channel = softStep(0.008, 0.02, lum);

  if (colorPicker < 0.34) {
    color = vec3(channel, 0.0, 0.0);
  } else if (colorPicker < 0.67) {
    color = vec3(0.0, channel, 0.0);
  } else {
    color = vec3(0.0, 0.0, channel);
  }

  vec3 glow = bloom(v_uv, aberration * 1.35);
  glow = pow(max(glow, vec3(0.0)), vec3(1.3));
  color = max(color, glow * u_bloom * 0.5);

  vec2 centered = v_uv * 2.0 - 1.0;
  centered.x *= u_ratio;
  float vignette = 1.0 - dot(centered, centered) * 0.2;
  color *= clamp(vignette, 0.75, 1.0);

  color += (hash(v_uv * u_resolution + u_time) - 0.5) * 0.02;

  if (u_mandalaRings > 0.0) {
    vec2 pos = v_uv * 2.0 - 1.0;
    float base = min(u_resolution.x, u_resolution.y);
    float angleStep = 6.2831853 / u_mandalaPointsPerRing;
    float totalRotation = u_mandalaRotationSpeed;

    for (int i = 1; i <= 10; i++) {
      if (float(i) > u_mandalaRings) break;
      float ringRadius = float(i) * u_mandalaRadius;
      float ringRotation = totalRotation * (mod(float(i), 2.0) * 2.0 - 1.0);

      for (int j = 0; j < 20; j++) {
        if (float(j) >= u_mandalaPointsPerRing) break;
        float pointAngle = float(j) * angleStep + ringRotation;
        vec2 avoiderPos = vec2(cos(pointAngle), sin(pointAngle)) * ringRadius;
        avoiderPos.y *= u_ratio;
        vec2 fromAvoider = pos - avoiderPos;
        vec2 fromAvoiderPx = vec2(fromAvoider.x * u_resolution.x * 0.5, fromAvoider.y * u_resolution.y * 0.5);
        float distPx = length(fromAvoiderPx);
        float avoiderRadiusPx = u_avoiderRadius * 0.1 * base;

        if (distPx < avoiderRadiusPx && u_toggleAvoiderDisplay == 1.0) {
          color = vec3(1.0, 0.12, 0.18);
        }
      }
    }
  }

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;
