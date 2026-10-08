import { shaderHeader } from "./scene-contract.mjs";
import { FlashLimiter } from "./flash-limiter.mjs";

// Set-wide post values are ceilings. A smooth onset keeps calm looks clean
// while reaching the full ceiling at peak energy, without per-frame objects.
export function postCurve(energy, start = 0) {
  const t = Math.max(0, Math.min(1, (energy - start) / (1 - start)));
  return t * t * (3 - 2 * t);
}

// Low-band following adds at most 0.06 (12% of the set ceiling), never
// bypassing the energy onset or exceeding that ceiling.
export function bloomAmount(ceiling, energy, low = 0) {
  ceiling = Math.max(0, Math.min(1, ceiling));
  const curve = postCurve(energy, 0.1);
  const lift = Math.min(0.06, ceiling * 0.12) * Math.max(0, Math.min(1, low));
  return Math.min(ceiling, (ceiling + lift) * curve);
}

// Shared by the picture and bloom passes, so highlights follow the same
// transition mask. Melt history is the outgoing, ungraded picture only.
const transitionShader = `
uniform highp sampler2D a,b,history;
uniform bool singleSlot,hasHistory;
uniform int transitionKind;
uniform float mixAmount,transitionTime,transitionDelta;
uniform float aspectA,aspectB,targetAspect;
vec2 cover(vec2 uv,float aspect) {
  return (uv-.5)*vec2(min(1.,targetAspect/aspect),min(1.,aspect/targetAspect))+.5;
}
float dissolveNoise(vec2 p) {
  vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(cell),hash(cell+vec2(1.,0.)),f.x),
    mix(hash(cell+vec2(0.,1.)),hash(cell+vec2(1.,1.)),f.x),f.y);
}
vec3 outgoingAt(vec2 uv) {
  if(transitionKind!=2 || !hasHistory) return texture(a,cover(uv,aspectA)).rgb;
  float stepTime=transitionDelta*sin(PI*mixAmount);
  vec2 p=(uv-.5)*vec2(targetAspect,1.);
  p=rot2(stepTime*.28)*p/(1.+stepTime*.24);
  p+=stepTime*.06*vec2(sin(p.y*9.+transitionTime*1.7),
    cos(p.x*8.-transitionTime*1.3));
  vec2 q=p/vec2(targetAspect,1.)+.5;
  q=1.-abs(1.-mod(q,2.));
  return texture(history,q).rgb;
}
vec3 sceneAt(vec2 uv) {
  vec3 c=outgoingAt(uv);
  if(singleSlot) return c;
  float amount=smoothstep(0.,1.,mixAmount);
  if(transitionKind==1) {
    vec2 p=(uv-.5)*vec2(targetAspect,1.)*34.;
    float noise=dissolveNoise(p+vec2(transitionTime*.8,-transitionTime*.55));
    // Threshold extends past the noise range for exact, clean endpoints.
    amount=smoothstep(noise-.065,noise+.065,mixAmount*1.13-.065);
  }
  return mix(c,texture(b,cover(uv,aspectB)).rgb,amount);
}
`;
const colorSpace = `
vec3 linearRGB(vec3 c) { return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c)); }
vec3 displayRGB(vec3 c) { c=max(c,vec3(0.)); return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c)); }
`;
export const compositeShader =
  shaderHeader +
  colorSpace +
  transitionShader +
  `
uniform highp sampler2D glow;
uniform bool raw,historyOnly;
uniform float brightness,blackout,bloom,kaleido,echo,chroma,grain,vignette;
uniform float hue,zoom,punch,pulse,flash;
uniform vec2 resolution;
// Shared view transform: zoom (with the beat punch), mirror-repeat when
// zoomed out so edges never smear.
vec2 viewUV(vec2 uv) {
  uv=(uv-.5)/(zoom*(1.+punch))+.5;
  return 1.-abs(1.-mod(uv,2.));
}
vec3 hueRotate(vec3 c,float turns) {
  if(turns==0.) return c;
  float a=turns*TAU,co=cos(a),si=sin(a);
  return max(vec3(0.),vec3(
    dot(c,vec3(.213+.787*co-.213*si,.715-.715*co-.715*si,.072-.072*co+.928*si)),
    dot(c,vec3(.213-.213*co+.143*si,.715+.285*co+.140*si,.072-.072*co-.283*si)),
    dot(c,vec3(.213-.213*co-.787*si,.715-.715*co+.715*si,.072+.928*co+.072*si))));
}
vec2 foldedUV(vec2 uv) {
  if(kaleido>1.) {
    vec2 p=(uv-.5)*vec2(resolution.x/resolution.y,1.);
    p=fold(p,kaleido);p.x*=resolution.y/resolution.x;uv=p+.5;
  }
  return uv;
}
vec3 effectedAt(vec2 screenUV) {
  vec3 c=sceneAt(foldedUV(viewUV(screenUV)));
  if(echo>.01 && hasHistory) {
    vec2 q=rot2(.008*echo)*(screenUV-.5)/1.006+.5;
    c=mix(c,texture(history,q).rgb,echo*.88);
  }
  return c;
}
vec3 chromaTint(vec3 c,float angle) {
  // B's sepia(1) saturate(5) hue-rotate(290/130deg), then screen overlays.
  c=clamp(vec3(dot(c,vec3(.393,.769,.189)),dot(c,vec3(.349,.686,.168)),
               dot(c,vec3(.272,.534,.131))),0.,1.);
  c=clamp(mix(vec3(dot(c,vec3(.213,.715,.072))),c,5.),0.,1.);
  float co=cos(angle),si=sin(angle);
  return clamp(vec3(
    dot(c,vec3(.213+.787*co-.213*si,.715-.715*co-.715*si,.072-.072*co+.928*si)),
    dot(c,vec3(.213-.213*co+.143*si,.715+.285*co+.140*si,.072-.072*co-.283*si)),
    dot(c,vec3(.213-.213*co-.787*si,.715-.715*co+.715*si,.072+.928*co+.072*si))),0.,1.);
}
void main() {
  if(historyOnly && transitionKind==2){outColor=vec4(outgoingAt(v_uv),1.);return;}
  if(raw){outColor=vec4(sceneAt(v_uv),1.);return;}
  vec3 c=effectedAt(v_uv);
  if(historyOnly){emit(vec4(c,1.));return;}
  if(chroma>.01) {
    float shift=chroma*.025;
    vec3 right=chromaTint(effectedAt(v_uv-vec2(shift,0.)),radians(290.));
    vec3 left=chromaTint(effectedAt(v_uv+vec2(shift,0.)),radians(130.));
    c=1.-(1.-c)*(1.-right*chroma*.4)*(1.-left*chroma*.4);
  }
  if(bloom>0.) c+=texture(glow,foldedUV(viewUV(v_uv))).rgb*bloom;
  c=hueRotate(c,hue);
  c*=1.+pulse;
  c=mix(c,vec3(1.),clamp(flash,0.,1.));
  c=max(c*brightness,vec3(0.));
  // One shared scale rolls off highlights without per-channel clipping/hue shift.
  float peak=max(c.r,max(c.g,c.b));
  float shoulder=peak<=.7 ? peak : .7+.3*(1.-exp(-((peak-.7)/.3)));
  if(peak>0.) c*=shoulder/peak;
  vec2 edge=(v_uv-.5)*2.;
  c*=1.-vignette*smoothstep(.2,1.,dot(edge,edge)*.5);
  float luminance=dot(c,vec3(.2126,.7152,.0722));
  float grainMask=smoothstep(0.,.15,luminance)*(1.-.65*smoothstep(.6,1.,luminance));
  if(grain>0.) c+=(tickHash(ivec2(gl_FragCoord.xy),73u)-.5)*grain*.08*grainMask;
  c*=1.-blackout;
  // Dither only the final display quantization; exact black remains black.
  float noise=(tickHash(ivec2(gl_FragCoord.xy),29u)-.5)/255.;
  noise*=smoothstep(0.,.02,max(0.,dot(c,vec3(.2126,.7152,.0722))));
  c=clamp(c+noise,0.,1.);
  if(blackout>=1.) c=vec3(0.);
  outColor=vec4(c,1.);
}
`;
const bloomShader =
  shaderHeader +
  transitionShader +
  `
uniform highp sampler2D source;
uniform int mode;
vec3 sampleAt(vec2 uv) {
  if(mode!=0) return texture(source,uv).rgb;
  vec3 c=sceneAt(uv);
  float peak=max(c.r,max(c.g,c.b));
  // A .8 highlight threshold with a .4 soft knee: HDR values keep their
  // excess radiance through the float pyramid instead of clipping at one.
  float knee=clamp(peak-.4,0.,.8);
  float contribution=max(peak-.8,knee*knee/1.6)/max(peak,.00001);
  return c*contribution;
}
void main() {
  vec2 t=1./vec2(mode==0?textureSize(a,0):textureSize(source,0));
  vec3 c;
  if(mode<2) {
    c=sampleAt(v_uv)*4.;
    c+=sampleAt(v_uv+t*vec2(-1.,-1.))+sampleAt(v_uv+t*vec2(1.,-1.));
    c+=sampleAt(v_uv+t*vec2(-1.,1.))+sampleAt(v_uv+t*vec2(1.,1.));
    c/=8.;
  } else {
    c=sampleAt(v_uv+t*vec2(-2.,0.))+sampleAt(v_uv+t*vec2(2.,0.));
    c+=sampleAt(v_uv+t*vec2(0.,-2.))+sampleAt(v_uv+t*vec2(0.,2.));
    c+=2.*(sampleAt(v_uv+t*vec2(-1.,-1.))+sampleAt(v_uv+t*vec2(1.,-1.))
      +sampleAt(v_uv+t*vec2(-1.,1.))+sampleAt(v_uv+t*vec2(1.,1.)));
    c/=12.;
  }
  outColor=vec4(c,1.);
}
`;
const outputShader =
  shaderHeader +
  colorSpace +
  `
uniform highp sampler2D source;
uniform float gain;
void main(){vec3 c=texture(source,v_uv).rgb;outColor=vec4(gain==1.?c:displayRGB(linearRGB(c)*gain),1.);}
`;
// RGBA8 stores IEEE float bits exactly. Unlike fixed-point contributions this
// remains precise when a quarter-resolution cell contributes very little.
const meanCodec = `
vec4 encodeMean(float value){
  uint bits=floatBitsToUint(value);
  return vec4(uvec4(bits>>24u,bits>>16u,bits>>8u,bits)&uvec4(255u))/255.;
}
float decodeMean(vec4 value){
  uvec4 bits=uvec4(floor(value*255.+.5));
  return uintBitsToFloat((bits.x<<24u)|(bits.y<<16u)|(bits.z<<8u)|bits.w);
}
`;
const meanFirstShader =
  shaderHeader +
  colorSpace +
  meanCodec +
  `
uniform highp sampler2D source;
uniform float pixelCount;
void main(){
  ivec2 size=textureSize(source,0),base=ivec2(gl_FragCoord.xy)*4;
  float sum=0.;
  for(int y=0;y<4;y++)for(int x=0;x<4;x++){
    ivec2 p=base+ivec2(x,y);
    if(all(lessThan(p,size)))
      sum+=dot(linearRGB(texelFetch(source,p,0).rgb),vec3(.2126,.7152,.0722));
  }
  outColor=encodeMean(sum/pixelCount);
}
`;
const meanShader =
  shaderHeader +
  meanCodec +
  `
uniform highp sampler2D source;
void main(){
  ivec2 size=textureSize(source,0),base=ivec2(gl_FragCoord.xy)*8;
  float sum=0.;
  for(int y=0;y<8;y++)for(int x=0;x<8;x++){
    ivec2 p=base+ivec2(x,y);
    if(all(lessThan(p,size)))sum+=decodeMean(texelFetch(source,p,0));
  }
  outColor=encodeMean(sum);
}
`;

