export const depositFragmentShader = /*glsl*/`
precision highp float;
uniform float u_deposit;
void main() {
  gl_FragColor = vec4(u_deposit, 0.0, 0.0, 1.0);
}
`;
