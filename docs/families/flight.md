# Fractal Flight — headliner rework sign-off packet · 2026-10-08

**Rework: awaiting owner sign-off (D60/D62).** The original family was approved under D51; D60 keeps it playable while this rework is reviewed. Classification: **INCREMENTAL / EMPIRICAL**. Pixel metrics are not artistic approval, flash-safety certification or long-show evidence.

## What changed visually

- Palette-tinted distance atmosphere replaces fading all distant geometry to black. Oblique in-scattered light sheets accumulate along the existing governed ray, giving the passages illuminated depth without a second volume/shadow march.
- Three SDF samples shade recesses; the old ray-iteration-count approximation of ambient occlusion is removed. Four tetrahedral normal samples offset some of the added SDF cost.
- Float picture targets may retain emissive values above white; the RGBA8 fallback still clips identically. Palette values stay display-encoded, matching the shared D56 picture path.
- Emissive rims/near-miss edges and scattered light follow the capped low-band envelope (`u_bass`, already smoothed by the shared audio bus over 120 ms), with stronger accents at peak energy. This maps audio to emission, not traversal or the master.
- The declared energy curves still drive integrated speed, recursion, fog and authored roll. Energy adds travel-coupled banking; a bounded 7% ray-camera FOV kick uses the clock's existing `exp(-fract(u_beat) * 7)` envelope and complements the shared punch/palette pulse. No new flash path is added.

## Structural types

| Path              | Structure and motion                                                                   | Authored look |
| ----------------- | -------------------------------------------------------------------------------------- | ------------- |
| 0 · Corridor      | Axial flight through nested square sponge portals, transverse sway and energy banking. | Long Corridor |
| 1 · Corkscrew     | Twisted sponge walls, orbiting camera, oblique forward view and travel-coupled roll.   | Corkscrew     |
| 2 · Shaft         | Descending camera across a three-times-taller lattice of vertical apertures.           | Mine Shaft    |
| 3 · Inner tunnels | Level-one side passage looking diagonally into successive small junctions.             | Narrows       |

## Structural energy gate · minimum 0.15

Same compact D60 conditions: SwiftShader, 160×90, seed 17, 60 warm frames, 12 samples at 30 Hz (stride 2), base energy 0.5, levels 0.1 and 0.9. Brightness/contrast/uniform tint cancel in the normalized metric; the score is `hypot(structure difference, motion difference)`.

| Path | Before score | After structure | After motion difference | After score | Result |
| ---- | ------------ | --------------- | ----------------------- | ----------- | ------ |
| 0    | 0.4802       | 0.4772          | 0.0771                  | 0.4834      | PASS   |
| 1    | 0.3545       | 0.3422          | 0.0799                  | 0.3514      | PASS   |
| 2    | 0.4078       | 0.4180          | 0.0823                  | 0.4261      | PASS   |
| 3    | 0.3683       | 0.4122          | 0.0872                  | 0.4213      | PASS   |

Before values are **REPORTED** by the parent from the D60 run (its temporary worktree/JSON was deleted), not a re-executed baseline. After values are **EMPIRICAL** from:

```sh
npm run contact -- --sheet energy --family flight,cathedral --seed 17 --width 160 --height 90 --frames 60 --samples 12 --stride 2 --port 48220 --out artifacts/contact/headliners-energy-after
```

Sheet: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-energy-after/index.html`; exact values and GL/non-finite counts: adjacent `metrics.json`. Inspected corridor/spiral/shaft/junction peak PNGs and shaft/junction low PNGs: recursive holes and direction remain readable; energy is not luminance ordering.

## Grayscale distinctness · near threshold 0.25

```sh
npm run contact -- --sheet types --seed 17 --width 160 --height 90 --frames 60 --port 48221 --out artifacts/contact/headliners-types-after
```

All 66 declared types used the same palette and energy 0.5. Flight: **zero within-family near pairs**; minimum 0.4307 (Corridor ↔ Corkscrew), so no new near pair. Exact distances below were recomputed from the lossless grayscale PNGs with the repository's `structureSignature`/`structureDistance` functions.

| Pair  | Distance |
| ----- | -------- |
| 0 ↔ 1 | 0.4307   |
| 0 ↔ 2 | 0.6606   |
| 0 ↔ 3 | 0.7485   |
| 1 ↔ 2 | 0.4846   |
| 1 ↔ 3 | 0.6841   |
| 2 ↔ 3 | 0.5984   |

**Cross-family near pairs involving Flight: none.** Nearest neighbours: path 0 → Feedback geometry 3 (0.3569); path 1 → Cathedral geometry 0 (0.3686); path 2 → Julia map 3 (0.4801); path 3 → Feedback geometry 1 (0.6503). The all-family sheet flags 122 pairs involving other families only; that is not a claim that those other families passed. This compact sheet is not numerically comparable to the original 480×270/120-frame packet.

Sheet: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-types-after/index.html`; findings and all eight headliner types' GL/non-finite zeros: adjacent `metrics.json`.
Full within-family and nearest-cross distances: adjacent `headliner-distances.json`.

## Audio, kick and palette regression

