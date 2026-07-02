export const physarumUpdateFragmentShader = /*glsl*/`
precision highp float;
uniform sampler2D u_pos;         
uniform sampler2D u_properties; 
uniform sampler2D u_trail; 
uniform sampler2D u_density;     
uniform float u_size;
uniform float u_time;
uniform float u_ratio;
uniform float u_random;
uniform float u_sensorAngle;
uniform float u_sensorDist;   
uniform float u_stepSize;     
uniform float u_turnSpeed;
uniform int   u_wrap;
uniform float u_flowStrength;
uniform float u_explore;
uniform float u_avoidanceStrength;
uniform float u_mandalaRings;
uniform float u_mandalaPointsPerRing;
uniform float u_mandalaRadius;
uniform float u_mandalaRotationSpeed;
uniform float u_avoiderStrength;
uniform float u_avoiderRadius;
uniform vec2  u_resolution;   
varying vec2 v_uv;
varying float ang;

float hash12(vec2 p) {
  vec3 p3  = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec2 pxToClip(vec2 dp) {
  return vec2(dp.x / u_resolution.x * 2.0, dp.y / u_resolution.y * 2.0);
}


vec2 normPix(vec2 d) {
  return d;
}

float trailAt(vec2 clipPos) {
  vec2 uv = clipPos * 0.5 + 0.5;
  float trail = texture2D(u_trail, uv).r;
  float density = texture2D(u_density, uv).r;
  return trail - density * u_avoidanceStrength;
}

const int NUM_OCTAVES = 8;

float fbm(vec2 x) {
	float v = 0.0;
	float a = 2.5;
	vec2 shift = vec2(1000);
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
	for (int i = 0; i < NUM_OCTAVES; ++i) {
		v += a * noise(x);
		x = rot * x * 2.0 + shift;
		a *= 0.5;
	}
	return v;
}


void main() {
  vec4 st = texture2D(u_pos, v_uv);
  vec2 pos  = st.xy;
  float ang = st.z;
  float leftAng  = ang + u_sensorAngle;
  float rightAng = ang - u_sensorAngle;
  vec2 dirF = vec2(cos(ang),       sin(ang));
  vec2 dirL = vec2(cos(leftAng),   sin(leftAng));
  vec2 dirR = vec2(cos(rightAng),  sin(rightAng));
  float base = min(u_resolution.x, u_resolution.y);
  float sensorDistPx = u_sensorDist * base;
  float stepPx       = u_stepSize   * base;
  vec2 dF = normPix(dirF);
  vec2 dL = normPix(dirL);
  vec2 dR = normPix(dirR);
  float sF = trailAt(pos + pxToClip(dF * sensorDistPx));
  float sL = trailAt(pos + pxToClip(dL * sensorDistPx));
  float sR = trailAt(pos + pxToClip(dR * sensorDistPx));
  float turn = 0.0;
  if (sL > sF && sL > sR) {
    turn =  u_turnSpeed;
  } else if (sR > sF && sR > sL) {
    turn = -u_turnSpeed;
  } else {
    float r = hash12(v_uv + u_time) - 0.5;
    turn = r * 0.15;
  }
  ang += turn;
  vec2 avoiderTotalForce = vec2(0.0);
  if (u_mandalaRings > 0.0) {
      float angle_step = (2.0 * 3.1415926535) / u_mandalaPointsPerRing;
      float total_rotation = u_mandalaRotationSpeed;
      const int MAX_RINGS = 10; 
      const int MAX_POINTS_PER_RING = 10; 
      for (int i = 1; i <= MAX_RINGS; i++) {
          if (i > int(u_mandalaRings)) break;
          float ring_radius = float(i) * u_mandalaRadius;
          float ring_rotation = total_rotation * (mod(float(i), 2.0) * 2.0 - 1.0);
          for (int j = 0; j < MAX_POINTS_PER_RING; j++) {
              if (j >= int(u_mandalaPointsPerRing)) break;
              float point_angle = float(j) * angle_step + ring_rotation;
              vec2 avoider_pos = vec2(cos(point_angle), sin(point_angle)) * ring_radius;
              avoider_pos.x /= u_ratio;
              vec2 from_avoider = pos - avoider_pos;
              vec2 from_avoider_px = vec2(from_avoider.x * u_resolution.x / 2.0, from_avoider.y * u_resolution.y / 2.0);
              float dist_px = length(from_avoider_px);
              float avoiderRadiusPx = u_avoiderRadius * base;
              if (dist_px < avoiderRadiusPx) {
                  float force = 1.0 - (dist_px / avoiderRadiusPx);
                  avoiderTotalForce += normalize(from_avoider_px) * force;
              }
          }
      }
  }
  if (length(avoiderTotalForce) > 0.0) {
      vec2 desired_dir = normalize(avoiderTotalForce);
      vec2 current_dir = vec2(cos(ang), sin(ang));
      vec2 perpendicular = vec2(-current_dir.y, current_dir.x);
      float turn_amount = dot(desired_dir, perpendicular);
      ang += turn_amount * u_avoiderStrength;
  }
  float r2 = hash12(v_uv + u_time + 20.0) - 0.5;
  ang += r2 * u_explore;
  float fbm = fbm(pos*4.0 * 0.1 + u_time * 0.01);
  pos += pxToClip(dF * stepPx);
  if (u_wrap == 1) {
    if (pos.x < -1.0) pos.x += 2.0;
    if (pos.x >  1.0) pos.x -= 2.0;
    if (pos.y < -1.0) pos.y += 2.0;
    if (pos.y >  1.0) pos.y -= 2.0;
  } else {
    if (pos.x < -1.0 || pos.x > 1.0) {
      ang = 3.141592653589793 - ang;
      pos.x = clamp(pos.x, -1.0, 1.0);
    }
    if (pos.y < -1.0 || pos.y > 1.0) {
      ang = -ang;
      pos.y = clamp(pos.y, -1.0, 1.0);
    }
  }
  gl_FragColor = vec4(pos, ang, 0.0);
}
`;
