/** Spectron #259 · ArtTab #108 · Goethe Farbenlehre · Gemälde */

export const TOKEN = {
  arttab: 'https://arttab.xyz/a/108',
  title: 'Spectron #259 · Simon de Mai',
  tokenId: '17000259',
  hash: '0x919b5b4f3e73db72052e169b728d2f245babe10e12cbcd9a0957816a3005bd27',
};

export function makeHashTable(hex) {
  const e = hex.substr(2);
  const r = [];
  for (let a = 0; a < 16; a++) {
    r[a] = parseInt(`0x${e.substr(a + 8, 1)}${e.substr(a + 24, 1)}${e.substr(a + 40, 1)}`, 16) / 4096;
  }
  return r;
}

export const FRAG = `
precision mediump float;
const vec3 x=vec3(.299,.587,.114);
uniform vec2 D;
uniform float m,I,c[32];
uniform float u_zoom,u_rot,u_beat;

float J(float a,float b,float d){return sin(6.28318*b*a+d);}
float K(float a,float b,float d,float e,float g){return atan(J(a,b,d)*e)*.63662;}
float o(vec2 a,float e,float b,float k){b*=.03;float g=mix(a.x,a.y,e),d=mod(g+b*.5,1.);d=max(2.*d-1.,0.);return 6.28318*k*(d-b);}
float j(vec2 a,float d,float e,float k,float g){float b=mix(a.x,a.y,d);g/=e,b=K(e,b,k,g,0.)*.5+.5;return b;}
float p(vec2 a,float d,float b,float k){b*=.03;float e=mix(a.x,a.y,d),g=mod(e+b*.5,1.);return .5+atan(sin(g*2.*3.14159)*120.)/3.14159;}
float h(float a){return 1.-a;}
float L(float a,float b){return a*b;}
float M(float a,float b){return 1.-(1.-a)*(1.-b);}
float E(float a,float b,float d){return mix(L(a,b),M(a,b),d);}
vec3 l(in float a,in vec3 b,in vec3 d,in vec3 e,in vec3 g){return b+d*cos(6.28318*(e*a+g));}
float n(float b,float a,float d){return b*(d-a)+a;}
float i(float b,float a,float d){return floor(b*(d-a)+a+.5);}
float f(float a){return floor(a+.5);}

float hn(vec2 p){
  return fract(sin(dot(floor(p*137.0),vec2(12.9898,78.233))+m*.002)*43758.5453);
}

vec2 xform(vec2 uv){
  vec2 c=uv-.5;
  float ca=cos(u_rot),sa=sin(u_rot);
  c=vec2(c.x*ca-c.y*sa,c.x*sa+c.y*ca);
  c/=u_zoom;
  return c+.5;
}

vec2 paintWarp(vec2 uv){
  float s=m*.006;
  vec2 w;
  w.x=sin(uv.y*4.+s)*.028+sin(uv.x*3.-s*.7)*.016;
  w.y=cos(uv.x*4.5-s)*.024+cos(uv.y*2.5+s)*.018;
  return uv+w;
}

vec3 spectronAt(vec2 b){
  vec3 y,z,e;float d=f(c[10]),g=i(c[2],1.,35.),q=n(c[14],0.,.5)+m*(2./g),r=p(b,d,q,1.);
  vec2 A=vec2(j(b,d,i(c[1],2.,4.),o(b,d,q,g),50.*r+150./g*h(r)),j(b,h(d),i(c[3],1.,2.),f(c[14])*1.570795,180.));
  float k=i(c[5],1.,3.+f(c[14]-.45)*5.),s=-1.*(m/k),t=p(b,d,s,1.);
  vec2 u=vec2(j(b,h(d),i(c[4],1.,3.),0.,100.),j(b,d,i(c[6],1.,2.),o(b,d,s,k),80.*t+150./k*h(t)));
  vec3 a[4];float v=f((c[12]+c[15])*.5+.2);
  a[0]=mix(vec3(.1),vec3(.4),v);a[1]=mix(vec3(.9),vec3(.6),v);a[2]=mix(vec3(.3),vec3(.6),v);
  a[3]=mix(mix(vec3(.92,.99,.98),vec3(1.02,.95,.96),f(c[11])),mix(vec3(.82,.7,.68+n(c[5],0.,.07)),vec3(.8,.81,.68),f(c[11]-.25)),v);
  float w=mix(j(b,0.,i(c[8],1.,2.),m*-.2,80.),1.,f(c[12]-.4));
  vec3 F=l(c[7],a[0],a[1],a[2],a[3])*w,G=l(c[6],a[0],a[1],a[2],a[3]),B=l(c[9],a[0],a[1],a[2],a[3])*h(w),C=l(c[2],a[0],a[1],a[2],a[3]);
  y=E(A.x,A.y,f(c[11]))*F;B*=h(dot(x,F));y+=h(A.y)*B*B;
  z=E(u.y,u.x,f(c[3]+.1))*G;C*=h(dot(x,G));z+=mix(u.y,u.y,f(c[7]))*C*C;
  float H=j(b,mix(h(d),d,f(c[12]-.35)),n(c[11],.5,2.),1.570795+f(c[12])*.785397,120.);
  e=y*H+z*h(H);e=mix(e,vec3(dot(e,x))*.5,I);
  e*=(.65+.35*sqrt(4.*b.y*(1.-b.y)))*.95;
  return e;
}

vec3 softPaint(vec2 b){
  vec2 px=2.8/D;
  vec3 e=vec3(0.);
  e+=spectronAt(b);
  e+=spectronAt(b+vec2(px.x,px.y));
  e+=spectronAt(b+vec2(-px.x,px.y));
  e+=spectronAt(b+vec2(px.x,-px.y));
  e+=spectronAt(b+vec2(-px.x,-px.y));
  return e/5.;
}

vec3 goetheWheel(float t){
  vec3 gelb=vec3(.82,.68,.12);
  vec3 orange=vec3(.78,.32,.06);
  vec3 rot=vec3(.62,.10,.06);
  vec3 violett=vec3(.38,.12,.42);
  vec3 blau=vec3(.08,.14,.42);
  vec3 gruen=vec3(.14,.38,.16);
  t=fract(t);
  float s=t*6.;
  if(s<1.) return mix(gelb,orange,s);
  if(s<2.) return mix(orange,rot,s-1.);
  if(s<3.) return mix(rot,violett,s-2.);
  if(s<4.) return mix(violett,blau,s-3.);
  if(s<5.) return mix(blau,gruen,s-4.);
  return mix(gruen,gelb,s-5.);
}

vec3 toGoethePaint(vec3 col,vec2 uv){
  float lum=dot(col,x);
  float chr=length(col-vec3(lum));
  float wheelT=fract(lum*.9+chr*1.4+m*.007+sin(uv.x*5.+uv.y*4.+m*.01)*.14+cos(uv.y*6.-m*.008)*.1);
  vec3 wheel=goetheWheel(wheelT);
  vec3 outC=mix(wheel*.3,wheel,.45+.5*lum);
  outC*=1.02+.06*sin(uv.x*2.1+m*.005)*sin(uv.y*1.6-m*.004);
  return clamp(outC,0.,1.);
}

float canvasGrain(vec2 uv){
  return .90+.06*hn(uv*900.)+.04*hn(uv*55.+m*.001);
}

float brushStroke(vec2 uv){
  float ang=m*.005+uv.y*1.6+sin(m*.008)*.3;
  vec2 dir=vec2(cos(ang),sin(ang));
  return .94+.06*sin(dot(uv*110.,dir)+m*.012);
}

vec3 ageVarnish(vec3 c,vec2 raw){
  vec3 warm=vec3(1.,.93,.78);
  c=mix(c,c*warm,.38);
  c*=canvasGrain(raw);
  c*=brushStroke(raw);
  float edge=length(raw-.5);
  c*=1.-edge*edge*.55;
  c=mix(c,c*.72,smoothstep(.25,.85,edge));
  return c;
}

void main(){
  vec2 raw=gl_FragCoord.st/D.xy;
  vec2 uv=xform(raw);
  uv=paintWarp(uv);

  vec3 e=softPaint(uv);
  e=toGoethePaint(e,uv);
  e=ageVarnish(e,raw);

  gl_FragColor=vec4(clamp(e,0.,1.),1.0);
}
`;

export const VERT = 'attribute vec4 position;void main(){gl_Position=position;}';
