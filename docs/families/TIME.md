# Long-show time — 14–15 October 2026

**INCREMENTAL / EMPIRICAL + FORMAL bounds.** Nights run 4–8 hours; families are built for **12 hours of scene time at speed 2× (u_time = 43 200 s, 1/30 s per frame)**. This page records how every family stays seamless and precise for that long, and the rule for new work.

## The problem

`u_time` is accumulated fixed-tick scene time, uploaded as float32. About twenty families used `t = mod(u_time, 3600.)`. Unless every frequency that multiplies `t` completes whole cycles in 3600 s, the picture jumped once an hour (camera, orbits, attractor maps, cell hashes). Abyss wrapped plankton blinks at 4096 s. Raw `u_time · k` is seamless, but float32 rounding grows with the argument: half an ulp is 0.002 at 43 200 and 0.0039 at 10⁵.

A second kind of jump: wherever a phase is `u_time · rate` and the rate is a parameter that energy, audio or a fader moves, every change of the rate moves the phase by `t · Δrate` — a few hundredths of a radian at 10 s, hundreds of radians after two hours. Newton and Sandpile also drifted palette positions through `fract(… + t · k)`, so a basin or height colour jumped from `palette(1)` to `palette(0)` every 533 s / 250 s.

## Rule

Never `mod(u_time, P)` unless every use of the result is P-periodic. A family that needs different time arithmetic keeps its **authored sources for the first hour** and adds a **long-show variant** behind `#ifdef PHOSPHOR_LATE … #else <authored lines, verbatim> #endif` (`scene-time.mjs`). The engine compiles the variant ten minutes before the first hour ends (in parallel where supported; a seek past the hour finishes it on demand) and draws with it from 3600 s on. The first hour is therefore the authored program token for token on every GPU — fast-math compilers reassociate and fuse differently around any in-shader switch, which an earlier attempt measured as 1–217-level pixel differences in eight families. The late form must equal the authored one at 3600 s (no seam at the switch). In the late form, in order of preference:

