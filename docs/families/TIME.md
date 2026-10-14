# Long-show time — 14 October 2026

**INCREMENTAL / EMPIRICAL + FORMAL bounds.** Nights run 4–8 hours; families are built for **12 hours of scene time at speed 2× (u_time = 43 200 s, 1/30 s per frame)**. This page records how every family stays seamless and precise for that long, and the rule for new work.

## The problem

`u_time` is accumulated fixed-tick scene time, uploaded as float32. About twenty families used `t = mod(u_time, 3600.)`. Unless every frequency that multiplies `t` completes whole cycles in 3600 s, the picture jumped once an hour (camera, orbits, attractor maps, cell hashes). Abyss wrapped plankton blinks at 4096 s. Raw `u_time · k` is seamless, but float32 rounding grows with the argument: half an ulp is 0.002 at 43 200 and 0.0039 at 10⁵.

## Rule

Never `mod(u_time, P)` unless every use of the result is P-periodic. A family that needs different time arithmetic keeps its **authored sources for the first hour** and adds a **long-show variant** behind `#ifdef PHOSPHOR_LATE … #else <authored lines, verbatim> #endif` (`scene-time.mjs`). The engine compiles the variant ten minutes before the first hour ends (in parallel where supported; a seek past the hour finishes it on demand) and draws with it from 3600 s on. The first hour is therefore the authored program token for token on every GPU — fast-math compilers reassociate and fuse differently around any in-shader switch, which an earlier attempt measured as 1–217-level pixel differences in eight families. The late form must equal the authored one at 3600 s (no seam at the switch). In the late form, in order of preference:

