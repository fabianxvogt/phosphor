# Pulse Geometry — D60 rework gate packet (2026-10-08)

**Awaiting owner sign-off.** Branch: `family/pulse-rework`, based on `22e9627`.
The earlier Pulse was approved under D51; this packet replaces its visual and technical evidence for the D60 strobe-geometry rework. D60 keeps the previously gated family playable while the replacement is reviewed. Evidence below is **EMPIRICAL**, not artistic approval or photosensitivity certification.

## What changed and why

The live-test baseline was three diagonal stripes at energy 1.0. The old structural metric passed, but its motion delta was at most **0.0004**. The replacement changes shape count, subdivision, motion speed and layering, rather than adding an exposure multiplier or a full-frame white flash.

| Saved `form` | New structure                                                                                                                                                                           | Authored presets retained |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 0            | Staggered scanner shutters with broad horizontal slots; peak adds dense slits and a counter-travelling chip layer, then alternates horizontal/vertical configurations on kicks.         | Scanner Bars / Slow Gate  |
| 1            | A bounded, focal square portal made of nested log-depth frames; peak breaks edges into tiles, moves/rotates the configuration and opens a counter-moving rear portal into the surround. | Square Tunnel / Ring Dive |
| 2            | An off-axis receding block floor beneath open sky; peak subdivides the blocks into micro-cells over a separately moving circuit grid.                                                   | Horizon Grid              |
| 3            | A fan of tapered radial splinters with staggered tips; peak fragments the blades and interleaves a shorter, reverse-travelling crown.                                                   | Shard Crown               |

All four type values, eight parameter keys, six preset names and authored seeds survive. Existing saved snapshots still validate; no set migration or compatibility alias is needed. `step` now controls kick-configuration strength rather than blending away almost all continuous travel.

## Energy and clock grammar

- The declared `speed` curve is multiplicative (`0.025 → 3.5`): zero travel stays zero, while the Scanner Bars snapshot gets about **8.5×** more travel speed at 0.9 than at 0.1. Count has a positive declared slope (`3 → 25`), thickness a smaller positive slope (`0.10 → 0.17`). Brightness stays on master.
- Scanner Bars count is **2 / 10 / 19** at energy 0.1 / 0.5 / 0.9. Its slits per brick are **1 / 2 / 5**; the other forms use **1 / 3 / 4** subdivisions. The second shape layer ramps from absent to fully present across 0.4–0.9.
- A deterministic four-configuration cycle uses `mod(floor(u_beat), 4)`. Configuration strength ramps across 0.7–0.9, scaled by the energy-curved `step` parameter. There is no time hash, random flicker, fractional-beat light pulse or scene-local flash. At zero travel, configurations can still cut when the uploaded cut strength is nonzero.
- Every shape/layer uses the shared `palette()` and all three palette endpoints. The scene does not bake in the former lime/blue/pink colours. Shared punch/pulse weights remain **1.2 / 1.2**; automatic flashes remain in the shared output and its limiter.
- Layers combine with bounded `max` coverage rather than an unbounded light sum. Periodic fields are pixel-footprint filtered before becoming unresolved, especially at the floor horizon and tunnel centre.

## Native aspects and cost

Coordinates are isotropic and normalized to the screen's short side. Scanner tiles and splinters extend into the native frame; the portal retains its focal silhouette with a rear surround at peak; the floor's open sky is authored negative space, not letterboxing. No fixed-aspect offscreen scene or stretched geometry is introduced.

This remains one analytic fragment pass: no simulation, history texture, geometry buffer, ray marcher, dynamic shape loop or extra render target. Only `scene-pulse.mjs`, its Pulse gate test and this packet change; shared contract/platform files and other families are intentionally unchanged.

## Structural energy evidence

Compact comparison: **160×90**, seed **17**, clip base **0.5**, energy **0.1 / 0.9**, **120** warm frames followed by **24 samples at 30 Hz**. All four exceed the provisional score **0.15** and the new regression's motion-delta floor **0.01**.

| Form | Structure delta | Motion at 0.1 | Motion at 0.9 | Motion delta | Score       |
| ---- | --------------- | ------------- | ------------- | ------------ | ----------- |
| 0    | 0.86973         | 0.00294       | 0.06967       | **0.06673**  | **0.87228** |
| 1    | 0.57686         | 0.00958       | 0.06558       | **0.05600**  | **0.57958** |
| 2    | 0.42113         | 0.00473       | 0.05391       | **0.04919**  | **0.42399** |
| 3    | 0.69683         | 0.00196       | 0.09019       | **0.08822**  | **0.70239** |

