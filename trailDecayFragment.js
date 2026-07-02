export const trailDecayFragmentShader = /*glsl*/`
precision highp float;

uniform sampler2D u_trail;
uniform float u_decay;

varying vec2 v_uv;

void main() {
  vec4 t = texture2D(u_trail, v_uv);
  vec3 c = t.rgb * u_decay;
  gl_FragColor = vec4(c, 1.0);
}
`;