The actual shaders were tested at fixed scene time, without compositor bloom/flash, at 160×90. Low-band 0→1 changes mean RGB by 0.04856 / 0.04162 / 0.02457 / 0.05451 for paths 0–3; 1→4 changes exactly zero (shader clamp). Quiet→kick ray-camera deltas are 0.16373 / 0.17284 / 0.16268 / 0.12983. Copper-like→ice-like palette deltas are 0.35456 / 0.36784 / 0.45416 / 0.38359. All captures: GL errors 0, non-finite inputs 0.

```sh
node tests/headliners-render.test.mjs --port 48225 --quick --out artifacts/contact/headliners-hero
```

The regression first failed against the original shader: Flight path 0 low-band delta exactly 0; after the change, 2/2 tests passed. Evidence: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-hero/metrics.json`.

## Correctness, aspect and governor tiers

```sh
node tests/headliners-render.test.mjs --port 48225 --width 640 --height 360 --out artifacts/contact/headliners-final-probes
```

PASS, 2/2 tests, 1,082.2 seconds on SwiftShader. All eight headliner types rendered at peak energy in **640×360 (16:9), 1280×360 (32:9) and 480×480**, at **96 / 64 / 40 ray steps**: 72 PNG captures, none blank; GL errors 0, non-finite uploads 0, textures accounted. Oversize-source checks preserved the exact native-aspect shading cap (Flight 960 pixels wide). The same fixed-time audio/kick/palette checks passed on the final shader.

Wide corkscrew/shaft and square inner-tunnel PNGs were inspected: the structures fill the native frame without stretching or empty aspect bands; oblique views may naturally crop portals. These are smoke/legibility observations, not owner art approval of the 40-step emergency tier. Evidence: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-final-probes/metrics.json` and its named PNGs.

## Isolated real-GPU timing · p99 limit 34 ms

The shared baseline was executed by the FloatPost lane against the identical unchanged original distribution `80debabd85b4482c`, using the D54-corrected runner. Its retained JSON was inspected here: Chrome / ANGLE Metal / Apple M3 Pro, 1920×1080, default energy 0.95, 30 seconds and 1,801 frame samples per path, p50 16.7 ms throughout.

| Path | Before p99 (ms) | After p99 (ms) | Result |
| ---- | --------------- | -------------- | ------ |
| 0    | 17.6            | 17.6           | PASS   |
| 1    | 17.6            | 17.6           | PASS   |
| 2    | 17.7            | 17.7           | PASS   |
| 3    | 17.6            | 17.6           | PASS   |

Baseline command (executed by FloatPost):

```sh
npm run timing -- --rig --family flight --port 48231 --out artifacts/timing/d56-before
```

Baseline JSON: `/Users/fabian/Development/phosphor/artifacts/timing/d56-before/flight.json`. GPU errors, non-finite inputs, step reductions and downgrades: all zero. FloatPost reports an atomic `mkdir /tmp/phosphor-rig.lock` before the run, `rmdir` after it, and no competing contact/test-browser process before or after; the broader final isolation expression is `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"`. This shared before evidence avoids a duplicate baseline rig slot.

After command (executed in this worktree, one run only):

```sh
npm run timing -- --rig --family flight --port 48222 --out artifacts/timing/headliners-after
```

**After PASS:** unchanged rig/1920×1080/default 0.95/30 seconds per path, 1,801–1,802 samples per path, p50 16.7 ms throughout, maximum 17.8 ms. GPU errors/non-finite/step reductions/downgrades: all zero. After JSON: `/tmp/phosphor-wt-headliners/artifacts/timing/headliners-after/flight.json`; distribution `96f79985a2527d97`.

An atomic `mkdir /tmp/phosphor-rig.lock` held the isolated Flight window; `rmdir` released it before Cathedral reacquired its own lease. **No other lanes' headless renders were detected:** prescribed `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"` returned no processes both before and after Flight. All this lane's heavy renders had finished first.

## Verification and integration limits

`npm test`: **174 passed, 0 failed, 5 opt-in skips**. `npm run typecheck` passed. `npm run build` built 51 reachable assets (`96f79985a2527d97`). The direct headliner probe passed separately as recorded above; no optional re-renders were added after the owner's wrap-up instruction.

The compact energy/type sheets are 160×90, not full-resolution artistic certification. The timing and rendering evidence here uses this branch's pre-D56 byte-target platform. Main must recheck the integrated float/post path and the cross-family matrix after the other family reworks land; those shared files are outside this lane. Float targets may retain Flight's unclipped emissive highlights, while byte fallback clips as before.

## Budgets, owner decisions and limits

The primary march remains capped by `min(96, u_raySteps)`; scattering reuses its distance samples and AO is three extra samples only on hits. `maxRenderWidth` remains 960 and the native aspect is preserved. The one-texel RGBA8 travel/roll integrator and guaranteed free-space camera cores remain unchanged, so speed/roll glides do not reinterpret elapsed time.

Owner must judge the four grayscale compositions, energy ordering, new atmospheric depth, palette readability, corkscrew/banking comfort and small-hole shimmer on the venue display. The six-unit path cycle repeats; extremely small Flight roll/speed increments can quantize in its existing 16-bit integrator. Fine recursion can alias at low pixel budgets. The cheap in-scattering is an authored lighting approximation, not physical volumetrics; the 40-step emergency tier is not owner art approval. No shared contract change is requested.
