// All scene shaders are GLSL ES 3.00 bodies appended to this shared header.
export const shaderHeader = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time, u_dt, u_seed, u_energy, u_bass, u_mid, u_high, u_onset, u_beat;
uniform highp uint u_seedBits;
uniform vec3 u_primary, u_secondary, u_accent;
uniform float u_params[8];
uniform sampler2D u_state, u_previous;
uniform bool u_reset;
uniform vec3 u_gesture;
in vec2 v_uv;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7)) + u_seed) * 43758.5453); }
vec2 aspectUV() { return (v_uv - .5) * vec2(u_resolution.x/u_resolution.y, 1.); }
vec3 palette(float t) { return mix(mix(u_secondary,u_primary,smoothstep(0.,.65,t)),u_accent,smoothstep(.65,1.,t)); }
`;
// Scene export: default object {id, number, name, description, schema, presets,
// fragment, simulation?}. schema: <=8 {key,label,min,max,step,default} entries.
// presets: >=6 {name,seed,params}; params keys match schema; all values finite/bounded.
// Optional maxRenderWidth caps visual shading (aspect preserved), not final output.
// fragment defines main(), uses u_state for simulation and u_previous for prior output.
// Optional simulation {fragment,size:[width,height],steps} executes fixed ticks with
// u_reset=true on its first tick, then ping-pongs RGBA8 textures. Encode state in [0,1].
// u_dt is fixed 1/60; u_time is fixed simulation time. u_gesture=(x,y,strength).
// Every shader writes opaque, bounded RGB. No external files/dependencies.
