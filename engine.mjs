import {
  shaderHeader,
  reduceSeed,
  particleHeader,
  particleFragment,
  AUDIO_MAPPING_CAP,
} from "./scene-contract.mjs";
import { Compositor, AsyncReadback } from "./compositor.mjs";
import {
  MELT_POINTS,
  MELT_ROWS,
  updateMeltGeometry,
} from "./melt-geometry.mjs";
const featureKeys = ["energy", "low", "mid", "high", "onset", "flux"];
const featureUniforms = [
  "u_energy",
  "u_low",
  "u_mid",
  "u_high",
  "u_onset",
  "u_flux",
];
const paletteKeys = ["primary", "secondary", "accent"];
const paletteUniforms = ["u_primary", "u_secondary", "u_accent"];
const noAudioMappings = [];
const programKeys = ["visual", "simulation", "particles"];
const vertex = `#version 300 es
layout(location=0) in vec2 position; out vec2 v_uv;
void main(){v_uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export class Engine {
  constructor(canvas, scenes, onError = () => {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      // The control preview (captureStream) and clip thumbnails read the
      // canvas after the frame has been presented.
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
    this.features = {
      energy: 0,
      low: 0,
      mid: 0,
      high: 0,
      onset: 0,
      flux: 0,
      hit: false,
      hitId: 0,
      active: false,
      locked: false,
    };
    this.audioHeld = new Float32Array(featureKeys.length);
    this.audioFeatures = {};
    this.audioMix = this.audioWeight = 0;
    this.lastAudioHit = 0;
    this.kick = 0;
    this.options = {
      brightness: 0.92,
      bloom: 0.15,
      kaleido: 1,
      reducedMotion: false,
      flashLimit: true,
      echo: 0,
      chroma: 0,
      grain: 0.12,
      vignette: 0.15,
    };
    this.gesture = [0.5, 0.5, 0];
    // Contract v3 performance state (decisions D17, D27-D29): live energy
    // level with ramps, tempo-relative speed, view transform and the shared
    // beat responses every family receives.
    this.level = 0.5;
    this.levelFrom = this.levelTo = 0.5;
    this.levelElapsed = this.levelDuration = 0;
    this.speed = 1;
    this.view = { hue: 0, zoom: 1 };
    this.flashHeld = false;
    this.beatFx = { punch: 0, pulse: 0, flash: 0 };
    this.lastKickBeat = null;
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
    // OES_texture_half_float_linear is core in WebGL2 (unlike float32
    // filtering). EXT_color_buffer_float adds the renderable RGBA16F format.
    this.floatPicture = !!gl.getExtension("EXT_color_buffer_float");
    this.pictureHeader = this.floatPicture
      ? shaderHeader.replace(
          "outColor = quantize8(value);",
          // Capped well below half-float max so bloom/shoulder never see Inf.
          "outColor = vec4(min(max(value.rgb, vec3(0.)), vec3(64.)), clamp(value.a, 0., 1.));",
        )
      : shaderHeader;
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
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.pipeline = new Compositor(this);
    this.compositor = this.pipeline.program;
    this.healthReadback = new AsyncReadback(gl, 64 * 36 * 4);
    // A restored context must never cancel the previous context's health fence.
    this.resize(this.width, this.height);
    this.healthTarget = this.target(64, 36, { bytes: true });
    this.lastHealth = { mean: NaN, variance: NaN, pending: true };
    const activeId = this.active?.scene || this.scenes[0]?.id;
    if (activeId) this.compileScene(this.scenes.find((s) => s.id === activeId));
    let index = 0;
    const background = () => {
      if (generation !== this.compileGeneration || this.disposed || this.lost)
        return;
      while (
        index < this.scenes.length &&
        this.programs.has(this.scenes[index].id)
      )
        index++;
      if (index === this.scenes.length) return;
      this.compileScene(this.scenes[index++]);
      if (window.requestIdleCallback) window.requestIdleCallback(background);
      else setTimeout(background, 0);
    };
    if (window.requestIdleCallback) window.requestIdleCallback(background);
    else setTimeout(background, 0);
  }
  program(source, deferred = false, vertexSource = vertex) {
    const gl = this.gl;
    const v = gl.createShader(gl.VERTEX_SHADER),
      f = gl.createShader(gl.FRAGMENT_SHADER),
      p = gl.createProgram();
    gl.shaderSource(v, vertexSource);
    gl.compileShader(v);
    gl.shaderSource(f, source);
    gl.compileShader(f);
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    gl.deleteShader(v);
    gl.deleteShader(f);
    const result = { p, uniforms: null };
    if (!deferred) this.finishProgram(result);
    return result;
  }
  finishProgram(program) {
    const gl = this.gl;
    if (!gl.getProgramParameter(program.p, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program.p);
      gl.deleteProgram(program.p);
      program.p = null;
      throw new Error(message);
    }
    program.uniforms = {};
    for (
      let i = 0;
      i < gl.getProgramParameter(program.p, gl.ACTIVE_UNIFORMS);
      i++
    ) {
      const name = gl.getActiveUniform(program.p, i).name;
      program.uniforms[name.replace("[0]", "")] = gl.getUniformLocation(
        program.p,
        name,
      );
    }
  }
  compileScene(scene) {
    if (!scene || this.programs.has(scene.id)) return;
    const programs = {
      visual: null,
      simulation: null,
      particles: null,
      error: null,
    };
    this.programs.set(scene.id, programs);
    try {
      // Previous-frame families were authored against byte-quantized returns.
      // Keep their bounded/decaying emission, even in float storage, rather
      // than letting sub-byte residue change their feedback attractor.
      const header = scene.fragment.includes("u_previous")
        ? shaderHeader
        : this.pictureHeader;
      programs.visual = this.program(header + scene.fragment, true);
      if (scene.simulation)
        programs.simulation = this.program(
          shaderHeader + scene.simulation.fragment,
          true,
        );
      // Contract v3 particles: one point per simulation texel, drawn
      // additively over the family's visual pass.
      if (scene.particles)
        programs.particles = this.program(
          scene.particles.fragment ?? particleFragment,
          true,
          particleHeader + scene.particles.vertex,
        );
      this.checkScene(scene.id);
    } catch (error) {
      programs.error = error.message;
      this.onError(`${scene.name} disabled: ${error.message}`, scene.id);
    }
  }
  checkScene(id) {
    const programs = this.programs.get(id);
    if (!programs || programs.error) return false;
    try {
      for (const name of programKeys) {
        const p = programs[name];
        if (!p || p.uniforms) continue;
        if (
          this.parallelCompile &&
          !this.gl.getProgramParameter(
            p.p,
            this.parallelCompile.COMPLETION_STATUS_KHR,
          )
        )
          return false;
        this.finishProgram(p);
      }
      return true;
    } catch (error) {
      programs.error = error.message;
      for (const name of programKeys) {
        if (programs[name]?.p) this.gl.deleteProgram(programs[name].p);
        if (programs[name]) programs[name].p = null;
      }
      this.onError(`${id} disabled: ${error.message}`, id);
      return false;
    }
  }
  // Resolves true once the family's programs are compiled and linked.
  async ready(id) {
    if (this.disposed || this.lost || this.gl.isContextLost()) return false;
    this.compileScene(this.scenes.find((s) => s.id === id));
    while (!this.disposed && !this.lost && !this.gl.isContextLost()) {
      if (this.checkScene(id)) return true;
      if (this.programs.get(id)?.error || !this.programs.has(id)) return false;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return false;
  }
  setLevel(value, seconds = 0) {
    value = Math.max(0, Math.min(1, this.finite(value, this.level)));
    this.levelFrom = this.level;
    this.levelTo = value;
    this.levelElapsed = 0;
    this.levelDuration = Math.max(0, this.finite(seconds, 0));
    if (!(this.levelDuration > 0)) this.level = value;
  }
  // Retain the last trusted features during dropout: multiplying today's
  // zero samples by a fading gain would still snap every response to zero.
  updateAudio(dt, calm = false) {
    const features = this.features;
    const available = !!features?.active && !!features?.locked && !calm;
    this.audioHeld ??= new Float32Array(featureKeys.length);
    this.audioFeatures ??= {};
    const mix = this.audioMix ?? 0;
    this.audioMix = available
      ? Math.min(1, mix + dt / 0.25)
      : Math.max(0, mix - dt / 2);
    const weight = this.audioMix * this.audioMix * (3 - 2 * this.audioMix);
    this.audioWeight = weight;
    for (let i = 0; i < featureKeys.length; i++) {
      const key = featureKeys[i];
      if (available) {
        const v = Math.max(0, Math.min(1, this.finite(features[key] ?? 0)));
        // Re-locking mid-fade glides from the held value instead of
        // stepping the raw uniforms and bloom lift in one frame.
        this.audioHeld[i] =
          weight < 1
            ? this.audioHeld[i] +
              (v - this.audioHeld[i]) * (1 - Math.exp(-dt / 0.04))
            : v;
      }
      this.audioFeatures[key] = this.audioHeld[i] * weight;
    }
    const hit =
      available && features.hit && features.hitId !== this.lastAudioHit;
    this.lastAudioHit = features?.hitId ?? 0;
    this.audioFeatures.hit = hit ? weight : 0;
    for (const slot of this.slots) {
      const mappings = slot.scene.audio ?? noAudioMappings;
      slot.audioOffsets ??= new Float32Array(Math.min(3, mappings.length));
      for (let i = 0; i < Math.min(3, mappings.length); i++) {
        const mapping = mappings[i];
        const amount = Math.max(
          -AUDIO_MAPPING_CAP,
          Math.min(AUDIO_MAPPING_CAP, this.finite(mapping.amount)),
        );
        const target = (this.audioFeatures[mapping.feature] ?? 0) * amount;
        const value = slot.audioOffsets[i];
        const tau = Math.abs(target) > Math.abs(value) ? 0.04 : 0.18;
        slot.audioOffsets[i] =
          value + (target - value) * (1 - Math.exp(-dt / tau));
      }
    }
  }
  // Energy ramp, audio/clock kick envelopes, flashes and beat injection.
  // Losing source or tracker lock crossfades back to the speed-trimmed clock
  // over two seconds; reduced motion and freeze disable beat responses.
  updatePerformance(dt, paused) {
    if (this.levelDuration > 0 && this.level !== this.levelTo) {
      this.levelElapsed += dt;
      const t = Math.min(1, this.levelElapsed / this.levelDuration);
      this.level = this.levelFrom + (this.levelTo - this.levelFrom) * t;
    }
    const scene = this.slots.at(-1)?.scene;
    const weights = { punch: 1, pulse: 1, inject: 0, ...(scene?.beat || {}) };
    const calm = this.options.reducedMotion || paused;
    const x = Math.max(0, Math.min(1, (this.level - 0.15) / 0.85));
    const response = calm ? 0 : x * x * (3 - 2 * x);
    this.updateAudio(dt, calm);
    const kickBeat = this.finite(this.beat ?? 0) * this.speed;
    const phase = kickBeat - Math.floor(kickBeat);
    const clockKick = Math.exp(-phase * 7);
    const kick =
      clockKick * (1 - this.audioWeight) +
      Math.max(this.audioFeatures.low, this.audioFeatures.onset * 0.5);
    this.kick = calm ? 0 : kick;
    this.beatFx.punch = 0.06 * weights.punch * response * kick;
    this.beatFx.pulse = 0.35 * weights.pulse * response * kick;
    const auto = Math.max(0, (this.level - 0.8) / 0.2) * 0.5;
    this.beatFx.flash = calm
      ? 0
      : Math.max(this.flashHeld ? 1 : 0, auto) *
        (Math.exp(-phase * 10) * (1 - this.audioWeight) +
          this.audioFeatures.onset);
    const index = Math.floor(kickBeat);
    const clockHit = index !== this.lastKickBeat && this.lastKickBeat !== null;
    const impulse =
      (clockHit ? 1 - this.audioWeight : 0) + this.audioFeatures.hit;
    if (impulse > 0 && weights.inject > 0 && response > 0) {
      const event = index + this.lastAudioHit;
      const h = Math.sin(event * 12.9898) * 43758.5453,
        k = Math.sin(event * 78.233) * 12543.123;
      this.gesture[0] = 0.2 + 0.6 * (h - Math.floor(h));
      this.gesture[1] = 0.2 + 0.6 * (k - Math.floor(k));
      this.gesture[2] = Math.min(1, impulse) * weights.inject * response;
    }
    this.lastKickBeat = index;
  }
  finite(value, fallback = 0) {
    if (Number.isFinite(value)) return value;
    this.counters.nonFinite++;
    return fallback;
  }
  target(w, h, { simulation = false, filter = "nearest", bytes = false } = {}) {
    const gl = this.gl;
    const floating = this.floatPicture && !simulation && !bytes;
    const texture = gl.createTexture();
    this.liveTextures++;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      // Never SRGB8_ALPHA8: state is byte data and scenes author display-encoded
      // palettes. Float pictures extend precision/range, not colour semantics.
      // The limiter alone measures/applies linear light.
      floating ? gl.RGBA16F : gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      floating ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
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
    return { texture, fbo, w, h, floating };
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
    let w = this.width,
      h = this.height;
    // Fixed-aspect families (simulations authored for 16:9) render a frame
    // of their own aspect that covers the screen; the compositor crops it
    // (D7). Other families compose natively at the screen's aspect.
    if (scene.aspect) {
      if (w / h > scene.aspect) h = w / scene.aspect;
      else w = h * scene.aspect;
    }
    // Shade at output resolution; only the GPU texture limit may constrain it.
    const limit = this.gl?.getParameter(this.gl.MAX_TEXTURE_SIZE) ?? Infinity;
    const scale = Math.min(1, limit / w, limit / h);
    return [
      Math.max(1, Math.round(w * scale)),
      Math.max(1, Math.round(h * scale)),
    ];
  }
  resize(w, h) {
    const gl = this.gl;
    this.width = w;
    this.height = h;
    // Quality changes must not inherit timing samples from a different budget.
    this.frameCursor = 0;
    this.frameCount = 0;
    if (this.lost || gl.isContextLost()) return;
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
    if (this.slots.length) this.present();
  }
  prepareSnapshot(s, snapshot) {
    const previous = s.snapshot;
    if (
      !previous ||
      previous.scene !== snapshot.scene ||
      previous.preset !== snapshot.preset ||
      previous.seed !== snapshot.seed
    ) {
      s.snapshot = structuredClone(snapshot);
    } else {
      for (let i = 0; i < s.scene.schema.length; i++) {
        const key = s.scene.schema[i].key;
        previous.params[key] = snapshot.params[key];
      }
      for (let i = 0; i < paletteKeys.length; i++) {
        const key = paletteKeys[i];
        previous.palette[key] = snapshot.palette[key];
      }
    }
    if (!s.colors) {
      s.colors = {};
      s.colorStrings = {};
    }
    for (let i = 0; i < paletteKeys.length; i++) {
      const key = paletteKeys[i],
        text = s.snapshot.palette[key];
      if (s.colorStrings[key] === text) continue;
      let color = this.paletteCache.get(text);
      if (!color) {
        color = new Float32Array(3);
        for (let channel = 0; channel < 3; channel++)
          color[channel] =
            parseInt(text.slice(1 + channel * 2, 3 + channel * 2), 16) / 255;
        if (this.paletteCache.size >= 256)
          this.paletteCache.delete(this.paletteCache.keys().next().value);
        this.paletteCache.set(text, color);
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
    const stateOptions = { simulation: true, filter: scene.simulation?.filter };
    const slot = {
      scene,
      visual: [this.target(...visualSize), this.target(...visualSize)],
      sim: [
        this.target(...size, stateOptions),
        this.target(...size, stateOptions),
      ],
      vi: 0,
      si: 0,
      time: 0,
      tick: 0,
      reset: true,
      visualReset: true,
      params: new Float32Array(8),
      audioOffsets: new Float32Array(Math.min(3, scene.audio?.length ?? 0)),
    };
    this.prepareSnapshot(slot, snapshot);
    if (scene.id === "melt") {
      const gl = this.gl;
      slot.geometry = new Float32Array(MELT_POINTS * MELT_ROWS * 4);
      slot.geometryTexture = gl.createTexture();
      this.liveTextures++;
      gl.bindTexture(gl.TEXTURE_2D, slot.geometryTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA32F,
        MELT_POINTS,
        MELT_ROWS,
        0,
        gl.RGBA,
        gl.FLOAT,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    return slot;
  }
  load(snapshot, seconds = 2, opts = undefined) {
    const scene = this.scenes.find((s) => s.id === snapshot.scene);
    if (!scene) throw new Error("Unknown scene");
    this.compileScene(scene);
    if (this.programs.get(scene.id)?.error) return false;
    if (opts?.transition === "cut") seconds = 0;
    this.flashExempt =
      opts?.flashExempt === true && seconds > 0 && this.slots.length > 0;
    if (this.lost) {
      this.active = structuredClone(snapshot);
      return;
    }
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
    slot.baseLevel = Number.isFinite(opts?.energy) ? opts.energy : this.level;
    this.slots.push(slot);
    this.active = slot.snapshot;
    if (this.slots.length === 2 && seconds > 0) {
      this.transition = {
        elapsed: 0,
        duration: seconds,
        kind:
          opts?.transition === "dissolve" || opts?.transition === "melt"
            ? opts.transition
            : "crossfade",
      };
      // Melt transports a captured outgoing picture; shading or simulating
      // that old family again cannot affect its feedback history.
      if (this.transition.kind === "melt") {
        this.slots[0].frozen = true;
        this.slots[0].warmTicks = 0;
      }
    } else {
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
    if (!s) {
      this.active = structuredClone(snapshot);
      return;
    }
    this.prepareSnapshot(s, snapshot);
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
    for (let i = 0; i < s.scene.schema.length; i++) {
      const def = s.scene.schema[i];
      let value = s.snapshot.params[def.key];
      // Energy curve: move from the clip's own base energy along the family's
      // declared slope, so a clip keeps its character at its own energy.
      const curve = s.scene.energy?.[def.key];
      if (curve) {
        const base = s.baseLevel ?? this.level;
        if (Array.isArray(curve))
          value += (curve[1] - curve[0]) * (this.level - base);
        else if (curve.mul) {
          const [a, b] = curve.mul;
          value *= (a + (b - a) * this.level) / (a + (b - a) * base);
        }
      }
      const mappings = s.scene.audio ?? noAudioMappings;
      for (let j = 0; j < Math.min(3, mappings.length); j++)
        if (mappings[j].param === def.key)
          value += (s.audioOffsets?.[j] ?? 0) * (def.max - def.min);
      value = this.finite(value, def.default);
      value = Math.min(def.max, Math.max(def.min, value));
      s.params[i] = def.step === 1 ? Math.round(value) : value;
    }
    s.uniformFrame = this.uniformFrame;
  }
  uniforms(program, s, target, dt, reset) {
    const gl = this.gl,
      u = program.uniforms;
    this.updateUniforms(s);
    if (u.u_resolution != null)
      gl.uniform2f(u.u_resolution, target.w, target.h);
    if (u.u_time != null) gl.uniform1f(u.u_time, this.finite(s.time));
    if (u.u_dt != null) gl.uniform1f(u.u_dt, this.finite(dt, 1 / 60));
    if (u.u_seed != null)
      gl.uniform1f(u.u_seed, reduceSeed(this.finite(s.snapshot.seed)));
    if (u.u_seedBits != null)
      gl.uniform1ui(u.u_seedBits, this.finite(s.snapshot.seed) >>> 0);
    if (u.u_tick != null)
      gl.uniform1ui(u.u_tick, s.scene.simulation ? s.tick : this.renderTick);
    if (u.u_raySteps != null)
      gl.uniform1f(
        u.u_raySteps,
        Math.max(16, Math.min(96, this.finite(this.rayStepBudget, 96))),
      );
    for (let i = 0; i < featureKeys.length; i++) {
      const uniform = u[featureUniforms[i]];
      if (uniform != null)
        gl.uniform1f(
          uniform,
          this.finite(this.audioFeatures?.[featureKeys[i]] ?? 0),
        );
    }
    if (u.u_bass != null)
      gl.uniform1f(u.u_bass, this.finite(this.audioFeatures?.low ?? 0));
    if (u.u_hit != null)
      gl.uniform1f(u.u_hit, this.finite(this.audioFeatures?.hit ?? 0));
    if (u.u_kick != null) gl.uniform1f(u.u_kick, this.finite(this.kick));
    if (u.u_beat != null)
      gl.uniform1f(
        u.u_beat,
        this.finite(this.beat ?? 0) * (this.options.reducedMotion ? 0.25 : 1),
      );
    if (u.u_level != null)
      gl.uniform1f(u.u_level, this.finite(this.level, 0.5));
    if (u.u_reset != null) gl.uniform1i(u.u_reset, reset ? 1 : 0);
    if (u.u_gesture != null) {
      for (let i = 0; i < 3; i++)
        this.gesture[i] = this.finite(this.gesture[i]);
      gl.uniform3fv(u.u_gesture, this.gesture);
    }
    for (let i = 0; i < paletteKeys.length; i++) {
      if (u[paletteUniforms[i]] != null) {
        const color = s.colors[paletteKeys[i]];
        for (let channel = 0; channel < 3; channel++)
          color[channel] = this.finite(color[channel]);
        gl.uniform3fv(u[paletteUniforms[i]], color);
      }
    }
    if (u.u_params != null) gl.uniform1fv(u.u_params, s.params);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, s.sim[s.si].texture);
    if (u.u_state != null) gl.uniform1i(u.u_state, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.visual[s.vi].texture);
    if (u.u_previous != null) gl.uniform1i(u.u_previous, 1);
    if (u.u_geometry != null) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, s.geometryTexture);
      gl.uniform1i(u.u_geometry, 2);
    }
  }
  tickSlot(s, dt) {
    if (s.frozen || !this.checkScene(s.scene.id)) return;
    const step = dt * (this.options.reducedMotion ? 0.25 : 1);
    s.time += step;
    const program = this.programs.get(s.scene.id).simulation;
    if (program) {
      for (let i = 0; i < (s.scene.simulation.steps || 1); i++) {
        s.tick = (s.tick + 1) >>> 0;
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
      updateMeltGeometry(s.params, s.time, s.geometry);
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, s.geometryTexture);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        MELT_POINTS,
        MELT_ROWS,
        gl.RGBA,
        gl.FLOAT,
        s.geometry,
      );
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
    const particles = this.programs.get(s.scene.id).particles;
    if (particles?.uniforms) {
      const gl = this.gl;
      this.bind(particles, target);
      this.uniforms(particles, s, target, dt, false);
      const [w, h] = s.scene.simulation.size;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      // Points need no vertex attributes; the quad's array would be overrun.
      gl.disableVertexAttribArray(0);
      gl.drawArrays(gl.POINTS, 0, w * h);
      gl.enableVertexAttribArray(0);
      gl.disable(gl.BLEND);
    }
    s.vi = 1 - s.vi;
    s.visualReset = false;
  }
  advance(dt, paused = false) {
    if (this.lost || this.gl.isContextLost() || !this.slots.length) return;
    try {
      this.uniformFrame++;
      this.renderTick = (this.renderTick + 1) >>> 0;
      // Emergency black must not wait for either smoothing or a GPU mean.
      if (this.blackoutTarget > 0) this.blackout = 1;
      else {
        this.blackout *= 1 - Math.min(1, dt * 12);
        if (this.blackout < 1 / 255) this.blackout = 0;
      }
      this.updatePerformance(Math.min(0.1, dt), paused);
      const incoming = this.slots.at(-1);
      const preparing = incoming.warmTicks > 0;
      if (preparing) this.warmSlot(incoming);
      if (!paused) {
        this.accumulator += Math.min(0.1, dt) * this.speed;
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
        for (const s of this.slots)
          this.drawSlot(s, Math.min(0.1, dt) * this.speed);
        if (n > 0) this.gesture[2] = 0;
      } else if (preparing) this.drawSlot(incoming, 1 / 60);
      this.present();
      this.frames[this.frameCursor++ % this.frames.length] = dt * 1000;
      this.frameCount++;
      this.pollHealth();
      const now = performance.now();
      if (now - this.lastErrorSample >= 1000) {
        this.lastErrorSample = now;
        if (this.gl.getError() !== this.gl.NO_ERROR) this.counters.gpuErrors++;
      }
    } catch (e) {
      this.onError(e.message);
      throw e;
    }
  }
  present(target = null, raw = false) {
    if (this.lost || this.gl.isContextLost() || !this.slots.length) return;
    if (!this.transition) this.flashExempt = false;
    this.pipeline.present(target, raw);
  }
  pollHealth() {
    const pixels = this.healthReadback.poll();
    if (!pixels) return;
    let sum = 0,
      squares = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const value = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      sum += value;
      squares += value * value;
    }
    this.lastHealth.mean = sum / (64 * 36);
    this.lastHealth.variance =
      squares / (64 * 36) - this.lastHealth.mean * this.lastHealth.mean;
    this.lastHealth.pending = false;
  }
  health() {
    if (this.lost || this.gl.isContextLost()) return this.lastHealth;
    this.pollHealth();
    const gl = this.gl;
    if (!this.healthReadback.sync) {
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
      this.healthReadback.begin(this.healthTarget);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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
        (n, s) =>
          n + s.visual.length + s.sim.length + (s.geometryTexture ? 1 : 0),
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
      for (const name of programKeys)
        if (p[name]?.p) this.gl.deleteProgram(p[name].p);
    }
    this.pipeline.dispose();
    this.gl.deleteBuffer(this.quad);
    this.gl.deleteVertexArray(this.vao);
    this.slots = [];
  }
}
