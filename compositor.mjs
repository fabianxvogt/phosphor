import { shaderHeader } from "./scene-contract.mjs";
import { FlashLimiter } from "./flash-limiter.mjs";

const colorSpace = `
vec3 linearRGB(vec3 c) { return mix(c/12.92,pow((c+.055)/1.055,vec3(2.4)),step(vec3(.04045),c)); }
vec3 displayRGB(vec3 c) { c=max(c,vec3(0.)); return mix(c*12.92,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c)); }
`;
export const compositeShader = shaderHeader + colorSpace + `
uniform sampler2D a,b,glow,history;
uniform bool singleSlot,hasHistory,raw,historyOnly;
uniform float mixAmount,brightness,blackout,bloom,kaleido,echo,chroma;
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
vec3 sceneAt(vec2 uv) {
  vec3 c=texture(a,uv).rgb;
  if (!singleSlot) c=mix(c,texture(b,uv).rgb,mixAmount);
  return c;
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
  c*=1.-blackout;
  float noise=(tickHash(ivec2(gl_FragCoord.xy),29u)-.5)/255.;
  c=clamp(c+noise,0.,1.);
  if(blackout>=1.) c=vec3(0.);
  outColor=vec4(c,1.);
}
`;
const bloomShader = shaderHeader + `
uniform sampler2D source,a,b;
uniform int mode;
uniform bool singleSlot;
uniform float mixAmount;
vec3 sampleAt(vec2 uv) {
  if(mode!=0) return texture(source,uv).rgb;
  vec3 c=texture(a,uv).rgb;
  if(!singleSlot)c=mix(c,texture(b,uv).rgb,mixAmount);
  float peak=max(c.r,max(c.g,c.b));
  float knee=clamp(peak-.2,0.,.4);
  float contribution=max(peak-.4,knee*knee/.8)/max(peak,.00001);
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
const outputShader = shaderHeader + colorSpace + `
uniform sampler2D source;
uniform float gain;
void main(){vec3 c=texture(source,v_uv).rgb;outColor=vec4(gain==1.?c:displayRGB(linearRGB(c)*gain),1.);}
`;
const meanShader = shaderHeader + colorSpace + `
uniform sampler2D source;
uniform bool first;
uniform vec2 originalSize;
uniform float span;
float decodeMean(vec3 c){return dot(floor(c*255.+.5),vec3(65536.,256.,1.))/16777215.;}
vec3 encodeMean(float value){float n=floor(clamp(value,0.,1.)*16777215.+.5);return vec3(floor(n/65536.),mod(floor(n/256.),256.),mod(n,256.))/255.;}
void main(){
  ivec2 size=textureSize(source,0),outSize=max(size/2,ivec2(1));
  ivec2 base=ivec2(gl_FragCoord.xy)*2;
  float sum=0.,weight=0.;
  for(int y=0;y<3;y++)for(int x=0;x<3;x++){
    ivec2 p=base+ivec2(x,y);
    if(any(greaterThanEqual(p,size)))continue;
    // Odd tails belong to the last output cell; earlier cells take 2x2.
    if(x==2 && int(gl_FragCoord.x)!=outSize.x-1)continue;
    if(y==2 && int(gl_FragCoord.y)!=outSize.y-1)continue;
    vec2 count=min(vec2(span),originalSize-vec2(p)*span);
    if(p.x==size.x-1)count.x=originalSize.x-float(p.x)*span;
    if(p.y==size.y-1)count.y=originalSize.y-float(p.y)*span;
    float w=count.x*count.y;
    vec3 c=texelFetch(source,p,0).rgb;
    float v=first?dot(linearRGB(c),vec3(.2126,.7152,.0722)):decodeMean(c);
    sum+=v*w;weight+=w;
  }
  outColor=vec4(encodeMean(sum/max(weight,1.)),1.);
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
    if (this.sync) return false;
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.readPixels(0, 0, target.w, target.h, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    this.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    return true;
  }
  poll() {
    if (!this.sync) return null;
    const gl = this.gl;
    const status = gl.clientWaitSync(this.sync, 0, 0);
    if (status === gl.TIMEOUT_EXPIRED) return null;
    if (status === gl.WAIT_FAILED) throw new Error("GPU readback fence failed");
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, this.buffer);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, this.pixels);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    gl.deleteSync(this.sync);
    this.sync = null;
    return this.pixels;
  }
  cancel() {
    if (this.sync) this.gl.deleteSync(this.sync);
    this.sync = null;
  }
  dispose() { this.cancel(); this.gl.deleteBuffer(this.buffer); }
}