The minimum motion delta is more than **122×** the reported old ceiling of 0.0004, measured at the same compact resolution. Peak motion exceeds low motion in every form; brightness and uniform tint are normalized out by the shared metric. WebGL errors and non-finite uploads: **0**.

Executed: `npm run contact -- --sheet energy --family pulse --width 160 --height 90 --seed 17 --port 48200 --out artifacts/contact/pulse-rework-energy`.

## Authored energy ladders

**480×270**, **120 frames**, energy **0.1 / 0.5 / 0.9**, all six authored presets. The four shapes become denser/subdivided and move faster; luminance does not have to rise.

| Preset        | Edge density, low / mid / peak | Mean linear luminance, low / mid / peak |
| ------------- | ------------------------------ | --------------------------------------- |
| Scanner Bars  | 0.00797 / 0.04763 / 0.11618    | 0.05447 / 0.07743 / 0.06785             |
| Slow Gate     | 0.00882 / 0.02544 / 0.11208    | 0.08861 / 0.14366 / 0.12253             |
| Square Tunnel | 0.01155 / 0.02899 / 0.04204    | 0.02022 / 0.02045 / 0.02369             |
| Ring Dive     | 0.01781 / 0.03460 / 0.03855    | 0.00707 / 0.00960 / 0.01405             |
| Horizon Grid  | 0.01088 / 0.05281 / 0.05122    | 0.08023 / 0.05532 / 0.04201             |
| Shard Crown   | 0.00808 / 0.01964 / 0.05020    | 0.12918 / 0.11952 / 0.07502             |

Horizon Grid's fixed-threshold edge proxy flattens slightly from mid to peak as fine perspective cells are filtered; the normalized structural/motion gate passes it, and its moving micro-cells/circuit layer remain the peak cue. This exception is exposed for owner judgement rather than claimed as a monotonic edge series. All 18 captures have WebGL/non-finite **0**.

Executed: `npm run contact -- --sheet ladder --family pulse --port 48202 --out artifacts/contact/pulse-rework-ladder`.

## Isolated reference-rig timing

**PASS:** one real-GPU run, Apple M3 Pro through ANGLE Metal, **1920×1080**, live energy **0.95**, **30 seconds per form**. The 34 ms p99 limit passes for every form, with GPU errors/non-finite **0**, no step reduction and no quality downgrade.

| Form | Frames | p50 ms | p95 ms | p99 ms   | Max ms |
| ---- | ------ | ------ | ------ | -------- | ------ |
| 0    | 1801   | 16.7   | 17.5   | **17.6** | 17.7   |
| 1    | 1802   | 16.7   | 17.5   | **17.6** | 25.1   |
| 2    | 1801   | 16.7   | 17.6   | **17.6** | 17.7   |
| 3    | 1802   | 16.7   | 17.5   | **17.6** | 17.7   |

`mkdir /tmp/phosphor-rig.lock` acquired the atomic lock. The prescribed `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"` checks were empty immediately before and after the run (exit 1 means no matches); no sibling headless render load was observed. The lock was released with `rmdir /tmp/phosphor-rig.lock`, and the next lane was notified. No timing retry was needed.

Executed: `npm run timing -- --rig --family pulse --port 48206 --out artifacts/timing/pulse-rework`.
Retained result: `/tmp/phosphor-wt-pulse/artifacts/timing/pulse-rework/pulse.json`.

## Owner judgement and limits

Judge the four grayscale identities, order the energy ladders at a glance, and approve sustained peak-time motion, kick cuts, layering and alternate-aspect composition. Cross-family metric flags are candidates for visual review, not automatic aesthetic verdicts.

The energy score is a normalized structure/motion proxy, not an excitement score. Resolved edge density may flatten when finer cells are correctly filtered; increasing mean luminance is not an energy criterion. Short 150 BPM limited-output traces and white-ink cut checks do not certify photosensitivity safety or replace the external-display endurance gate. Cross-family comparisons use this checkout's other scenes, not concurrent lanes' unmerged reworks. No shared contract changes are requested.
