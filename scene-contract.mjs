// Authored seeds (<8192) are unchanged; integer entropy stays in u_seedBits.
export const reduceSeed = (seed) => seed % 8192;

// All scene shaders are GLSL ES 3.00 bodies appended to this shared header.
export const shaderHeader = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 u_resolution;
uniform float u_time, u_dt, u_seed, u_energy, u_bass, u_mid, u_high, u_onset, u_beat;
// Live show energy 0..1 (contract v3): for responses no parameter expresses.
uniform float u_level;
uniform highp uint u_seedBits, u_tick;
uniform float u_raySteps;
uniform vec3 u_primary, u_secondary, u_accent;
uniform float u_params[8];
uniform sampler2D u_state, u_previous;
uniform bool u_reset;
uniform vec3 u_gesture;
in vec2 v_uv;
out vec4 outColor;
const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;
float sq(float x) { return x*x; }
vec2 sq(vec2 x) { return x*x; }
vec3 sq(vec3 x) { return x*x; }
uint seedHash(uint value) {
  value ^= value >> 16u;
  value *= 2246822519u;
  value ^= value >> 13u;
  value *= 3266489917u;
  return value ^ (value >> 16u);
}
uint cellHash(uvec3 cell) {
  cell ^= uvec3(u_seedBits);
  return seedHash(cell.x ^ seedHash(cell.y) ^ seedHash(cell.z));
}
float hash(vec2 p) {
  return float(cellHash(uvec3(floatBitsToUint(p), 0u)) >> 8u) / 16777216.;
}
float tickHash(ivec2 cell, uint stream) {
  return float(cellHash(uvec3(uvec2(cell), u_tick) ^ uvec3(0u, 0u, seedHash(stream))) >> 8u) / 16777216.;
}
vec4 quantize8(vec4 value) {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec4 noise = vec4(tickHash(cell,0u), tickHash(cell,1u),
                    tickHash(cell,2u), tickHash(cell,3u)) - .5;
  return floor(clamp(value,0.,1.)*255. + .5 + noise) / 255.;
}
void emit(vec4 value) { outColor = quantize8(value); }
mat2 rot2(float a) { float c=cos(a),s=sin(a); return mat2(c,-s,s,c); }
vec2 fold(vec2 p, float sectors) {
  if (sectors <= 1.) return p;
  float sector=TAU/sectors;
  float a=abs(mod(atan(p.y,p.x)+sector*.5,sector)-sector*.5);
  return length(p)*vec2(cos(a),sin(a));
}
vec2 torusDelta(vec2 a, vec2 b) { return fract(a-b+.5)-.5; }
vec2 pack16(float value) {
  float n=floor(clamp(value,0.,1.)*65535.+.5);
  return vec2(floor(n/256.),mod(n,256.))/255.;
}
float unpack16(vec2 bytes) { return dot(bytes,vec2(256.,1.))*(255./65535.); }
vec4 pack16(vec2 value) { return vec4(pack16(value.x),pack16(value.y)); }
vec2 unpack16(vec4 bytes) { return vec2(unpack16(bytes.rg),unpack16(bytes.ba)); }
vec4 stateBilinear(vec2 uv) {
  vec2 size=vec2(textureSize(u_state,0));
  vec2 grid=fract(uv)*size-.5, f=fract(grid), base=(floor(grid)+.5)/size;
  vec2 t=1./size;
  return mix(mix(texture(u_state,base),texture(u_state,base+vec2(t.x,0.)),f.x),
             mix(texture(u_state,base+vec2(0.,t.y)),texture(u_state,base+t),f.x),f.y);
}
// Decode is linear in the bytes, so decoding this interpolant equals
// bilinearly interpolating four decoded concentrations (not packed angles).
vec2 stateBilinear16(vec2 uv) { return unpack16(stateBilinear(uv)); }
vec2 laplacian9(sampler2D state, vec2 uv) {
  vec2 t=1./vec2(textureSize(state,0));
  vec4 sum=-texture(state,uv);
  sum+=.2*(texture(state,uv+vec2(t.x,0.))+texture(state,uv-vec2(t.x,0.))
          +texture(state,uv+vec2(0.,t.y))+texture(state,uv-vec2(0.,t.y)));
  sum+=.05*(texture(state,uv+t)+texture(state,uv-t)
          +texture(state,uv+vec2(t.x,-t.y))+texture(state,uv+vec2(-t.x,t.y)));
  return unpack16(sum);
}
vec2 aspectUV() { return (v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.); }
vec3 palette(float t) { return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t)); }
`;
// Scene: {id,number,name,description,schema,presets,fragment,simulation?}.
// Schema: <=8 {key,label,min,max,step,default}; presets: >=6 bounded looks.
// maxRenderWidth caps visual shading (aspect preserved), not final output.
// Visual u_dt is frame dt; simulation u_dt is fixed 1/60 before reduced-motion
// scaling. u_time is accumulated fixed-tick scene time. u_tick advances on
// each simulation write (or visual frame), independent of floating-point time.
// simulation {fragment,size:[w,h],steps,filter?} ping-pongs RGBA8 state;
// filter:'linear' is only for unpacked state, never packed phase/16-bit bytes.
// u_reset is true on first write; u_gesture=(x,y,strength).
// u_raySteps is an engine budget (default 96), independent of preset params.
// Use emit for decaying RGBA8 feedback, not byte-exact packed state.