export class Compositor {
  constructor(engine) {
    this.engine = engine;
    this.gl = engine.gl;
    this.program = engine.program(compositeShader);
    this.bloomProgram = engine.program(bloomShader);
    this.outputProgram = engine.program(outputShader);
    this.meanProgram = engine.program(meanShader);
    this.readback = new AsyncReadback(this.gl, 4);
    this.limiter = new FlashLimiter();
    this.targets = [];
    this.bloomTargets = [];
    this.meanTargets = [];
    this.frames = [];
    this.echoTarget = null;
    this.echoNextTarget = null;
    this.echoValid = false;
    this.displayValid = false;
    this.gain = 1;
  }
  target(w, h) {
    const target = this.engine.target(w, h);
    this.targets.push(target);
    return target;
  }
  resize() {
    this.readback.cancel();
    for (const target of this.targets) this.engine.deleteTarget(target);
    this.targets.length = this.bloomTargets.length = this.meanTargets.length = this.frames.length = 0;
    this.echoTarget = null;
    this.echoNextTarget = null;
    this.echoValid = this.displayValid = false;
  }
  texture(program, name, unit, target) {
    const gl = this.gl;
    const uniform = program.uniforms[name];
    if (uniform == null) return;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(uniform, unit);
  }
  scenes(program) {
    const e = this.engine, gl = this.gl, u = program.uniforms;
    const first = e.slots[0], last = e.slots.at(-1);
    this.texture(program, "a", 0, first.visual[first.vi]);
    this.texture(program, "b", 1, last.visual[last.vi]);
    if (u.singleSlot != null) gl.uniform1i(u.singleSlot, first === last ? 1 : 0);
    if (u.mixAmount != null) gl.uniform1f(u.mixAmount, e.transition ? Math.min(1, e.transition.elapsed / e.transition.duration) : 1);
  }
  bloom() {
    const e = this.engine, gl = this.gl, p = this.bloomProgram;
    if (!this.bloomTargets.length) {
      for (const divisor of [2,4,8,4,2]) this.bloomTargets.push(this.target(Math.max(1,Math.floor(e.width/divisor)),Math.max(1,Math.floor(e.height/divisor))));
    }
    for (let i=0;i<5;i++) {
      e.bind(p,this.bloomTargets[i]);
      this.scenes(p);
      if (i>0) this.texture(p,"source",2,this.bloomTargets[i-1]);
      else this.texture(p,"source",2,e.slots[0].visual[e.slots[0].vi]);
      gl.uniform1i(p.uniforms.mode,i===0?0:i<3?1:2);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    return this.bloomTargets[4];
  }
  render(target, raw) {
    const e=this.engine, gl=this.gl, p=this.program, u=p.uniforms;
    const bloom=raw?0:e.finite(e.options.bloom ?? .15,0);
    const echo=raw?0:e.finite(e.options.echo ?? 0,0);
    const glow=bloom>0?this.bloom():e.slots[0].visual[e.slots[0].vi];
    if(echo>.01 && !this.echoTarget) {
      this.echoTarget=this.target(e.width,e.height);
      this.echoNextTarget=this.target(e.width,e.height);
    }
    if(echo<=.01)this.echoValid=false;
    e.bind(p,target);
    this.scenes(p);
    this.texture(p,"glow",2,glow);
    this.texture(p,"history",3,this.echoTarget || glow);
    gl.uniform1i(u.hasHistory,this.echoValid?1:0);
    gl.uniform1i(u.raw,raw?1:0);
    gl.uniform1i(u.historyOnly,0);
    gl.uniform1f(u.bloom,bloom);
    gl.uniform1f(u.brightness,raw?1:e.finite(e.options.brightness ?? .92,.92));
    gl.uniform1f(u.blackout,raw?0:e.blackoutTarget>0?1:e.finite(e.blackout,1));
    gl.uniform1f(u.kaleido,raw?1:e.finite(e.options.kaleido ?? 1,1));
    gl.uniform1f(u.echo,echo);
    gl.uniform1f(u.chroma,raw?0:e.finite(e.options.chroma ?? 0,0));
    gl.uniform2f(u.resolution,e.width,e.height);
    gl.uniform1f(u.hue,raw?0:e.finite(e.view?.hue ?? 0,0));
    gl.uniform1f(u.zoom,raw?1:Math.max(.25,e.finite(e.view?.zoom ?? 1,1)));
    gl.uniform1f(u.punch,raw?0:e.finite(e.beatFx?.punch ?? 0,0));
    gl.uniform1f(u.pulse,raw?0:e.finite(e.beatFx?.pulse ?? 0,0));
    gl.uniform1f(u.flash,raw?0:Math.min(1,e.finite(e.beatFx?.flash ?? 0,0)));
    gl.uniform1ui(u.u_tick,e.renderTick);
    gl.uniform1ui(u.u_seedBits,e.slots.at(-1).snapshot.seed >>> 0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(echo>.01 && !raw) {
      e.bind(p,this.echoNextTarget);
      gl.uniform1i(u.historyOnly,1);
      gl.drawArrays(gl.TRIANGLES,0,6);
      const previous=this.echoTarget;
      this.echoTarget=this.echoNextTarget;
      this.echoNextTarget=previous;
      this.echoValid=true;
    }
  }
  mean(target) {
    const e=this.engine,gl=this.gl,p=this.meanProgram;
    if(!this.meanTargets.length) {
      let w=e.width,h=e.height;
      do { w=Math.max(1,Math.floor(w/2));h=Math.max(1,Math.floor(h/2));this.meanTargets.push(this.target(w,h)); } while(w>1||h>1);
    }
    let span=1;
    for(let i=0;i<this.meanTargets.length;i++) {
      e.bind(p,this.meanTargets[i]);
      this.texture(p,"source",0,i===0?target:this.meanTargets[i-1]);
      gl.uniform1i(p.uniforms.first,i===0?1:0);
      gl.uniform2f(p.uniforms.originalSize,e.width,e.height);
      gl.uniform1f(p.uniforms.span,span);
      gl.drawArrays(gl.TRIANGLES,0,6);
      span*=2;
    }
    this.readback.begin(this.meanTargets.at(-1));
  }
  output(target, gain) {
    const e=this.engine,gl=this.gl,p=this.outputProgram;
    e.bind(p,null);
    this.texture(p,"source",0,target);
    gl.uniform1f(p.uniforms.gain,gain);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
  present(target=null,raw=false) {
    const e=this.engine;
    const exempt=e.flashExempt || e.blackoutTarget>0;
    if(raw || target || e.options.flashLimit===false || exempt) {
      this.readback.cancel();
      this.displayValid=false;
      this.limiter.anchor=null;
      this.render(target,raw);
      return;
    }
    if(!this.frames.length) {
      this.frames.push(this.target(e.width,e.height),this.target(e.width,e.height));
    }
    if(!this.displayValid && !this.readback.sync) {
      this.limiter.anchor=0;
      this.limiter.extreme=0;
      this.limiter.direction=0;
    }
    const pixels=this.readback.poll();
    if(pixels) {
      const mean=(pixels[0]*65536+pixels[1]*256+pixels[2])/16777215;
      this.gain=this.limiter.update(mean,performance.now()/1000);
      if(this.limiter.limited)e.counters.flashLimited++;
      const old=this.frames[0];this.frames[0]=this.frames[1];this.frames[1]=old;
      this.displayValid=true;
      this.lastMean=mean;
    }
    if(!this.readback.sync) {
      this.render(this.frames[1],false);
      this.mean(this.frames[1]);
      this.candidateTick=e.renderTick;
    }
    // Present only the exact frame whose mean has completed; never apply a
    // stale mean to a different image. While pending, repeat the approved frame.
    this.output(this.frames[0],this.displayValid?this.gain:0);
  }
  async capture() {
    const e=this.engine;
    if(e.options.flashLimit===false || e.flashExempt || e.blackoutTarget>0) {
      this.present();
      return;
    }
    if(!this.frames.length) {
      this.frames.push(this.target(e.width,e.height),this.target(e.width,e.height));
    }
    if(!this.readback.sync || this.candidateTick!==e.renderTick) {
      this.readback.cancel();
      if(!this.displayValid) {
        this.limiter.anchor=0;this.limiter.extreme=0;this.limiter.direction=0;
      }
      this.render(this.frames[1],false);
      this.mean(this.frames[1]);
      this.candidateTick=e.renderTick;
    }
    let pixels;
    while(!e.lost && !e.disposed && !(pixels=this.readback.poll())) {
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    if(!pixels)return;
    const mean=(pixels[0]*65536+pixels[1]*256+pixels[2])/16777215;
    this.gain=this.limiter.update(mean,performance.now()/1000);
    if(this.limiter.limited)e.counters.flashLimited++;
    const old=this.frames[0];this.frames[0]=this.frames[1];this.frames[1]=old;
    this.displayValid=true;this.lastMean=mean;
    this.output(this.frames[0],this.gain);
  }
  dispose() {
    this.resize();this.readback.dispose();
    for(const p of [this.program,this.bloomProgram,this.outputProgram,this.meanProgram])this.gl.deleteProgram(p.p);
  }
}
