export const drawVertexShader = /*glsl*/`
attribute vec2 a_id;
uniform sampler2D u_pos;        
uniform sampler2D u_properties; 
uniform float u_size;
uniform float u_ratio;

void main() {
  float ux = (a_id.x + 0.5) / u_size;
  float uy = (a_id.y + 0.5) / u_size;
  vec2 uv = vec2(ux, uy);
  vec3 st = texture2D(u_pos, uv).xyz;
  vec2 pos = st.xy;
  gl_PointSize = 1.0;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;
