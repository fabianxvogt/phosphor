# Interference Rituals — D60 rework sign-off packet

**Gate: awaiting owner sign-off.** The D51 approval covered the previous flat-field design, not this rework. Technical results below are empirical evidence, not artistic approval or a formal optical-model claim.

2026-10-08 · `family/interference-rework` · existing `composition` ids **0 / 1 / 2**, all eight parameter keys, bounds and six authored look names retained. Saved sets need no migration.

## Types and visual intent

- **0 · Receding floors — Moire Veil / Tempo Veil:** circular wave sources on three parallel planes seen at an oblique angle. Foreshortening, distance attenuation and depth-dependent camera drift make the interference recede toward a raised horizon. The open sky is intentional negative space, not letterboxing or cover-cropping.
- **1 · Ripple vault — Twin Tides / Ripple Resonance:** spherical wave sources on concentric cylindrical shells. A reciprocal-radius projection forms a deep, round tunnel; sources at different depths break the rings into asymmetric moire lobes.
- **2 · Lattice screens — Golden Lattice / Crossed Loom:** transparent, tilted rectangular wave planes at three perspective depths. Crossed gratings advect through each screen; outboard screens repeat on wide walls. This has a framed, angular layout rather than being a second tunnel.

The floor, round vault and suspended screens have different silhouettes and projection geometry under the same palette. The earlier candidate used both a round and a box tunnel; their grayscale distances were too close, so the box tunnel was replaced by actual projected screens.

## Energy is structure and motion

For the first authored look, with its saved base energy 0.5:

| Response                                     |    0.1 |                         0.5 |    0.9 |
| -------------------------------------------- | -----: | --------------------------: | -----: |
| Sources per depth layer (`fields`)           |      1 |                           2 |      3 |
| Active depth layers                          |      2 | 3, far layer partly visible |      3 |
| Near-layer spatial frequency                 |   2.16 |                        4.40 |   6.64 |
| Motion multiplier relative to authored speed |  0.256 |                       1.000 |  1.744 |
| Palette-coordinate separation between layers | 0.0745 |                      0.2325 | 0.3905 |
| Hard-edged peak-mode blend                   |      0 |                           0 |  0.926 |

The scene declares the source-count and multiplicative motion curves in its energy metadata. Higher frequency also increases the apparent travel of the advected waves; energy does not merely oscillate the same stripes faster. The far surface enters gradually, and each surface uses its own perspective scale, parallax and distance attenuation. At peak there are at most three surfaces and nine sources.

`motion = 0` holds every surface at every energy; multiplicative scaling preserves that authored hold. `beatLock` remains the saved performer choice rather than being silently raised with energy. Its clock and free time advance at the same rate at 120 BPM; the shared speed trim still applies. Existing frequency ratio, phase, orientation and palette-phase controls remain live.

Colours come only from `palette()`. Layer separation, added geometry and edge hardening can change mean luminance, but there is no energy brightness multiplier: master remains the brightness control. Shared kick punch 1 / pulse 1.2 is unchanged; flashes remain in the engine's limited shared layer.

## Cost, filtering and limits

The shader is analytic: no raymarch, scene texture lookup, simulation or extra render target. Three depth surfaces are the fixed upper bound. Inactive surfaces and unused carrier/pair cosine evaluations are skipped with draw-uniform branches, so pixel derivatives remain coherent.

Carriers and pair differences are filtered separately over the pixel footprint, then tapered conservatively before Nyquist. A second-order sinc footprint avoids two additional trigonometric evaluations per wave. Resolvable moire envelopes survive when distant carriers become subpixel; unresolved detail is intentionally removed. Hard-edged peak bands use derivative-based antialiasing, not an unfiltered threshold.

Source travel follows bounded periodic orbits rather than accumulating an unbounded world offset that would eventually flatten spherical sources into distant plane waves. Carrier phase is wrapped on a period shared by its rational phase-speed coefficients; camera/source orbits have a separate shared period. These are analytic safeguards, **not an executed eight-hour endurance test**.

