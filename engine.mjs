import { shaderHeader } from "./scene-contract.mjs";
const vertex = `#version 300 es
in vec2 position; out vec2 v_uv;
void main(){v_uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const composite = `#version 300 es
precision highp float; in vec2 v_uv; out vec4 outColor;
uniform sampler2D a,b; uniform float mixAmount,brightness,blackout,bloom,kaleido; uniform vec2 resolution;
void main(){vec2 uv=v_uv; if(kaleido>1.){vec2 p=uv-.5;p.x*=resolution.x/resolution.y;float r=length(p), angle=atan(p.y,p.x), sector=6.2831853/kaleido;angle=abs(mod(angle+sector*.5,sector)-sector*.5);p=r*vec2(cos(angle),sin(angle));p.x*=resolution.y/resolution.x;uv=p+.5;}vec3 c=mix(texture(a,uv).rgb,texture(b,uv).rgb,mixAmount);vec3 glow=vec3(0.);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 q=uv+vec2(float(x),float(y))*3./resolution;glow+=mix(texture(a,q).rgb,texture(b,q).rgb,mixAmount);}c+=max(glow/9.-.4,0.)*bloom;outColor=vec4(clamp(c*brightness*(1.-blackout),0.,1.),1.);}`;
export class Engine {
  constructor(canvas, scenes, onError = () => {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });
    if (!this.gl)
      throw new Error(
        "WebGL2 is required. Use current desktop Chrome or Edge.",
      );
    this.scenes = scenes;
    this.onError = onError;
    this.programs = new Map();
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
    };
    this.gesture = [0.5, 0.5, 0];
    this.blackout = 0;
    this.blackoutTarget = 0;
    this.lost = false;
    this.frames = new Float32Array(1800);
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
    this.programs.clear();
    this.slots = [];
    this.transition = null;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    this.compositor = this.program(composite);
    for (const scene of this.scenes) {
      this.programs.set(scene.id, {
        visual: this.program(shaderHeader + scene.fragment),
        simulation: scene.simulation
          ? this.program(shaderHeader + scene.simulation.fragment)
          : null,
      });
    }
    this.resize(this.width, this.height);
    this.healthTarget = this.target(64, 36);
    this.healthPixels = new Uint8Array(64 * 36 * 4);
  }
  program(source) {
    const gl = this.gl;
    const compile = (type, text) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, text);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(s);
        gl.deleteShader(s);
        throw new Error(error);
      }
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vertex),
      f = compile(gl.FRAGMENT_SHADER, source),
      p = gl.createProgram();
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(p));
    const uniforms = {};
    for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) {
      const name = gl.getActiveUniform(p, i).name;
      uniforms[name.replace("[0]", "")] = gl.getUniformLocation(p, name);
    }
    return { p, uniforms };
  }
  target(w, h, simulation = false) {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
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
      simulation ? gl.NEAREST : gl.LINEAR,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      simulation ? gl.NEAREST : gl.LINEAR,
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
    this.gl.deleteFramebuffer(t.fbo);
  }
  destroySlot(s) {
    for (const t of [...s.visual, ...s.sim]) this.deleteTarget(t);
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
    s.snapshot = structuredClone(snapshot);
    s.colors = Object.fromEntries(
      Object.entries(snapshot.palette).map(([key, value]) => [
        key,
        new Float32Array(
          value
            .slice(1)
            .match(/../g)
            .map((x) => parseInt(x, 16) / 255),
        ),
      ]),
    );
  }
  createSlot(snapshot) {
    const scene = this.scenes.find((s) => s.id === snapshot.scene);
    if (!scene) throw new Error("Unknown scene");
    const size = scene.simulation?.size || [1, 1];
    const visualSize = this.visualSize(scene);
    const slot = {
      scene,
      visual: [this.target(...visualSize), this.target(...visualSize)],
      sim: [this.target(...size, true), this.target(...size, true)],
      vi: 0,
      si: 0,
      time: 0,
      reset: true,
      visualReset: true,
      params: new Float32Array(8),
    };
    this.prepareSnapshot(slot, snapshot);
    return slot;
  }
  load(snapshot, seconds = 2) {
    this.active = structuredClone(snapshot);
    if (this.lost) return;
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
    if (this.slots.length === 2 && seconds > 0)
      this.transition = { elapsed: 0, duration: seconds };
    else {
      while (this.slots.length > 1) this.destroySlot(this.slots.shift());
      this.transition = null;
    }
    this.accumulator = 0;
    this.gesture[2] = 0;
    slot.warmTicks = slot.scene.simulation ? 120 : 0;
    this.warmSlot(slot);
    this.drawSlot(slot, 1 / 60);
    this.present();
  }
  warmSlot(slot) {
    const count = Math.min(6, slot.warmTicks);
    for (let i = 0; i < count; i++) this.tickSlot(slot, 1 / 60);
    slot.warmTicks -= count;
    if (count && !slot.warmTicks) slot.time = 0;
  }
  setSnapshot(snapshot) {
    this.active = structuredClone(snapshot);
    const s = this.slots.at(-1);
    if (s) this.prepareSnapshot(s, snapshot);
  }
  bind(program, target) {
    const gl = this.gl;
    gl.useProgram(program.p);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const p = gl.getAttribLocation(program.p, "position");
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.fbo || null);
    gl.viewport(0, 0, target?.w || this.width, target?.h || this.height);
  }
  uniforms(program, s, target, dt, reset) {
    const gl = this.gl,
      u = program.uniforms;
    const f = (k, v) => {
      if (u[k] != null) gl.uniform1f(u[k], v);
    };
    if (u.u_resolution != null)
      gl.uniform2f(u.u_resolution, target.w, target.h);
    f("u_time", s.time);
    f("u_dt", dt);
    f("u_seed", s.snapshot.seed);
    if (u.u_seedBits != null) gl.uniform1ui(u.u_seedBits, s.snapshot.seed);
    for (const k of ["energy", "bass", "mid", "high", "onset"])
      f("u_" + k, this.features[k] || 0);
    f("u_beat", (this.beat || 0) * (this.options.reducedMotion ? 0.25 : 1));
    if (u.u_reset != null) gl.uniform1i(u.u_reset, reset ? 1 : 0);
    if (u.u_gesture != null) gl.uniform3fv(u.u_gesture, this.gesture);
    for (const key in s.colors)
      if (u["u_" + key] != null) gl.uniform3fv(u["u_" + key], s.colors[key]);
    for (let i = 0; i < s.scene.schema.length; i++) {
      const def = s.scene.schema[i];
      let value = s.snapshot.params[def.key];
      for (const mapping of this.mappings || []) {
        if (mapping.scene === s.scene.id && mapping.target === def.key)
          value +=
            (this.features[mapping.source] || 0) *
            mapping.depth *
            (def.max - def.min);
      }
      value = Math.min(def.max, Math.max(def.min, value));
      s.params[i] = def.step === 1 ? Math.round(value) : value;
    }
    if (u.u_params != null) gl.uniform1fv(u.u_params, s.params);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s.sim[s.si].texture);
    if (u.u_state != null) gl.uniform1i(u.u_state, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.visual[s.vi].texture);
    if (u.u_previous != null) gl.uniform1i(u.u_previous, 1);
  }
  tickSlot(s, dt) {
    if (s.frozen) return;
    const step = dt * (this.options.reducedMotion ? 0.25 : 1);
    s.time += step;
    const program = this.programs.get(s.scene.id).simulation;
    if (program) {
      for (let i = 0; i < (s.scene.simulation.steps || 1); i++) {
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
    if (s.frozen) return;
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
      this.blackout +=
        (this.blackoutTarget - this.blackout) * Math.min(1, dt * 12);
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
    } catch (e) {
      this.onError(e.message);
      throw e;
    }
  }
  present(target = null, raw = false) {
    if (this.lost || !this.slots.length) return;
    const gl = this.gl,
      p = this.compositor;
    this.bind(p, target);
    const u = p.uniforms;
    const first = this.slots[0],
      last = this.slots.at(-1);
    for (const [key, unit, s] of [
      ["a", 0, first],
      ["b", 1, last],
    ]) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, s.visual[s.vi].texture);
      gl.uniform1i(u[key], unit);
    }
    gl.uniform1f(
      u.mixAmount,
      this.transition
        ? Math.min(1, this.transition.elapsed / this.transition.duration)
        : 1,
    );
    gl.uniform1f(u.brightness, raw ? 1 : this.options.brightness);
    gl.uniform1f(u.blackout, raw ? 0 : this.blackout);
    gl.uniform1f(u.bloom, raw ? 0 : this.options.bloom);
    gl.uniform1f(u.kaleido, raw ? 1 : this.options.kaleido);
    gl.uniform2f(u.resolution, this.width, this.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  health() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.healthTarget.fbo);
    gl.blitFramebuffer(
      0,
      0,
      this.width,
      this.height,
      0,
      0,
      64,
      36,
      gl.COLOR_BUFFER_BIT,
      gl.LINEAR,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.healthTarget.fbo);
    gl.readPixels(0, 0, 64, 36, gl.RGBA, gl.UNSIGNED_BYTE, this.healthPixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    let sum = 0,
      squares = 0;
    for (let i = 0; i < this.healthPixels.length; i += 4) {
      const v =
        (this.healthPixels[i] +
          this.healthPixels[i + 1] +
          this.healthPixels[i + 2]) /
        3;
      sum += v;
      squares += v * v;
    }
    const mean = sum / (64 * 36);
    return { mean, variance: squares / (64 * 36) - mean * mean };
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
        (n, s) => n + s.visual.length + s.sim.length,
        1,
      ),
    };
  }
  dispose() {
    for (const s of this.slots) this.destroySlot(s);
    this.deleteTarget(this.healthTarget);
    for (const p of this.programs.values()) {
      this.gl.deleteProgram(p.visual.p);
      if (p.simulation) this.gl.deleteProgram(p.simulation.p);
    }
    this.gl.deleteProgram(this.compositor.p);
    this.gl.deleteBuffer(this.quad);
    this.gl.deleteVertexArray(this.vao);
    this.slots = [];
  }
}