1. **Raw `u_time`** when every *uniform* phase stays precise: half-ulp(43 200 · k) in radians, or in pixels where the phase moves geometry. A uniform phase error is a timing error shared by the whole frame; its floor is the float32 quantisation of `u_time` itself (≤ 1.95 ms after 9.1 h, ≤ 2 ms + ½ ulp(k t)/k ≤ 4.6 ms for any product at 12 h — under a third of a 60 Hz frame).
2. **`mod(x, P)` of a uniform phase before adding it to per-pixel or per-element values** (the sum's rounding would otherwise quantise space). P is an exact period of that use: 2π inside sin/cos, 1 inside `fract`, a whole number of cells whose hashes and colours repeat.
3. **Engine clocks** (`clocks: [{ rate(params, level), perBeat?, offset?, period? }]`, read as `u_clock[i]`) when the rate is a parameter that energy, audio or a fader moves. The engine integrates `rate · dt + perBeat · dbeat` in double precision from the moment a look loads (`Engine.sceneClocks`, `advanceClocks`), optionally reduced modulo `period`, anchored to the authored `time · rate + offset` (a seek or a load re-anchors; a beat resync holds the phase). A rate change changes the speed; it never jumps the phase.

**When the late variant draws.** From 3600 s on, and — for families with clocks — from the first frame at which any clock's rate has changed since its anchor. While every rate is constant the authored program runs, so untouched looks keep their authored arithmetic bit for bit; the first energy, audio or fader move switches to the clock variant, whose clock equals the authored product at that instant (no seam at the switch). The clock variant compiles in parallel when the look first draws; until it is ready the clocks keep re-anchoring to the authored product, so the switch is still seamless. Palette drifts never use `fract(t · k)`: Newton and Sandpile run up and back down the palette (`1 − |1 − mod(x, 2)|`), Sandpile starting from each colour's authored position.

## Per-scene record

k is the largest rate of the time argument (after energy and audio, at parameter maxima). Errors are float32 bounds at 43 200 s.

| Scene | Old expression | Max k | Fix | Why seamless and precise |
| --- | --- | --- | --- | --- |
| abyss | `mod(u_time, 4096.)·(.25+.3h)+97h` (plankton blinks) | 0.55 slots/s | raw | Slot index `floor(t)` is exact; `fract(t)` ±0.001 slot. |
| caustics | `mod(u_time, 3600)`: drive `t·2π·54/λ`, orbit `t·.017`, lens `t·.07–.11` | 56.5 rad/s (λ = 6) | clock (drive, period 200π) + raw | Drive phase integrated in double (uses ×1, ×1.07, ×1 + 1.7k: 200π-periodic); raw drive would reach ±0.24 rad of sim forcing. Others ≤ 10⁻⁴ rad. |
| chladni | `mod(u_time, 3600)`: shimmer `t·40`, morph `t·.07`, Bessel turn `t·.025`, beat fallback `2t` | 40 rad/s | raw | Shimmer is a uniform 6.4 Hz flicker (±0.14 rad ≈ 3.5 ms); the rest ≤ 4·10⁻⁴ rad. The beat fallback no longer jumps hourly. |
| domain | `d.t`: motion `t·m·{.025–.35}`, flow `t·f·{.1,.6}` | 0.6 cycles/s | clocks (motion unwrapped; flow period 10) | Motion phases are uniform (≤ 0.004 rad). Flow enters per-pixel `fract(… − ft·.6)`; ft < 10 keeps it exact. |
| flame | `mod(u_time,3600)·morph·.12` (affine maps), turn `t·spin·.05` | 0.18 rad/s | clocks (periods 500π/3, 40π) | Morph uses multipliers 1, .8, .7, .6, .5 (all 20π-periodic in m). |
| harmonograph | δ `t(.05+.6d)+.4`, pen `t(.1+.5d)`, yaw `t(.1+.5s)`, turn `t·s·.05` | 0.65 rad/s | clocks (2π, 2π, 2π, 40π) | δ is added to every curve point (`a·u + δ`); δ < 2π + .4 keeps points to 10⁻⁶ rad (raw: 0.5 px point noise). |
| hilbert | colour `t·f·.2`, comet `t(.01+.04f)` | 0.2 cycles/s | clocks (periods 5, 1) | Both enter per-pixel `fract`. |
| hopf | fixed `t·{.21,.1,.17,.07,.05,.09}`, drift `t·.05(1+lat)` | 0.21 rad/s | raw + clock (2π) | Per-point sums ≤ 4.4·10³ rad: ±0.0002 rad (≤ 0.12 px). Latitude follows audio, so its drift integrates. |
| kleinian | `t·.01`, flow `t·f·{.08,.05,.02,.3}` | 0.3 rad/s | clock (unwrapped) | Uniform transforms only (≤ 0.002 rad). |
| newton | drift `t·d·{.05,.01}`, fixed `t·{.07,.031,.023}`, spin `t·s·.1` | 0.15 rad/s | clocks (drift unwrapped, spin 20π) | Uniform root/camera motion (≤ 0.004 rad). |
| phyllotaxis | speed `t·s·{.15,.3,N·.004}`, fixed `t·{.11,.02}` | N·.004 ≈ 16 seeds/s | clock (unwrapped) | Growth uses `fract(φ)` and `floor(φ)` of one uniform φ, so seeds stay consistent (±0.03 seed ≈ 2 ms). |
| physarum | food orbit `mod(u_time,3600)·.015` | 0.015 rad/s | raw | ±3·10⁻⁵ rad. |
| quasicrystal | phason `t·p·.06`, pan `t·d·{.31,.17}`, spin `t·s·.02`, ribbon `t·2.4` | pan 0.31 tiles/s | clocks (phason 2π/.06, pan unwrapped, spin 100π) + footprint | A quasicrystal has no translation period, so the pan grows (≤ 1.5·10⁴ tiles): ±0.0005 tile ≤ 0.18 px at 1080p (0.35 px at 4K, scale 3). After the first hour edge footprints come from the unpanned view (`fwidth` of rounded x was up to 50 % noisy). |
| ripple | `rTheta`: `t·.03` | 0.03 rad/s | raw | Uniform. |
| truchet | spin `t·s·{.25,.03}`, pan `t·{.05,.031}`, flow `t·f·{1.5,3}` | 1.5 cycles/s | clocks (unwrapped) + log-polar cell shift + `mod(flow·1.5, 1)` | Log-polar: whole cells of the zoom shift leave p exactly and return in the cell index, so hashes continue and edges stay exact (raw: 0.3 px, 60 % footprint noise). Flow pulses per pixel use the wrapped phase. Cartesian pan ≤ 2.2·10³ tiles: 0.03 px. |
| voronoi | metric `t·.11`, radii `t(.25+.5h)`, pan `t·{.004,.0023}` | 0.75 rad/s | raw | Per-site sums ±0.001 rad; pan ≤ 173: 10⁻⁵. |
| wallpaper | term phases `t·f·(.4+.25j)`, yaw `t·s·.03`, glide `fract(t·.02)` | 2.15 rad/s | clocks (40π: every term speed is a multiple of .05; 2π/.03) | The glide is lattice-periodic; uniform otherwise. |
| attractor | `mod(u_time, 2400)` morph waves | — | kept | Waves 13 and 19 complete whole periods in 2400 s (`tests/time.test.mjs`). |
| phase | `mod(u_time, 24)` | — | kept | A deliberate 24 s arc of simulation gains; the state integrates, so the image is continuous. |
| descent | `mod(u_time·.21, 2π)` | — | kept | Enters only `sin(… ± phase)`. |
| interference (GATED) | `evolution = motion · mix(t·.5, beat·.25, lock)`, then `mod(evolution, 200π)`, `mod(evolution, 20)` | — | clock (time and beat rates) | The wraps already completed whole cycles. Motion (energy ×0.08–2.2) and lock glides moved the phase by `t · Δrate`; now integrated over time and beats. Owner-approved continuity fix (2026-10-15). |
| pulse (GATED) | `travel = u_time·speed·1.5` in cells, depth bands and fan sectors; turn `twist·travel` | 4.5 units/s | clocks (speed; twist · speed, audio) + per-use `mod` (100, 2π, 10, 500) + fan laps of 2500 | Raw travel reaches 1.3·10⁵: per-pixel band phases quantised to 1/64 (≈ 23 px stairs on the outer portal at count 2). Each wrap moves bands/cells by whole colour cycles (·.23, ·.173, ·.137, ·.21); fan laps restore 300·count sectors exactly, so the golden-ratio tips continue. |
| feedback (GATED) | `clock = u_time·mix(.06, 1.8, level²)` in rings, bands, ribbons, tiles | 1.8 rad/s | clock (level) + per-use `mod` (12.5, 250, 2π, 2π/.7, 100 rows) | Raw clock reaches 7.8·10⁴: up to 0.7 px stairs on portal bands. Wrap periods move bands/rows by whole colour cycles (·.17·12, ·.21·12 stay ≡ 0 mod 3). |
| beams | `t = u_time·sweep` in per-beam angles; pillars `t·(.7+.6h)` | 2.6 rad/s | clock (sweep, period 200π) + pillar speeds on a .01 grid | Every use of t (×1, ×.4, ×.3, pillars ×.70–1.30 in .01 steps) is 200π-periodic, so the reduced clock keeps every beam exact for the night. **Look change:** pillar speeds round to the nearest .01 (≤ .005 rad/s from the authored hash speed; same character), in the authored variant too, so the switch stays seamless. |
| julia | `u_time·drift·.15`, `mod(spin·u_time·.2, 2π)` | 0.23 rad/s | clocks (drift; spin 10π) | Energy-driven drift and spin integrate; uniform. |
| swarm | attractor morph `u_time·.03·speed` | 0.06 rad/s | clock (20π) | Uses sin(t), cos(1.3t), sin(.7t), cos(.9t). |
| hyperbolic | `t·drift·{.13,.09}`, `t·turn·.2` | 0.2 rad/s | clocks (200π, 10π) | Uniform Möbius motion. |
| colonization | orbit `mod(t·turn·.24, 2π)` | 0.24 rad/s | clock (2π/.24) | Uniform camera. |
| magnetic | ring phase `u_time·(.2+.3·motion)` | 0.8 rad/s | clock (40π: uses ×1, ×.15, ×.2) | Per-pixel sums < 40π + 113: exact. |
| metamorphosis | sway/vein `u_time·speed·{.4,.52,.8}` | 1.6 rad/s | clock (50π) | Per-vertex and vein sums < 50π: exact. |
| melt | breathing `round(cycles)·u_time/duration` (shader and CPU geometry) | 0.5 cycles/s | clock (period 1), double value for the CPU geometry | Duration has an energy curve; integrated, the breathing never jumps. |
| newton (palette) | root hue `fract(k/3 + t·drift/80)` | — | ping-pong `1 − |1 − mod(x, 2)|` | Identical while x < 1 (first ≈ 533 s at drift .25); afterwards the hue runs back down instead of jumping. **Look change** after the first reflection; two roots may briefly share a hue at reflections. |
| sandpile (palette) | height colours `fract(hue + c + t·.004)` | — | ping-pong from each colour's authored position | `spHue(hue + c, t·.004)` equals the authored colour at t = 0 and reflects at the palette ends. **Look change** once a colour reaches an end (≤ 250 s). |
| aquarium, afterglow, crystal, evolution, mycelium, sandpile (other), tapestry (GATED) | raw `u_time·k` or `fract(u_time/P)` | ≤ 2.3 rad/s | raw | Fixed rates: uniform phases, or per-pixel sums whose amplitude makes the error < 0.2 px (crystal twinkle ±0.004 rad). |
| acid, cathedral, fibration, flight, fourspace, horizon, life, mandelbrot, murmuration, nebula, ribbons, turmite | no `u_time` | — | — | Integrated simulation/CPU state or JS double-precision geometry. |

## Not changed (reported)

- **`u_beat`** accumulates beats as float32 (½ ulp ≈ 0.004 beat after 65 536 beats, 8.5 h at 128 BPM); not part of scene time.
- **Fixed-rate float32 floor:** every uniform phase is evaluated within ≤ 4.6 ms of the true time at 12 h (u_time quantisation plus product rounding).

## Verification

- `node --test tests/time.test.mjs`: no unaudited `mod(u_time, …)`; authored variants contain no clocks; attractor periods are whole; every clock is declared, finite and used; constant-rate clocks equal the authored product and stay pure; a rate step at 100 s, 2 h and 12 h changes the speed and not the phase; seeks re-anchor, beat resyncs hold, beats integrate; periodic clocks stay exact for 12 h under minute-by-minute rate changes.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --port 48402` (also `PHOSPHOR_TIME_GPU=1 node --test tests/browser/time-wrap.test.mjs`): every family's first look at speed 2×, frame steps across 3600 s, 4096 s and 43 200 s against the steps beside them and at 10 s. Rate steps at 10 s and 2 h: energy 0.1 → 0.9 in one frame, and a "nudge" (energy 0.5 → 0.501 plus every continuous parameter +0.1 % of its range). For each, the first frame after the step is compared with the same frame without it; at 2 h that departure must stay within 2 × the departure at 10 s (or the ordinary frame step) + 0.35. `--reference <rev>` runs another revision's scenes and engine.
- `node scripts/check-time-wrap.mjs --rig --identity origin/main --families …`: every look at energy 0.1/0.5/0.95 and first-hour times, against the previous shaders.

## Results — 14 October 2026 (ANGLE Metal, Apple M3 Pro, 320×180)

- **First-hour identity:** the first-hour variant of all 20 changed families equals the authored sources token for token (preprocessed, blank lines aside). On the GPU, every look at energy 0.1/0.5/0.95 and t = 0.5, 1234.5 and 3599 s against `origin/main`: **1629 frames, 0 differing pixels, max difference 0** (Abyss, Chladni, Caustics, Voronoi, Ripple, Physarum, Domain, Wallpaper, Flame, Harmonograph, Newton, Hilbert, Quasicrystal, Kleinian, Phyllotaxis, Truchet, Hopf, Pulse, Feedback, Beams). Pulse and Feedback are GATED.
- **Seams, all 51 families:** no crossing step exceeds 2 × the larger of its neighbouring steps and the 10 s steps (+0.35). Largest crossing/ordinary ratios: Wallpaper 1.26 at 3600 s (0.45 mean levels), Colonization 1.24 at 12 h (0.19), Hilbert 1.20 at 3600 s; all 20 changed families drew the late variant after 3600 s.
- **Before (`--reference origin/main`):** 9 families jumped at 3600 s — Quasicrystal 58.4 mean levels (68 × an ordinary step), Wallpaper 40.9 (64 ×), Truchet 61.1 (42 ×), Kleinian 19.5, Domain 19.2, Newton 20.0, Hilbert 9.3, Phyllotaxis 9.3, Hopf 4.9. Simulated seams (Flame's affine maps, Chladni's plate) spread over several frames and do not exceed the per-frame threshold, but share the same cause.
- **Newton palette sawtooth (fixed 15 October, see below):** each root's hue was `fract(k/3 + t · drift / 80)`, jumping one basin from `palette(1)` to `palette(0)` every 1600/3 s at drift .25; Sandpile's height colours likewise every 250 s. The 14 October run probed 12 h at 43 201 s to avoid that coincidence; the check now uses 43 200 s.

## Results — 15 October 2026 (rate continuity, Newton/Sandpile palettes, Beams pillars)

- **Identity at constant rates** (`--identity a140f6f`, reference scenes and engine; every look at energy 0.1/0.5/0.95, t = 0.5, 1234.5, 3599 s): **1791 frames; 1671 identical (max difference 0)** across Pulse, Feedback, Interference (all GATED), Julia, Swarm, Hyperbolic, Colonization, Magnetic, Metamorphosis, Melt, Caustics, Domain, Wallpaper, Flame, Harmonograph, Hilbert, Quasicrystal, Kleinian, Phyllotaxis, Truchet and Hopf. The 120 differing frames are the intended look changes: Beams pillar looks 1 and 4 (12 frames, all times), Newton (48, from 1234.5 s; one t = 0.5 frame) and Sandpile (60, from 1234.5 s; none at 0.5 s).
- **Rate steps, all 51 families:** no family departs at 2 h more than 2 × at 10 s. The fix removed the six detected jumps (nudge departure at 10 s → 2 h, mean levels): Interference 2.3 → 19.5 became 1.2 → 1.5; Julia 6.0 → 41.8 became 4.4 → 3.1; Hyperbolic 5.0 → 20.5 became 1.2 → 1.2; Beams 2.8 → 11.5 became 0.7 → 0.6; Pulse 8.9 → 22.0 became 0.8 → 0.8; Metamorphosis 0.35 → 1.26 became 0.35 → 0.34. Largest remaining ratio: Wallpaper 1.85 (1.7 vs 0.9 levels, unchanged from the reference).
- **Seams:** all 51 families pass at 3600 s, 4096 s and exactly 43 200 s (Newton's palette no longer wraps there).
- Families whose simulations or feedback dominate the frame (Swarm, Feedback, Physarum, Caustics, Voronoi, Ripple) show equal departures with or without a phase jump; their clocks are covered by the CPU tests and the identity runs.
