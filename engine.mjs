import { shaderHeader, reduceSeed } from "./scene-contract.mjs";
import { Compositor, AsyncReadback } from "./compositor.mjs";
import { MELT_POINTS, MELT_ROWS, updateMeltGeometry } from "./melt-geometry.mjs";
const featureKeys = ["energy", "bass", "mid", "high", "onset"];
const featureUniforms = ["u_energy", "u_bass", "u_mid", "u_high", "u_onset"];
const paletteKeys = ["primary", "secondary", "accent"];
const paletteUniforms = ["u_primary", "u_secondary", "u_accent"];
const noMappings = [];
const programKeys = ["visual", "simulation"];
const vertex = `#version 300 es
layout(location=0) in vec2 position; out vec2 v_uv;
void main(){v_uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export class Engine {
  constructor(canvas, scenes, onError = () => {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      // Keep asynchronous live PNG pickers and captureStream consumers intact.
      // Private sequence renderers await ready(sceneId,true) for current frames.
      preserveDrawingBuffer: true,
    });
    if (!this.gl)
      throw new Error(
        "WebGL2 is required. Use current desktop Chrome or Edge.",
      );
    this.scenes = scenes;
    this.onError = onError;
    this.programs = new Map();
    this.paletteCache = new Map();
    this.counters = { gpuErrors: 0, nonFinite: 0, flashLimited: 0 };
    this.uniformFrame = 0;
    this.renderTick = 0;
    this.rayStepBudget = 96;
    this.flashExempt = false;
    this.lastErrorSample = 0;
    this.compileGeneration = 0;
    this.disposed = false;
    this.slots = [];
    this.time = 0;
    this.accumulator = 0;
    this.transition = null;
    this.features = { energy: 0, bass: 0, mid: 0, high: 0, onset: 0 };
    this.options = {
      brightness: 0.92,
      bloom: 0.15,
      kaleido: 1,
      reducedMotion: false,
      flashLimit: true,
      echo: 0,
      chroma: 0,
    };
    this.gesture = [0.5, 0.5, 0];
    this.blackout = 0;
    this.blackoutTarget = 0;
    this.lost = false;
    this.frames = new Float32Array(1800);
    // Live GPU textures created by this engine; must equal stats().textures.
    this.liveTextures = 0;
    this.frameCursor = 0;
    this.frameCount = 0;
    this.width = 960;
    this.height = 540;
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.onError(
        "Graphics context lost. Your set is safe; waiting for recovery.",
      );
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      try {
        const saved = this.active;
        this.init();
        if (saved) this.load(saved, 0);
        this.onError(
          "Graphics restored. Scene restarted; saved controls retained.",
        );
      } catch (e) {
        this.onError(e.message);
      }
    });
    this.init();
  }
  init() {
    const gl = this.gl;
    const generation = ++this.compileGeneration;
    this.parallelCompile = gl.getExtension("KHR_parallel_shader_compile");
    this.programs.clear();
    // A restored context has no surviving textures; count from zero again.
    this.liveTextures = 0;
    this.slots = [];
    this.transition = null;
    this.flashExempt = false;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
    this.pipeline = new Compositor(this);
    this.compositor = this.pipeline.program;
    this.resize(this.width,this.height);
    this.healthTarget = this.target(64,36);
    this.healthReadback = new AsyncReadback(gl,64*36*4);
    this.lastHealth = { mean: NaN, variance: NaN, pending: true };
    const activeId = this.active?.scene || this.scenes[0]?.id;
    if (activeId) this.compileScene(this.scenes.find(s => s.id === activeId));
    let index = 0;
    const background = () => {
      if (generation !== this.compileGeneration || this.disposed || this.lost) return;
      while (index < this.scenes.length && this.programs.has(this.scenes[index].id)) index++;
      if (index === this.scenes.length) return;
      this.compileScene(this.scenes[index++]);
      if (window.requestIdleCallback) window.requestIdleCallback(background);
      else setTimeout(background,0);
    };
    if (window.requestIdleCallback) window.requestIdleCallback(background);
    else setTimeout(background,0);
  }
  program(source, deferred = false) {
    const gl = this.gl;
    const v = gl.createShader(gl.VERTEX_SHADER), f = gl.createShader(gl.FRAGMENT_SHADER), p = gl.createProgram();
    gl.shaderSource(v,vertex);gl.compileShader(v);
    gl.shaderSource(f,source);gl.compileShader(f);
    gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
    gl.deleteShader(v);gl.deleteShader(f);
    const result = { p, uniforms: null };
    if (!deferred) this.finishProgram(result);
    return result;
  }
  finishProgram(program) {
    const gl = this.gl;
    if (!gl.getProgramParameter(program.p,gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program.p);
      gl.deleteProgram(program.p);
      program.p = null;
      throw new Error(message);
    }
    program.uniforms = {};
    for (let i=0;i<gl.getProgramParameter(program.p,gl.ACTIVE_UNIFORMS);i++) {
      const name = gl.getActiveUniform(program.p,i).name;
      program.uniforms[name.replace("[0]","")] = gl.getUniformLocation(program.p,name);
    }
  }
  compileScene(scene) {
    if (!scene || this.programs.has(scene.id)) return;
    const programs = { visual: null, simulation: null, error: null };
    this.programs.set(scene.id,programs);
    try {
      programs.visual = this.program(shaderHeader+scene.fragment,true);
      if (scene.simulation) programs.simulation = this.program(shaderHeader+scene.simulation.fragment,true);
      this.checkScene(scene.id);
    } catch (error) {
      programs.error = error.message;
      this.onError(`${scene.name} disabled: ${error.message}`);
    }
  }
  checkScene(id) {
    const programs = this.programs.get(id);
    if (!programs || programs.error) return false;
    try {
      for (const name of programKeys) {
        const p = programs[name];
        if (!p || p.uniforms) continue;
        if (this.parallelCompile && !this.gl.getProgramParameter(p.p,this.parallelCompile.COMPLETION_STATUS_KHR)) return false;
        this.finishProgram(p);
      }
      return true;
    } catch (error) {
      programs.error = error.message;
      for (const name of programKeys) {
        if (programs[name]?.p) this.gl.deleteProgram(programs[name].p);
        if (programs[name]) programs[name].p = null;
      }
      this.onError(`${id} disabled: ${error.message}`);
      return false;
    }
  }
  // Exporters await ready(id,true) after advance and before each PNG; live
  // presentation stays non-blocking. This also covers a lazily compiled visual.
  async ready(id, capture = false) {
    this.compileScene(this.scenes.find(s => s.id === id));
    while (!this.disposed && !this.lost) {
      if (this.checkScene(id)) {
        if (capture && this.slots.length) {
          for (const slot of this.slots) if (slot.visualReset) this.drawSlot(slot,0);
          await this.pipeline.capture();
        }
        return true;
      }
      if (this.programs.get(id)?.error || !this.programs.has(id)) return false;
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return false;
  }
  finite(value, fallback = 0) {
    if (Number.isFinite(value)) return value;
    this.counters.nonFinite++;
    return fallback;
  }
  target(w, h, simulation = false, filter = "nearest") {
    const gl = this.gl;
    const texture = gl.createTexture();
    this.liveTextures++;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      // Portable RGBA8, not SRGB8_ALPHA8: state is byte data and existing scenes
      // author display-encoded palettes. Automatic sRGB decoding would reinterpret
      // their lighting/feedback. The limiter alone measures/applies linear light.
      gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      simulation && filter !== "linear" ? gl.NEAREST : gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      simulation && filter !== "linear" ? gl.NEAREST : gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_S,
      simulation ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_WRAP_T,
      simulation ? gl.REPEAT : gl.CLAMP_TO_EDGE,
    );
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("GPU framebuffer unavailable");
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, fbo, w, h };
  }
  deleteTarget(t) {
    this.gl.deleteTexture(t.texture);
    this.liveTextures--;
    this.gl.deleteFramebuffer(t.fbo);
  }
  destroySlot(s) {
    for (const t of s.visual) this.deleteTarget(t);
    for (const t of s.sim) this.deleteTarget(t);
    if (s.geometryTexture) {
      this.gl.deleteTexture(s.geometryTexture);
      this.liveTextures--;
    }
  }
  visualSize(scene) {
    const scale = Math.min(
      1,
      (scene.maxRenderWidth || this.width) / this.width,
    );
    return [
      Math.max(1, Math.round(this.width * scale)),
      Math.max(1, Math.round(this.height * scale)),
    ];
  }
  resize(w, h) {
    const gl = this.gl;
    this.width = w;
    this.height = h;
    // Quality changes must not inherit timing samples from a different budget.
    this.frameCursor = 0;
    this.frameCount = 0;
    if (this.lost) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.pipeline?.resize();
    this.healthReadback?.cancel();
    for (const s of this.slots) {
      const old = s.visual;
      const [vw, vh] = this.visualSize(s.scene);
      const next = [this.target(vw, vh), this.target(vw, vh)];
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, old[s.vi].fbo);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, next[0].fbo);
      gl.blitFramebuffer(
        0,
        0,
        old[s.vi].w,
        old[s.vi].h,
        0,
        0,
        vw,
        vh,
        gl.COLOR_BUFFER_BIT,
        gl.LINEAR,
      );
      for (const t of old) this.deleteTarget(t);
      s.visual = next;
      s.vi = 0;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  prepareSnapshot(s, snapshot) {
    const previous = s.snapshot;
    if (!previous || previous.scene !== snapshot.scene || previous.preset !== snapshot.preset || previous.seed !== snapshot.seed) {
      s.snapshot = structuredClone(snapshot);
    } else {
      for (let i=0;i<s.scene.schema.length;i++) {
        const key = s.scene.schema[i].key;
        previous.params[key] = snapshot.params[key];
      }
      for (let i=0;i<paletteKeys.length;i++) {
        const key = paletteKeys[i];
        previous.palette[key] = snapshot.palette[key];
      }
    }
    if (!s.colors) { s.colors = {}; s.colorStrings = {}; }
    for (let i=0;i<paletteKeys.length;i++) {
      const key = paletteKeys[i], text = s.snapshot.palette[key];
      if (s.colorStrings[key] === text) continue;
      let color = this.paletteCache.get(text);
      if (!color) {
        color = new Float32Array(3);
        for (let channel=0;channel<3;channel++) color[channel] = parseInt(text.slice(1+channel*2,3+channel*2),16)/255;
        if (this.paletteCache.size >= 256) this.paletteCache.delete(this.paletteCache.keys().next().value);
        this.paletteCache.set(text,color);
      }
      s.colors[key] = color;
      s.colorStrings[key] = text;
    }
    s.uniformFrame = -1;
  }
  createSlot(snapshot) {
    const scene = this.scenes.find((s) => s.id === snapshot.scene);
    if (!scene) throw new Error("Unknown scene");
    this.compileScene(scene);
    const size = scene.simulation?.size || [1, 1];
    const visualSize = this.visualSize(scene);
    const slot = {
      scene,
      visual: [this.target(...visualSize), this.target(...visualSize)],
      sim: [this.target(...size, true, scene.simulation?.filter), this.target(...size, true, scene.simulation?.filter)],
      vi: 0,
      si: 0,
      time: 0,
      tick: 0,
      reset: true,
      visualReset: true,
      params: new Float32Array(8),
    };
    this.prepareSnapshot(slot, snapshot);
    if (scene.id === "melt") {
      const gl = this.gl;
      slot.geometry = new Float32Array(MELT_POINTS*MELT_ROWS*4);
      slot.geometryTexture = gl.createTexture();
      this.liveTextures++;
      gl.bindTexture(gl.TEXTURE_2D,slot.geometryTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,MELT_POINTS,MELT_ROWS,0,gl.RGBA,gl.FLOAT,null);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    }
    return slot;
  }
  load(snapshot, seconds = 2, opts = undefined) {
    const scene = this.scenes.find(s => s.id === snapshot.scene);
    if (!scene) throw new Error("Unknown scene");
    this.compileScene(scene);
    if (this.programs.get(scene.id)?.error) return false;
    this.flashExempt = opts?.flashExempt === true && seconds > 0 && this.slots.length > 0;
    if (this.lost) { this.active = structuredClone(snapshot); return; }
    if (this.slots.length > 1) {
      if (seconds > 0) {
        // Interrupt from the current ungraded mix, not the last incoming scene.
        // Reuse an existing back buffer; keep the largest available detail budget.
        const frozen =
          this.slots[0].visual[0].w >= this.slots[1].visual[0].w
            ? this.slots[0]
            : this.slots[1];
        this.present(frozen.visual[1 - frozen.vi], true);
        frozen.vi = 1 - frozen.vi;
        frozen.warmTicks = 0;
        frozen.frozen = true;
        this.destroySlot(
          this.slots[0] === frozen ? this.slots.pop() : this.slots.shift(),
        );
      } else this.destroySlot(this.slots.shift());
    }
    const slot = this.createSlot(snapshot);
    this.slots.push(slot);
    this.active = slot.snapshot;
    if (this.slots.length === 2 && seconds > 0)
      this.transition = { elapsed: 0, duration: seconds };
    else {
      while (this.slots.length > 1) this.destroySlot(this.slots.shift());
      this.transition = null;
      this.flashExempt = false;
    }
    this.accumulator = 0;
    this.gesture[2] = 0;
    slot.warmTicks = slot.scene.simulation ? 120 : 0;
    this.warmSlot(slot);
    this.drawSlot(slot, 1 / 60);
    this.present();
  }
  warmSlot(slot) {
    if (!this.checkScene(slot.scene.id)) return;
    const count = Math.min(6, slot.warmTicks);
    for (let i = 0; i < count; i++) this.tickSlot(slot, 1 / 60);
    slot.warmTicks -= count;
    if (count && !slot.warmTicks) slot.time = 0;
  }
  setSnapshot(snapshot) {
    const s = this.slots.at(-1);
    if (!s) { this.active = structuredClone(snapshot); return; }
    this.prepareSnapshot(s,snapshot);
    this.active = s.snapshot;
  }
  bind(program, target) {
    const gl = this.gl;
    gl.useProgram(program.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo || null);
    gl.viewport(0, 0, target?.w || this.width, target?.h || this.height);
  }
  updateUniforms(s) {
    if (s.uniformFrame === this.uniformFrame) return;
    for (let i=0;i<s.scene.schema.length;i++) {
      const def = s.scene.schema[i];
      let value = s.snapshot.params[def.key];
      for (const mapping of this.mappings || noMappings) {
        if (mapping.scene === s.scene.id && mapping.target === def.key) value += (this.features[mapping.source] ?? 0)*mapping.depth*(def.max-def.min);
      }
      value = this.finite(value,def.default);
      value = Math.min(def.max,Math.max(def.min,value));
      s.params[i] = def.step === 1 ? Math.round(value) : value;
    }
    s.uniformFrame = this.uniformFrame;
  }
  uniforms(program, s, target, dt, reset) {
    const gl = this.gl, u = program.uniforms;
    this.updateUniforms(s);
    if (u.u_resolution != null) gl.uniform2f(u.u_resolution,target.w,target.h);
    if (u.u_time != null) gl.uniform1f(u.u_time,this.finite(s.time));
    if (u.u_dt != null) gl.uniform1f(u.u_dt,this.finite(dt,1/60));
    if (u.u_seed != null) gl.uniform1f(u.u_seed,reduceSeed(this.finite(s.snapshot.seed)));
    if (u.u_seedBits != null) gl.uniform1ui(u.u_seedBits,this.finite(s.snapshot.seed) >>> 0);
    if (u.u_tick != null) gl.uniform1ui(u.u_tick,s.scene.simulation?s.tick:this.renderTick);
    if (u.u_raySteps != null) gl.uniform1f(u.u_raySteps,Math.max(16,Math.min(96,this.finite(this.rayStepBudget,96))));
    for (let i=0;i<featureKeys.length;i++) {
      const uniform = u[featureUniforms[i]];
      if (uniform != null) gl.uniform1f(uniform,this.finite(this.features[featureKeys[i]] ?? 0));
    }
    if (u.u_beat != null) gl.uniform1f(u.u_beat,this.finite(this.beat ?? 0)*(this.options.reducedMotion?.25:1));
    if (u.u_reset != null) gl.uniform1i(u.u_reset,reset?1:0);
    if (u.u_gesture != null) {
      for (let i=0;i<3;i++) this.gesture[i] = this.finite(this.gesture[i]);
      gl.uniform3fv(u.u_gesture,this.gesture);
    }
    for (let i=0;i<paletteKeys.length;i++) {
      if (u[paletteUniforms[i]] != null) {
        const color = s.colors[paletteKeys[i]];
        for (let channel=0;channel<3;channel++) color[channel] = this.finite(color[channel]);
        gl.uniform3fv(u[paletteUniforms[i]],color);
      }
    }
    if (u.u_params != null) gl.uniform1fv(u.u_params,s.params);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s.sim[s.si].texture);
    if (u.u_state != null) gl.uniform1i(u.u_state, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.visual[s.vi].texture);
    if (u.u_previous != null) gl.uniform1i(u.u_previous, 1);
    if (u.u_geometry != null) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D,s.geometryTexture);
      gl.uniform1i(u.u_geometry,2);
    }
  }
  tickSlot(s, dt) {
    if (s.frozen || !this.checkScene(s.scene.id)) return;
    const step = dt * (this.options.reducedMotion ? 0.25 : 1);
    s.time += step;
    const program = this.programs.get(s.scene.id).simulation;
    if (program) {
      for (let i = 0; i < (s.scene.simulation.steps || 1); i++) {
        s.tick = (s.tick+1) >>> 0;
        const target = s.sim[1 - s.si];
        this.bind(program, target);
        this.uniforms(program, s, target, step, s.reset);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        s.si = 1 - s.si;
        s.reset = false;
      }
    }
  }
  drawSlot(s, dt) {
    if (s.frozen || !this.checkScene(s.scene.id)) return;
    if (s.geometry) {
      this.updateUniforms(s);
      updateMeltGeometry(s.params,s.time,s.geometry);
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D,s.geometryTexture);
      gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,MELT_POINTS,MELT_ROWS,gl.RGBA,gl.FLOAT,s.geometry);
    }
    const target = s.visual[1 - s.vi],
      program = this.programs.get(s.scene.id).visual;
    this.bind(program, target);
    this.uniforms(
      program,
      s,
      target,
      dt * (this.options.reducedMotion ? 0.25 : 1),
      s.visualReset,
    );
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    s.vi = 1 - s.vi;
    s.visualReset = false;
  }
  advance(dt, paused = false) {
    if (this.lost || !this.slots.length) return;
    try {
      this.uniformFrame++;
      this.renderTick = (this.renderTick+1) >>> 0;
      // Emergency black must not wait for either smoothing or a GPU mean.
      if (this.blackoutTarget > 0) this.blackout = 1;
      else {
        this.blackout *= 1-Math.min(1,dt*12);
        if (this.blackout < 1/255) this.blackout = 0;
      }
      const incoming = this.slots.at(-1);
      const preparing = incoming.warmTicks > 0;
      if (preparing) this.warmSlot(incoming);
      if (!paused) {
        this.accumulator += Math.min(0.1, dt);
        let n = 0;
        while (this.accumulator >= 1 / 60 - 1e-9 && n++ < 6) {
          this.time += 1 / 60;
          for (const s of this.slots)
            if (s !== incoming || !preparing) this.tickSlot(s, 1 / 60);
          if (this.transition && !this.transition.manual && !preparing) {
            this.transition.elapsed += 1 / 60;
            if (this.transition.elapsed >= this.transition.duration) {
              this.destroySlot(this.slots.shift());
              this.transition = null;
              this.flashExempt = false;
            }
          }
          this.accumulator = Math.max(0, this.accumulator - 1 / 60);
        }
        for (const s of this.slots) this.drawSlot(s, Math.min(0.1, dt));
        if (n > 0) this.gesture[2] = 0;
      } else if (preparing) this.drawSlot(incoming, 1 / 60);
      this.present();
      this.frames[this.frameCursor++ % this.frames.length] = dt * 1000;
      this.frameCount++;
      this.pollHealth();
      const now = performance.now();
      if (now-this.lastErrorSample >= 1000) {
        this.lastErrorSample = now;
        if (this.gl.getError() !== this.gl.NO_ERROR) this.counters.gpuErrors++;
      }
    } catch (e) {
      this.onError(e.message);
      throw e;
    }
  }
  present(target = null, raw = false) {
    if (this.lost || !this.slots.length) return;
    if (!this.transition) this.flashExempt = false;
    this.pipeline.present(target,raw);
  }
  pollHealth() {
    const pixels = this.healthReadback.poll();
    if (!pixels) return;
    let sum=0,squares=0;
    for (let i=0;i<pixels.length;i+=4) {
      const value=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
      sum+=value;squares+=value*value;
    }
    this.lastHealth.mean=sum/(64*36);
    this.lastHealth.variance=squares/(64*36)-this.lastHealth.mean*this.lastHealth.mean;
    this.lastHealth.pending=false;
  }
  health() {
    if (this.lost) return this.lastHealth;
    this.pollHealth();
    const gl = this.gl;
    if (!this.healthReadback.sync) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,null);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.healthTarget.fbo);
      gl.blitFramebuffer(0,0,this.width,this.height,0,0,64,36,gl.COLOR_BUFFER_BIT,gl.LINEAR);
      this.healthReadback.begin(this.healthTarget);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    return this.lastHealth;
  }
  stats() {
    const a = Array.from(
      this.frames.subarray(0, Math.min(this.frameCount, this.frames.length)),
    ).sort((x, y) => x - y);
    return {
      frames: this.frameCount,
      median: a[Math.floor(a.length * 0.5)] || 0,
      p95: a[Math.floor(a.length * 0.95)] || 0,
      slots: this.slots.length,
      textures: this.slots.reduce(
        (n, s) => n + s.visual.length + s.sim.length + (s.geometryTexture?1:0),
        1 + this.pipeline.targets.length,
      ),
      liveTextures: this.liveTextures,
    };
  }
  dispose() {
    this.disposed = true;
    this.compileGeneration++;
    this.healthReadback.dispose();
    for (const s of this.slots) this.destroySlot(s);
    this.deleteTarget(this.healthTarget);
    for (const p of this.programs.values()) {
      if (p.visual?.p) this.gl.deleteProgram(p.visual.p);
      if (p.simulation?.p) this.gl.deleteProgram(p.simulation.p);
    }
    this.pipeline.dispose();
    this.gl.deleteBuffer(this.quad);
    this.gl.deleteVertexArray(this.vao);
    this.slots = [];
  }
}