This is an artistic scalar-wave model, not an optical simulation. The normalized energy score is a structural/motion proxy, not an excitement, flash-safety or aesthetic verdict. The landscape's dark sky and the screens' negative space are authored layout decisions for the owner to judge.

## Portable contract regressions

- `npm test`: **174 passed, 4 opt-in probes skipped, 0 failed** (178 tests). The interference tests retain portable presets/composition ids, ordered motion, finite uniforms and shared kick response, and add source-count growth with an unchanged authored zero-motion hold and transport lock.
- `npm run typecheck`: passed.
- `npm run build`: passed, **51 reachable assets**, distribution revision `8d631d101a6b8651`. This generated the isolated timing distribution; build outputs are not committed.

The source-count/hold regression was red before the curve change: energy 0.9 turned an authored motion 0 into `0.3400000035762787`. It passed after replacing the additive motion curve with a multiplicative one and leaving beat lock authored.

## Render regressions and grayscale distinctness

`node tests/interference.test.mjs --port 48213`: **5/5 passed** on the software GPU. The opt-in render seam measures all three types at energy 0.1 / 0.9, requires score ≥ 0.15 and **high motion − low motion ≥ 0.01**, checks grayscale type identity, and exercises maximum source count, ratio, orientation and motion at energy 0.95 across 16:9 / 32:9 / square. Every render had GL errors 0, non-finite inputs 0 and 10 live textures / 10 accounted textures.

The first screen candidate only oscillated phase and failed its motion regression: delta **0.002866**. Advecting the wave sources through the fixed perspective screens raised its final compact delta to **0.028358**; the test was not weakened.

### Compact energy measurement

160×90 · seed 17 · authored base 0.5 · 24 warm-up frames · 12 samples at 30 Hz. The shared metric normalizes grayscale per frame, so uniform brightness, contrast and tint do not count.

| Composition         | Structure delta | Low motion | High motion | Motion delta |    Score |
| ------------------- | --------------: | ---------: | ----------: | -----------: | -------: |
| 0 · Receding floors |        0.318404 |   0.001767 |    0.020387 |     0.018620 | 0.318948 |
| 1 · Ripple vault    |        0.571612 |   0.002933 |    0.048605 |     0.045672 | 0.573433 |
| 2 · Lattice screens |        0.466672 |   0.001381 |    0.029739 |     0.028358 | 0.467533 |