export class AsyncReadback {
  constructor(gl, size) {
    this.gl = gl;
    this.buffer = gl.createBuffer();
    this.pixels = new Uint8Array(size);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.bufferData(gl.PIXEL_PACK_BUFFER, size, gl.STREAM_READ);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.sync = null;
  }
  begin(target) {
    if (this.sync || this.gl.isContextLost()) return false;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    return true;
  }
  poll() {
    if (!this.sync) return null;
    const gl = this.gl;
    if (gl.isContextLost()) {
      this.cancel();
      return null;
    }
    const status = gl.clientWaitSync(this.sync, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED) return null;
    if (status === gl.WAIT_FAILED) {
      this.cancel();
      return null;
    }
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.pixels);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.deleteSync(this.sync);
    this.sync = null;
    return this.pixels;
  }
  cancel() {
    if (this.sync && !this.gl.isContextLost()) this.gl.deleteSync(this.sync);
    this.sync = null;
  }
  dispose() {
    this.cancel();
    this.gl.deleteBuffer(this.buffer);
  }
}

export class Compositor {
  constructor(engine) {
    this.engine = engine;
    this.gl = engine.gl;
    this.program = engine.program(
      compositeShader.replace(shaderHeader, engine.pictureHeader),
    );
    this.bloomProgram = engine.program(bloomShader);
    this.outputProgram = engine.program(outputShader);
    this.meanFirstProgram = engine.program(meanFirstShader);
    this.meanProgram = engine.program(meanShader);
    this.readback = new AsyncReadback(this.gl, 4);
    this.meanView = new DataView(this.readback.pixels.buffer);
    this.limiter = new FlashLimiter();
    this.targets = [];
    this.bloomTargets = [];
    this.meanTargets = [];
    this.frames = [];
    this.echoTarget = null;
    this.echoNextTarget = null;
    this.echoValid = false;
    this.meltTransition = null;
    this.meltElapsed = 0;
    this.displayValid = false;
    this.canvasValid = false;
    this.blackoutActive = false;
    this.gain = 1;
  }
  target(w, h, options) {
    const target = this.engine.target(w, h, options);
    this.targets.push(target);
    return target;
  }
  resize() {
    this.readback.cancel();
    for (const target of this.targets) this.engine.deleteTarget(target);
    this.targets.length =
      this.bloomTargets.length =
      this.meanTargets.length =
      this.frames.length =
        0;
    this.echoTarget = null;
    this.echoNextTarget = null;
    this.echoValid = this.displayValid = false;
    this.canvasValid = false;
    this.meltTransition = null;
    this.meltElapsed = 0;
  }
  texture(program, name, unit, target) {
    const gl = this.gl;
    const uniform = program.uniforms[name];
    if (uniform == null) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(uniform, unit);
  }
  scenes(program, target = null) {
    const e = this.engine,
      gl = this.gl,
      u = program.uniforms;
    const first = e.slots[0],
      last = e.slots.at(-1);
    const a = first.visual[first.vi],
      b = last.visual[last.vi];
    this.texture(program, "a", 0, a);
    this.texture(program, "b", 1, b);
    this.texture(program, "history", 3, this.echoTarget || a);
    if (u.hasHistory != null)
      gl.uniform1i(u.hasHistory, this.echoValid ? 1 : 0);
    if (u.transitionKind != null)
      gl.uniform1i(
        u.transitionKind,
        e.transition?.kind === "dissolve"
          ? 1
          : e.transition?.kind === "melt"
            ? 2
            : 0,
      );
    if (u.transitionTime != null)
      gl.uniform1f(u.transitionTime, e.transition?.elapsed ?? 0);
    if (u.transitionDelta != null)
      gl.uniform1f(
        u.transitionDelta,
        Math.max(
          0,
          Math.min(0.1, (e.transition?.elapsed ?? 0) - this.meltElapsed),
        ),
      );
    if (u.u_seedBits != null)
      gl.uniform1ui(u.u_seedBits, last.snapshot.seed >>> 0);
    if (u.aspectA != null) gl.uniform1f(u.aspectA, a.w / a.h);
    if (u.aspectB != null) gl.uniform1f(u.aspectB, b.w / b.h);
    if (u.targetAspect != null)
      gl.uniform1f(
        u.targetAspect,
        target ? target.w / target.h : e.width / e.height,
      );
    if (u.singleSlot != null)
      gl.uniform1i(u.singleSlot, first === last ? 1 : 0);
    if (u.mixAmount != null)
      gl.uniform1f(
        u.mixAmount,
        e.transition
          ? Math.min(1, e.transition.elapsed / e.transition.duration)
          : 1,
      );
  }
  bloom() {
    const e = this.engine,
      gl = this.gl,
      p = this.bloomProgram;
    if (!this.bloomTargets.length) {
      for (const divisor of [2, 4, 8, 4, 2])
        this.bloomTargets.push(
          this.target(
            Math.max(1, Math.floor(e.width / divisor)),
            Math.max(1, Math.floor(e.height / divisor)),
          ),
        );
    }
    for (let i = 0; i < 5; i++) {
      e.bind(p, this.bloomTargets[i]);
      this.scenes(p);
      if (i > 0) this.texture(p, "source", 2, this.bloomTargets[i - 1]);
      else this.texture(p, "source", 2, e.slots[0].visual[e.slots[0].vi]);
      gl.uniform1i(p.uniforms.mode, i === 0 ? 0 : i < 3 ? 1 : 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    return this.bloomTargets[4];
  }
  render(target, raw) {
    const e = this.engine,
      gl = this.gl,
      p = this.program,
      u = p.uniforms;
    const melt = e.transition?.kind === "melt";
    if (melt && this.meltTransition !== e.transition) {
      this.meltTransition = e.transition;
      this.meltElapsed = 0;
      this.echoValid = false;
    } else if (!melt && this.meltTransition) {
      this.meltTransition = null;
      this.echoValid = false;
    }
    const level = raw ? 0 : e.finite(e.level ?? 0.5, 0.5);
    const bloom = raw
      ? 0
      : bloomAmount(
          e.finite(e.options.bloom ?? 0.15, 0), level,
          e.finite(e.audioFeatures?.low ?? 0),
        );
    // The same two history targets serve echo and melt, never both at once.
    const echo =
      raw || melt
        ? 0
        : e.finite(e.options.echo ?? 0, 0) * postCurve(level, 0.15);
    if ((echo > 0.01 || melt) && !this.echoTarget) {
      this.echoTarget = this.target(e.width, e.height);
      this.echoNextTarget = this.target(e.width, e.height);
    }
    if (echo <= 0.01 && !melt) this.echoValid = false;
    const glow = bloom > 0 ? this.bloom() : e.slots[0].visual[e.slots[0].vi];
    e.bind(p, target);
    this.scenes(p, target);
    this.texture(p, "glow", 2, glow);
    this.texture(p, "history", 3, this.echoTarget || glow);
    gl.uniform1i(u.hasHistory, this.echoValid ? 1 : 0);
    gl.uniform1i(u.raw, raw ? 1 : 0);
    gl.uniform1i(u.historyOnly, 0);
    gl.uniform1f(u.bloom, bloom);
    gl.uniform1f(
      u.brightness,
      raw ? 1 : e.finite(e.options.brightness ?? 0.92, 0.92),
    );
    gl.uniform1f(
      u.blackout,
      raw ? 0 : e.blackoutTarget > 0 ? 1 : e.finite(e.blackout, 1),
    );
    gl.uniform1f(u.kaleido, raw ? 1 : e.finite(e.options.kaleido ?? 1, 1));
    gl.uniform1f(u.echo, echo);
    gl.uniform1f(
      u.chroma,
      raw ? 0 : e.finite(e.options.chroma ?? 0, 0) * postCurve(level, 0.25),
    );
    gl.uniform1f(
      u.grain,
      raw ? 0 : e.finite(e.options.grain ?? 0.12, 0) * postCurve(level, 0.3),
    );
    gl.uniform1f(
      u.vignette,
      raw ? 0 : e.finite(e.options.vignette ?? 0.15, 0) * postCurve(level, 0.3),
    );
    gl.uniform2f(u.resolution, e.width, e.height);
    gl.uniform1f(u.hue, raw ? 0 : e.finite(e.view?.hue ?? 0, 0));
    gl.uniform1f(
      u.zoom,
      raw ? 1 : Math.max(0.25, e.finite(e.view?.zoom ?? 1, 1)),
    );
    gl.uniform1f(u.punch, raw ? 0 : e.finite(e.beatFx?.punch ?? 0, 0));
    gl.uniform1f(u.pulse, raw ? 0 : e.finite(e.beatFx?.pulse ?? 0, 0));
    gl.uniform1f(
      u.flash,
      raw ? 0 : Math.min(1, e.finite(e.beatFx?.flash ?? 0, 0)),
    );
    gl.uniform1ui(u.u_tick, e.renderTick);
    gl.uniform1ui(u.u_seedBits, e.slots.at(-1).snapshot.seed >>> 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if ((echo > 0.01 || melt) && !raw) {
      e.bind(p, this.echoNextTarget);
      gl.uniform1i(u.historyOnly, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      const previous = this.echoTarget;
      this.echoTarget = this.echoNextTarget;
      this.echoNextTarget = previous;
      this.echoValid = true;
      if (melt) this.meltElapsed = e.transition.elapsed;
    }
  }
  mean(target) {
    const e = this.engine,
      gl = this.gl;
    if (!this.meanTargets.length) {
      let w = Math.max(1, Math.ceil(e.width / 4)),
        h = Math.max(1, Math.ceil(e.height / 4));
      this.meanTargets.push(this.target(w, h, { bytes: true }));
      while (w > 1 || h > 1) {
        w = Math.max(1, Math.ceil(w / 8));
        h = Math.max(1, Math.ceil(h / 8));
        this.meanTargets.push(this.target(w, h, { bytes: true }));
      }
    }
    for (let i = 0; i < this.meanTargets.length; i++) {
      const p = i === 0 ? this.meanFirstProgram : this.meanProgram;
      e.bind(p, this.meanTargets[i]);
      this.texture(p, "source", 0, i === 0 ? target : this.meanTargets[i - 1]);
      if (i === 0) gl.uniform1f(p.uniforms.pixelCount, e.width * e.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    const last = this.meanTargets.at(-1);
    return this.readback.begin(last);
  }
  approve() {
    const e = this.engine;
    let mean = this.meanView.getFloat32(0); // Shader stores RGBA in big-endian byte order.
    // A non-finite pixel in the float path must not disable the limiter:
    // treat it as the brightest possible frame and count it.
    if (!Number.isFinite(mean)) {
      e.counters.nonFinite++;
      mean = 1;
    }
    this.gain = this.limiter.update(mean, performance.now() / 1000);
    if (this.limiter.limited) e.counters.flashLimited++;
    const old = this.frames[0];
    this.frames[0] = this.frames[1];
    this.frames[1] = old;
    this.displayValid = true;
    this.lastMean = mean;
  }
  output(target, gain) {
    const e = this.engine,
      gl = this.gl,
      p = this.outputProgram;
    if (gain === 1) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, target.fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(
        0,
        0,
        target.w,
        target.h,
        0,
        0,
        e.width,
        e.height,
        gl.COLOR_BUFFER_BIT,
        gl.NEAREST,
      );
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      this.canvasValid = true;
      return;
    }
    e.bind(p, null);
    this.texture(p, "source", 0, target);
    gl.uniform1f(p.uniforms.gain, gain);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.canvasValid = true;
  }
  present(target = null, raw = false) {
    const e = this.engine;
    const exempt = e.flashExempt || e.blackoutTarget > 0;
    if (this.blackoutActive && e.blackoutTarget <= 0) this.canvasValid = false;
    this.blackoutActive = e.blackoutTarget > 0;
    // An offscreen freeze does not invalidate the independently approved canvas.
    if (raw || target) {
      this.render(target, raw);
      return;
    }
    if (e.options.flashLimit === false || exempt) {
      this.readback.cancel();
      this.displayValid = false;
      this.limiter.reset(e.blackoutTarget > 0 ? 0 : null);
      this.render(target, raw);
      this.canvasValid = true;
      return;
    }
    if (!this.frames.length) {
      this.frames.push(
        this.target(e.width, e.height),
        this.target(e.width, e.height),
      );
    }
    const pixels = this.readback.poll();
    if (pixels) this.approve();
    if (!this.readback.sync) {
      this.render(this.frames[1], false);
      this.mean(this.frames[1]);
    }
    // Preserve the actual canvas while the first approval is pending. A resize
    // clears it, so bootstrap that canvas from the direct candidate, never from
    // an uninitialised target with a sentinel gain of zero.
    if (this.displayValid) this.output(this.frames[0], this.gain);
    else if (!this.canvasValid) this.output(this.frames[1], 1);
    else this.gl.flush(); // Submit a first approval while preserving a direct canvas.
  }
  dispose() {
    this.resize();
    this.readback.dispose();
    for (const p of [
      this.program,
      this.bloomProgram,
      this.outputProgram,
      this.meanFirstProgram,
      this.meanProgram,
    ])
      this.gl.deleteProgram(p.p);
  }
}
