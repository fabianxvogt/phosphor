// Long-show time for scene shaders (see docs/families/TIME.md).
//
// u_time is accumulated scene time, uploaded as float32. A scene that needs
// different time arithmetic for a whole night keeps its authored sources for
// the first hour and adds a long-show variant behind PHOSPHOR_LATE:
//
//   #ifdef PHOSPHOR_LATE
//     float t = u_time;              // seamless, precise form
//   #else
//     float t = mod(u_time, 3600.0); // authored first-hour form, verbatim
//   #endif
//
// The engine compiles the variant (#define PHOSPHOR_LATE after #version)
// ten minutes before the first hour ends and draws with it from HOUR on, so
// the first hour is the authored program, bit for bit, on every GPU. The
// late form must agree with the authored one at HOUR (no seam at the switch)
// and stay seamless and precise for 12 hours or more.
//
// Clocks: a scene may declare `clocks: [{ rate(params, level), perBeat?,
// offset?, period? }, …]` (at most CLOCK_COUNT) and read clock i as
// u_clock[i] in its PHOSPHOR_LATE variant (declare it with lateClockGlsl).
// Clock i is the phase time · rate + beat · perBeat + offset, integrated in
// double precision: a rate change (energy, audio, a fader) changes its speed
// and never jumps the phase. The engine also draws with the late variant as
// soon as any clock's rate has changed (not only after HOUR), while the
// authored products keep running at constant rates — so an untouched look is
// still the authored program, and a touched one never jumps. A periodic
// clock is reduced modulo period (every use must be period-periodic). A seek
// re-anchors to the authored product.
export const HOUR = 3600;
export const CLOCK_COUNT = 4;
export const LATE_DEFINE = "#define PHOSPHOR_LATE\n";

export const lateClockGlsl = `
#ifdef PHOSPHOR_LATE
uniform float u_clock[${CLOCK_COUNT}];
#endif
`;

export const shaderSources = (scene) =>
  [
    scene.fragment,
    scene.simulation?.fragment,
    scene.particles?.vertex,
    scene.particles?.fragment,
    scene.precompute?.fragment,
    scene.field?.fragment,
    scene.field?.depositVertex,
    scene.geometry?.vertex,
    scene.geometry?.fragment,
  ].filter((source) => typeof source === "string");

const lateScenes = new WeakMap();
export function usesLateVariant(scene) {
  if (!lateScenes.has(scene))
    lateScenes.set(
      scene,
      shaderSources(scene).some((source) => source.includes("PHOSPHOR_LATE")),
    );
  return lateScenes.get(scene);
}

// One variant of a shader body: keeps the PHOSPHOR_LATE or the #else branch;
// other preprocessor lines pass through. For tests and audits.
export function shaderVariant(source, late) {
  const out = [];
  const stack = [];
  for (const line of source.split("\n")) {
    const directive = line.trim();
    if (/^#ifdef\s+PHOSPHOR_LATE\b/.test(directive)) {
      stack.push({ ours: true, keep: late });
      continue;
    }
    if (/^#if/.test(directive)) stack.push({ ours: false });
    const top = stack.at(-1);
    if (top?.ours && directive === "#else") {
      top.keep = !late;
      continue;
    }
    if (directive.startsWith("#endif") && stack.pop()?.ours) continue;
    if (stack.every((entry) => !entry.ours || entry.keep)) out.push(line);
  }
  return out.join("\n");
}

const f32 = Math.fround;
const finiteOr0 = (value) => (Number.isFinite(value) ? value : 0);

// Integrated clocks (double precision); returns the float32 uniform values.
// Each clock keeps phase = rate · time + perBeat · beat + c; a rate change
// adjusts c so the phase is continuous at that instant. A time jump (load,
// seek, a test setting slot.time) re-anchors to the authored product; a beat
// jump (resync) holds the phase.
export function advanceClocks(state, clocks, time, params, level, beat = 0) {
  const upload = (state.upload ??= new Float32Array(CLOCK_COUNT));
  // Double-precision phases for CPU consumers (e.g. Melt's geometry).
  const values = (state.values ??= new Float64Array(CLOCK_COUNT));
  const entries = (state.entries ??= []);
  const dt = time - state.time;
  const seek = !(dt >= 0 && dt <= 1);
  const db = beat - state.beat;
  const beatJump = !seek && !(db >= 0 && db <= 16);
  for (let i = 0; i < Math.min(CLOCK_COUNT, clocks.length); i++) {
    const { rate, perBeat, offset = 0, period } = clocks[i];
    const r = finiteOr0(Number(rate(params, level)));
    const q = perBeat ? finiteOr0(Number(perBeat(params, level))) : 0;
    let entry = entries[i];
    if (seek || !entry) entry = entries[i] = { r, q, c: offset, pure: true };
    else {
      if (beatJump) entry.c += entry.q * (state.beat - beat);
      if (r !== entry.r || q !== entry.q) {
        entry.c += (entry.r - r) * time + (entry.q - q) * beat;
        entry.r = r;
        entry.q = q;
        entry.pure = false;
      }
    }
    let value = entry.r * time + entry.q * beat + entry.c;
    if (!Number.isFinite(value)) {
      entries[i] = { r: 0, q: 0, c: 0, pure: false };
      value = 0;
    }
    if (period > 0) value -= period * Math.floor(value / period);
    values[i] = value;
    upload[i] = f32(value);
  }
  state.time = time;
  state.beat = beat;
  return upload;
}

// True while no clock's rate changed since its anchor: the authored products
// still equal the integrated phases.
export const clocksPure = (state) =>
  !state?.entries || state.entries.every((entry) => entry.pure);