1. **Raw `u_time`** when every *uniform* phase stays precise: half-ulp(43 200 · k) in radians, or in pixels where the phase moves geometry. A uniform phase error is a timing error shared by the whole frame; its floor is the float32 quantisation of `u_time` itself (≤ 1.95 ms after 9.1 h, ≤ 2 ms + ½ ulp(k t)/k ≤ 4.6 ms for any product at 12 h — under a third of a 60 Hz frame).
2. **`mod(x, P)` of a uniform phase before adding it to per-pixel or per-element values** (the sum's rounding would otherwise quantise space). P is an exact period of that use: 2π inside sin/cos, 1 inside `fract`, a whole number of cells whose hashes and colours repeat.
3. **Engine clocks** (`clocks: [{ rate(params, level), offset?, period? }]`, read as `u_clock[i]`) when the rate is a parameter that energy, audio or a fader moves. The engine integrates `∫ rate dt` in double precision after the first hour (`Engine.sceneClocks`), optionally reduced modulo `period`, anchored to the authored `time · rate + offset` (continuous at the switch; a seek or a load re-anchors). A parameter glide then changes the speed instead of jumping the phase by `t · Δrate`, which with raw time would grow twelvefold by 12 h.

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
| interference (GATED) | `mod(evolution, 200π)`, `mod(evolution, 20)` | — | kept | Every multiplier completes whole cycles (already designed this way). |
| pulse (GATED) | `travel = u_time·speed·1.5` in cells, depth bands and fan sectors | 4.5 units/s | per-use `mod` (100, 2π, 10, 500) + fan laps of 2500 | Raw travel reaches 1.3·10⁵: per-pixel band phases quantised to 1/64 (≈ 23 px stairs on the outer portal at count 2). Each wrap moves bands/cells by whole colour cycles (·.23, ·.173, ·.137, ·.21); fan laps restore 300·count sectors exactly, so the golden-ratio tips continue. |
| feedback (GATED) | `clock = u_time·(.06–1.8)` in rings, bands, ribbons, tiles | 1.8 rad/s | per-use `mod` (12.5, 250, 2π, 2π/.7, 100 rows) | Raw clock reaches 7.8·10⁴: up to 0.7 px stairs on portal bands. Wrap periods move bands/rows by whole colour cycles (·.17·12, ·.21·12 stay ≡ 0 mod 3). |
| beams | `t = u_time·sweep` in per-beam angles | 2.6 rad/s | `mod(t, 2π)`, `mod(t, 2π/.4)` | Fan, crossfire and starburst sums become exact. **Residual:** pillars use per-beam irrational speeds `t·(.7+.6h)`; no common period exists, so they keep the raw product (±0.004 rad phase, ≤ 2 px at the far end of a 1080p beam after 8 h at sweep 2). |
| aquarium, afterglow, colonization, crystal, evolution, hyperbolic, julia, magnetic, melt, metamorphosis, mycelium, sandpile, swarm, tapestry (GATED) | raw `u_time·k` or `fract(u_time/P)` | ≤ 2.3 rad/s | raw | Uniform phases, or per-pixel sums whose amplitude makes the error < 0.2 px (largest: metamorphosis vein pulse ±0.004 rad over a vein ≈ 0.15 px; crystal twinkle ±0.004 rad). |
| acid, cathedral, fibration, flight, fourspace, horizon, life, mandelbrot, murmuration, nebula, ribbons, turmite | no `u_time` | — | — | Integrated simulation/CPU state or JS double-precision geometry. |

## Not changed (reported)

- **Parameter-rate phases in raw-time families** (beams `u_time·sweep`, pulse `u_time·speed`, feedback `u_time·f(level)`, swarm, julia, hyperbolic, colonization, magnetic, metamorphosis, melt, interference `motion·clock`): an energy or audio change of the rate still moves the phase by `t·Δrate`, more strongly as the night goes on. This is existing behaviour, not a wrap seam; an engine clock in the late variant is the fix when owners want it (GATED families need approval because it changes their behaviour after the first hour).
- **First-hour parameter jumps:** the families with clocks still evaluate `t · rate` during their authored first hour, so a glide there behaves as before (bounded by 3600 · Δrate).
- **`u_beat`** accumulates beats as float32 (½ ulp ≈ 0.004 beat after 65 536 beats, 8.5 h at 128 BPM); not part of scene time.

## Verification

- `node --test tests/time.test.mjs`: no unaudited `mod(u_time, …)`; attractor periods are whole; every clock is declared, finite and used; clocks continue the first-hour product across 3600 s, integrate rate changes, re-anchor after seeks and stay exact for 12 h.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/check-time-wrap.mjs --rig --port 48402` (also `PHOSPHOR_TIME_GPU=1 node --test tests/browser/time-wrap.test.mjs`): every family's first look at speed 2×, frame steps across 3600 s, 4096 s and 43 200 s against the steps beside them and at 10 s. `--reference origin/main` shows the old seams.
- `node scripts/check-time-wrap.mjs --rig --identity origin/main --families …`: every look at energy 0.1/0.5/0.95 and first-hour times, against the previous shaders.

## Results — 14 October 2026 (ANGLE Metal, Apple M3 Pro, 320×180)

- **First-hour identity:** the first-hour variant of all 20 changed families equals the authored sources token for token (preprocessed, blank lines aside). On the GPU, every look at energy 0.1/0.5/0.95 and t = 0.5, 1234.5 and 3599 s against `origin/main`: **1629 frames, 0 differing pixels, max difference 0** (Abyss, Chladni, Caustics, Voronoi, Ripple, Physarum, Domain, Wallpaper, Flame, Harmonograph, Newton, Hilbert, Quasicrystal, Kleinian, Phyllotaxis, Truchet, Hopf, Pulse, Feedback, Beams). Pulse and Feedback are GATED.
- **Seams, all 51 families:** no crossing step exceeds 2 × the larger of its neighbouring steps and the 10 s steps (+0.35). Largest crossing/ordinary ratios: Wallpaper 1.26 at 3600 s (0.45 mean levels), Colonization 1.24 at 12 h (0.19), Hilbert 1.20 at 3600 s; all 20 changed families drew the late variant after 3600 s.
- **Before (`--reference origin/main`):** 9 families jumped at 3600 s — Quasicrystal 58.4 mean levels (68 × an ordinary step), Wallpaper 40.9 (64 ×), Truchet 61.1 (42 ×), Kleinian 19.5, Domain 19.2, Newton 20.0, Hilbert 9.3, Phyllotaxis 9.3, Hopf 4.9. Simulated seams (Flame's affine maps, Chladni's plate) spread over several frames and do not exceed the per-frame threshold, but share the same cause.
- **Newton palette sawtooth (pre-existing, not changed):** each root's hue is `fract(k/3 + t · drift / 80)`; whenever it wraps (every 1600/3 s at drift .25), one basin's colour jumps from `palette(1)` to `palette(0)`. Sandpile's height colours drift the same way (`fract(hue + t · .004 + c)`, every 250 s). Both are first-hour behaviour, so the identity rule keeps them; the seam check probes 12 h at 43 201 s because 43 200 s coincides with a Newton wrap.