All three clear the provisional **0.15** score threshold. Their motion deltas are **18.6–45.7× the reported previous upper bound of 0.001** ([D60 baseline](../EVIDENCE.md#2026-10-08--structural-energy-metric-d60-and-output-blackout-runner-d63)); this is a bounded proxy comparison, not a matched long-duration recording or owner sign-off.

### 320×180 energy contact sheet

The final energy sheet repeats the same seed, authored base, warm-up and sampling cadence at 320×180. GL errors / non-finite = **0 / 0** for all six energy renders.

| Composition         | Structure delta | Low motion | High motion | Motion delta |    Score |
| ------------------- | --------------: | ---------: | ----------: | -----------: | -------: |
| 0 · Receding floors |        0.335005 |   0.001748 |    0.025674 |     0.023926 | 0.335859 |
| 1 · Ripple vault    |        0.585754 |   0.002934 |    0.065151 |     0.062218 | 0.589049 |
| 2 · Lattice screens |        0.450987 |   0.001456 |    0.031646 |     0.030190 | 0.451996 |

All types also pass at this larger size; peak motion is **14.7× / 22.2× / 21.7×** their own low-energy motion. Both measured sizes show an absolute temporal change clearly above the previous ≤ 0.001 range.

### Type identity and native aspects

The 480×270 mid-energy grayscale sheet has **0 near pairs below 0.25**. The independent 320×180 render regression measured 0/1 = **0.548124**, 0/2 = **0.310136**, 1/2 = **0.513965**. One seed, palette and base preset are used across the types; colour is not the distinction.

All three types were inspected at 480×270, 1280×360 and 480×480. The wide/square sheets also have **0 near pairs below 0.25**, GL errors 0 and non-finite 0. Floor perspective, round vault and repeated outboard screens compose from native aspect coordinates rather than stretching or cover-cropping a fixed picture.

The complete authored ladder contains **18 frames** (all six looks × 0.1 / 0.5 / 0.9), inspected from broad quiet waves to denser, layered, colour-separated hard peak cells. Minimum downsample peak **111/255**; GL errors / non-finite **0 / 0** throughout. Mean luminance need not rise with energy and is not the ladder verdict.

Cross-family comparisons against the other concurrently reworked branches are not claimed by this packet; the merged scene set is the meaningful comparison target.

## Isolated reference-rig timing — passed

Exactly one rig run: `npm run timing -- --rig --family interference --port 48216 --out artifacts/timing/interference-rework`.

Installed Chrome · **ANGLE Metal Renderer: Apple M3 Pro** · **1920×1080** · show energy **0.95** · **30 seconds per type**, with the runner's 3-second warm-up before each. The retained summary reports `passed: true`, page errors `[]`.

| Composition         | Frames | p50 ms | p95 ms | p99 ms | Max ms |
| ------------------- | -----: | -----: | -----: | -----: | -----: |
| 0 · Receding floors |   1801 |   16.7 |   17.5 |   17.7 |   17.8 |
| 1 · Ripple vault    |   1802 |   16.7 |   17.5 |   17.7 |   17.8 |
| 2 · Lattice screens |   1803 |   16.7 |   17.5 |   17.6 |   17.7 |

Every type is below the **34 ms p99 gate**; GPU errors, non-finite inputs, step reductions and quality downgrades were **0** for every row.

`mkdir /tmp/phosphor-rig.lock` acquired the atomic lock before the run; it was held for the entire measurement and released with `rmdir`. The required `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"` checks immediately before and after timing both returned **no matches**. Other lanes explicitly held launches for this queue. Earlier preflight checks did find Headliners/Pulse/FloatPost headless work, so no timing was started then; the run above was not taken under that load and was not rerun.

Retained evidence: `/tmp/phosphor-wt-interference/artifacts/timing/interference-rework/interference.json`. Timing applies to this branch's renderer build, not an unmeasured merged renderer or an eight-hour venue run.

## Reproducible local artifact commands

Run from `/tmp/phosphor-wt-interference`. These are software-GPU art/correctness runs, not timing gates; each launch was withheld while the rig lock/reservation was active. Artifacts are local and uncommitted.

```sh
npm run contact -- --sheet types --family interference --width 480 --height 270 --frames 24 --seed 17 --port 48211 --out artifacts/contact/interference-rework-types-final
npm run contact -- --sheet ladder --family interference --width 320 --height 180 --frames 24 --seed 17 --port 48212 --out artifacts/contact/interference-rework-ladder
npm run contact -- --sheet energy --family interference --width 320 --height 180 --frames 24 --samples 12 --stride 2 --seed 17 --port 48210 --out artifacts/contact/interference-rework-energy
npm run contact -- --sheet types --family interference --width 1280 --height 360 --frames 12 --seed 17 --port 48214 --out artifacts/contact/interference-rework-ultrawide
npm run contact -- --sheet types --family interference --width 480 --height 480 --frames 12 --seed 17 --port 48215 --out artifacts/contact/interference-rework-square
node tests/interference.test.mjs --port 48213
```

Each contact directory contains `index.html`, `metrics.json` and the PNGs. The opt-in regression writes `artifacts/contact/interference-rework-probe/metrics.json`.

## Owner decision

Technical structural/motion, distinctness, aspect, correctness and isolated timing checks pass. **Awaiting owner sign-off** on the three new projection grammars, the six ladders, colour-separated hard peak looks and intentional negative space. The old D51 art approval is not reused as approval of these changed visuals.

No shared-contract change is requested.
