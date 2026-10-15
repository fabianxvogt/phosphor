# Authoring a family

Owner direction 2026-10-09: Phosphor is a **catalog of visual algorithms** for club screens. Every algorithm that runs in real time and looks good in a club belongs here. Every look carries its own character.

## Terms

- **Family** = one algorithm (one core computation): elementary CA, Game of Life, Gray–Scott, Lorenz attractor, escape-time Mandelbrot, de Bruijn pentagrid. One `scene-<id>.mjs`.
- **Variant** (the family's `type` parameter) = a structurally different instance of *that same* algorithm: a different rule, map, lattice, symmetry group, projection or topology. Two variants must still look different in grayscale.
- **Look** (a preset) = variant + parameters + seed. Palette and energy are chosen per clip. Each family has **at least 8 looks**, and each look needs its own style: a different variant, density, speed, scale, camera or composition. A colour-only difference is not a new look.

If two parts of a scene are really two algorithms, they are two families.

## The signature detail goes in front

Whatever makes an algorithm clever has to be the hero of the picture. Someone who knows the maths should recognise it immediately and think "that's a clever use of X":

- elementary CA: crisp cells and the rule's space–time triangle being written row by row
- Life: gliders, oscillators and a glider gun firing
- Lorenz: the butterfly's two lobes
- Mandelbrot: the self-similar bulbs and minibrots as the zoom dives in
- Penrose: five-fold rhombi and the de Bruijn grid behind them

Decoration (relief, glow, camera, post) supports the detail and never buries it. If the algorithm is no longer readable at mid energy, the look fails.

## Endless

Nothing may stop, die out, freeze or run into a dead end. A night lasts up to 8 hours; plan for 12 hours of scene time at speed 2× (43 200 s).

- Simulations detect a stale state (extinct, static, short-period or saturated) and recover: reseed, inject or rain new seeds. Do it visibly but smoothly, and prefer a local event over a full reset.
- Zooms and journeys loop seamlessly, for example by using self-similarity or crossfading between equivalent depths.
- Time must stay seamless and precise for the whole night ([TIME.md](TIME.md)). **Never write `mod(u_time, P)` unless every use of the result is P-periodic**: a frequency that does not complete whole cycles in P makes the picture jump once per wrap. Raw `u_time · k` is fine while every *uniform* phase stays precise in float32 (½ ulp(43 200 · k) in radians or pixels). Reduce a time phase modulo an exact period of its use before adding it to per-pixel values. Phases whose rate is a parameter (energy, audio, faders) use an integrated engine clock (`clocks`, `u_clock[i]`, in the `PHOSPHOR_LATE` variant; the engine switches to it at the first rate change or at 3600 s). Never drift a palette position with `fract(… + t · k)` (palette(0) ≠ palette(1)); run up and back down instead. To change an existing family's time arithmetic, keep its authored lines in `#else` of an `#ifdef PHOSPHOR_LATE` block: the engine switches to the late variant at 3600 s, so the first hour stays bit-identical. `node --test tests/time.test.mjs` audits wraps and clocks; `scripts/check-time-wrap.mjs` checks every family across 3600 s, 4096 s and 12 h on the GPU (`--identity <rev>` compares first-hour frames).

## Club rules

- Dark ground and high contrast. Colour comes only from `palette(t)` / `u_primary`, `u_secondary`, `u_accent` (mixes with black and white are fine), so every library palette works.
- Energy (`u_level`, plus the `energy` curves on params) changes **structure, density, detail and motion** from 0.1 to 0.9, not brightness. Brightness belongs to master.
- Beat: the shared punch and pulse come from the `beat` weights. Inside the scene, use `u_kick` (0–1 envelope), `u_beat` (beats, float) and `u_low` / `u_mid` / `u_high` sparingly. Never draw full-screen white flashes; flashes live behind the shared limiter.
- Any screen aspect: analytic scenes compose natively with `aspectUV()` (short side = 1). Simulations declare `aspect: 16/9` and are cover-cropped.

## Performance budget

Reference rig: MacBook Pro M3 Pro, Chrome, 2.1 MP output, frame p99 ≤ 34 ms for the whole picture including the post chain and crossfades between two families. So one family gets roughly **≤ 8 ms**.

- All loops have constant caps (`for (int i = 0; i < CAP; i++) { if (i >= n) break; … }`).
- Visual passes retain full output resolution; `maxRenderWidth` is legacy metadata and does not cap live shading. Remove repeated work before reducing algorithm detail: precompute fixed topology and expose constant loop/index bounds where the algorithm permits it. Preserve candidate order and compare seeded frames at low/mid/high energy and late show times.
- `node scripts/profile-families.mjs --types` measures all family variants on the native GPU. Add `--reference <commit>` for a shader baseline and `--width 3840 --height 2160` for 4K. This synchronous throughput probe includes post-processing but excludes asynchronous flash approval; use the Stage timing runner for display cadence and rig acceptance.
- Bounds-based skips must conservatively include antialiasing and preserve depth/candidate order. Keep derivatives outside per-pixel fallback branches. Verify exact integer-map changes on the GPU with `node scripts/check-curve-maps.mjs`; CPU-only agreement does not exercise shader compilation.
- Use an optional `precompute: { fragment, size }` for small, exact data reused across the image. The engine draws it into RGBA32F before each visual draw (including paused edits), exposes `PRECOMPUTED` and `u_precomputed`, and releases it with its slot. Keep the original shader path when the macro is absent; GPUs without float render targets use that fallback. A data pass has its own `u_resolution`, reads the current simulation state and never advances it. Do not cache reduced-resolution colour images here. Optional data is also exposed to geometry vertex/fragment shaders behind `PRECOMPUTED`. A data pass may request `filter: "linear"`; only GPUs with `OES_texture_float_linear` receive linear filtering and `PRECOMPUTED_LINEAR`. Without that extension, keep an explicit nearest-fetch interpolation path; without float targets, keep the analytic fallback. Default cache filtering remains nearest.
- Cache integer curve maps rather than gliding coordinates: storing a floating intermediate can change which nearly equidistant segment wins. `PHOSPHOR_PRECOMPUTE_GPU=1 node --test tests/browser/precompute.test.mjs` checks both map directions, exact orbit decoding, pause refresh, fallback, context restoration and cleanup on the native GPU.
- Data caches default to nearest-filtered RGBA32F; exact integer maps retain that default. A continuous physical field may opt into `precompute: { format: "rgba16f", filter: "linear", ... }` to halve storage and use WebGL2's core half-float filtering. Include slice gutters in a packed 3D atlas. RGBA32F with linear filtering requires `OES_texture_float_linear`; without it the scene's analytic fallback is used. `PHOSPHOR_INK_GPU=1 node --test tests/browser/ink-precompute.test.mjs` checks formats, filtering, fallback, paused refresh, restoration and unchanged exact-map defaults.
- A spatial tile cache supplies candidates, not authoritative hits. Phason flips can produce rounded, overlapping rhombi away from their edges; containment alone does not preserve the first-hit winner. Even rejected candidates can alter compiler optimization of the fallback. A Quasicrystal cache prototype failed the strict late-time image gate and was discarded; retain the original search until a replacement passes both boundary and ordinary-frame comparisons.
- Flight may stop its recursive cross search only when the current minimum is already at or below the lower bound for every remaining level. Keep the first material winner on ties. `node scripts/check-flight-bounds.mjs` continues the full search after each proposed stop to check that neither minimum nor material changes; retain differential image checks to catch compiler-dependent arithmetic changes too.
- Simulation textures stay small (≤ 1024² for cheap rules, ≤ 512² for heavy rules), with `steps` per 60 Hz tick ≤ 8. The engine copies the whole state texture every step, so one step costs one full-texture pass.
- Particles: one point per simulation texel; 256² = 65,536 is the proven size.

## Contract (see `scene-contract.mjs`)

A scene module default-exports `{ id, number, name, description, schema, presets, fragment, energy, beat, audio?, stage, type, aspect?, maxRenderWidth?, simulation?, particles? }`.

- `schema`: ≤ 8 params `{key,label,min,max,step,default}` mapped to `u_params[0..7]` in order. Integer selectors use `step: 1`.
- `type: { key, values }`: the variant selector, with ≥ 3 values.
- `energy`: per-param curve `[at0, at1]` (additive) or `{ mul: [a, b] }` (multiplier).
- `beat: { punch, pulse, inject? }`: weights from 0 to 2.
- `audio`: ≤ 3 `{ param, feature: low|mid|high|onset|flux|hit, amount ≤ 0.18 }`. It never targets the type param.
- `stage`: exactly 3 param keys (the live faders).
- `simulation: { fragment, size: [w, h], steps, filter? }`: an RGBA8 ping-pong state with `u_state`, `u_reset` and `u_tick`. Use `pack16`/`unpack16` for precision.
- `particles: { vertex }`: points read `particle()` from the state.
- The visual pass may read `u_previous` (last frame) for trails. Visual `u_dt` is the frame dt; the simulation runs at a fixed 1/60.
- `number`: unique family number, shown in the UI.
- `clocks`: ≤ 4 `{ rate(params, level), perBeat?, offset?, period? }`, integrated phases read as `u_clock[i]` in the `PHOSPHOR_LATE` variant (see [TIME.md](TIME.md)).

## Checklist before handing over

1. `npm test` passes, including `tests/scene-metadata.test.mjs`. Add `tests/<id>.test.mjs` with a CPU reference for any exact rule (a CA step, a map, a tiling index) and checks that every preset validates.
2. Render the energy ladder for every look and look at it:
   `PHOSPHOR_CHROME=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/contact.mjs --dist . --sheet ladder --family <id> --width 320 --height 180 --frames 90 --port <unique> --out artifacts/<id>-ladder`
   Use a unique `--port` per worker. The headless renderer is software (SwiftShader), so expect seconds per look. Its timings say nothing about the GPU.
3. Zero GL errors, zero non-finite values, no black frames, and no look that is mostly blank at energy 0.1.
4. Write a short `docs/families/<id>.md`: the algorithm, the signature detail, the variants, the looks, the energy grammar, the cost estimate and how it stays endless.
