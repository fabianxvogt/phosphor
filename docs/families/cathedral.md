# Cathedrals of Error — headliner rework sign-off packet · 2026-10-08

**Rework: awaiting owner sign-off (D60/D62).** The original family was approved under D51; D60 keeps it playable while this rework is reviewed. Classification: **INCREMENTAL / EMPIRICAL**. Pixel metrics are not artistic approval, flash-safety certification or long-show evidence.

## What changed visually

- Distance fog now carries the selected palette. Oblique in-scattered light sheets accumulate on the existing primary ray; the density/frequency of the sheets increases with energy, without another volume/shadow march.
- Three SDF samples add ambient occlusion to stone and crystal shading, preserving transmitted/emissive glass light rather than flattening everything with AO.
- Stained-glass palette influence rises from **0.32 to 0.78**. A 22% material-hue contribution, cell-leading, facet shading, specular/rim response and bounded tonemapping retain the glass/material character; the palette library now reads clearly.
- The shared, already-smoothed 120 ms low-band envelope drives capped emissive pane/facet accents and in-scattered glow. The previous onset-only accent is replaced; energy is not an exposure/glow curve.
- Energy drives speed/detail, banking and a bounded 7% ray-camera FOV kick using the shared clock envelope. Camera travel/crystal rotation integrate in two RGBA8 texels (one phase texel plus quantization residuals), so speed glides do not reinterpret elapsed time and tiny speeds are not lost to 16-bit phase rounding. Camera harmonics wrap after forty bays; crystal/satellite harmonics after 100 turns.

## Structural types

| Geometry     | Low → peak structure and motion                                                                                                           | Authored look              |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 0 · Vaults   | Broad Gothic bays → more recessed tracery, faster traversal and banking.                                                                  | Prismatic Nave             |
| 1 · Crystals | Solid octahedral relic → real axial apertures through the relic, growing satellite facets, closer/faster orbit and stronger light sheets. | Opal Reliquary             |
| 2 · Roses    | Broad stained-glass disk → an open sixteen-spoke skeleton with nested raised rings, a more active frontal camera and denser shafts.       | Midnight Rose              |
| 3 · Folded   | Broad staggered folded planes → more ribs, finer diagonal lead and faster oblique traversal.                                              | Enamel Glide / Ember Vault |

Recursion is fractional: each generation's width/radius grows continuously, capped at four. The crystal's carved passages and rose's radial openings change actual SDF coverage, not merely surface brightness or engraving. Ultra-wide crystal chambers/rose arcades remain in place.

## Structural energy gate · minimum 0.15

Same compact D60 conditions: SwiftShader, 160×90, seed 17, 60 warm frames, 12 samples at 30 Hz (stride 2), base energy 0.5, levels 0.1 and 0.9. Brightness/contrast/uniform tint cancel in the normalized metric; the score is `hypot(structure difference, motion difference)`.

| Geometry | Before score      | After structure | After motion difference | After score | Result |
| -------- | ----------------- | --------------- | ----------------------- | ----------- | ------ |
| 0        | 0.2296            | 0.3374          | 0.0358                  | 0.3393      | PASS   |
| 1        | **0.1147 · FAIL** | 0.2810          | 0.0122                  | **0.2813**  | PASS   |
| 2        | **0.1231 · FAIL** | 0.2643          | 0.0080                  | **0.2644**  | PASS   |
| 3        | 0.2045            | 0.1899          | 0.0636                  | 0.2002      | PASS   |

Before values are **REPORTED** by the parent from the D60 run (its temporary worktree/JSON was deleted), not a re-executed baseline. After values are **EMPIRICAL** from:

```sh
npm run contact -- --sheet energy --family flight,cathedral --seed 17 --width 160 --height 90 --frames 60 --samples 12 --stride 2 --port 48220 --out artifacts/contact/headliners-energy-after
```

Sheet: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-energy-after/index.html`; exact values and GL/non-finite counts: adjacent `metrics.json`. Crystal and rose low/peak PNG pairs were inspected: high energy opens visible holes instead of re-exposing the same opaque surface. Nave/fold peak structures also remain readable. All sixteen family/energy captures: GL errors 0, non-finite inputs 0.

## Grayscale distinctness · near threshold 0.25

```sh
npm run contact -- --sheet types --seed 17 --width 160 --height 90 --frames 60 --port 48221 --out artifacts/contact/headliners-types-after
```

All 66 declared types used the same palette and energy 0.5. Cathedral: **zero within-family near pairs**; minimum 0.2804 (Vaults ↔ Folded), so no new near pair. Exact distances below were recomputed from the lossless grayscale PNGs with the repository's `structureSignature`/`structureDistance` functions.

| Pair  | Distance |
| ----- | -------- |
| 0 ↔ 1 | 0.8759   |
| 0 ↔ 2 | 0.4938   |
| 0 ↔ 3 | 0.2804   |
| 1 ↔ 2 | 0.4792   |
| 1 ↔ 3 | 0.9794   |
| 2 ↔ 3 | 0.6239   |

**Cross-family near pairs involving Cathedral: none.** Nearest neighbours: geometry 0 → Flight path 1 (0.3686); geometry 1 → Phase arc 1 (0.2762); geometry 2 → Interference composition 1 (0.4397); geometry 3 → Feedback geometry 2 (0.3277). The all-family sheet flags 122 pairs involving other families only; that is not a claim that those other families passed. This compact sheet is not numerically comparable to the original 480×270/120-frame packet.

Sheet: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-types-after/index.html`; findings and all eight headliner types' GL/non-finite zeros: adjacent `metrics.json`.
Full within-family and nearest-cross distances: adjacent `headliner-distances.json`.

## Audio, kick and palette regression

The actual shaders were tested at fixed scene time, without compositor bloom/flash, at 160×90. Low-band 0→1 changes mean RGB by 0.06876 / 0.02677 / 0.05272 / 0.05229 for geometries 0–3; 1→4 changes exactly zero (shader clamp). Quiet→kick ray-camera deltas are 0.12796 / 0.02849 / 0.09407 / 0.15143. Copper-like→ice-like palette deltas are 0.13761 / 0.08896 / 0.11894 / 0.13919. All captures: GL errors 0, non-finite inputs 0.

```sh
node tests/headliners-render.test.mjs --port 48225 --quick --out artifacts/contact/headliners-hero
```

2/2 tests passed. Evidence: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-hero/metrics.json`.

## Correctness, aspect and governor tiers

```sh
node tests/headliners-render.test.mjs --port 48225 --width 640 --height 360 --out artifacts/contact/headliners-final-probes
```

PASS, 2/2 tests, 1,082.2 seconds on SwiftShader. All eight headliner types rendered at peak energy in **640×360 (16:9), 1280×360 (32:9) and 480×480**, at **96 / 64 / 40 ray steps**: 72 PNG captures, none blank; GL errors 0, non-finite uploads 0, textures accounted. Oversize-source checks preserved the exact native-aspect shading cap (Cathedral 1280 pixels wide). Fixed-time audio/kick/palette checks passed on the final shader.

The actual Cathedral shader also passed camera-state checks: zero speed held pixels exactly (byte sum delta 0); a speed glide at model time 300 s changed no pixels before the next tick (delta 0); speed 0.01 integrated visibly after 30 fixed ticks (byte sum delta 1,413,895). This catches both elapsed-time teleporting and lost sub-quantum speeds. Evidence: `/tmp/phosphor-wt-headliners/artifacts/contact/headliners-final-probes/metrics.json` and its named PNGs.

Wide reliquary/fold and square rose PNGs were inspected: the wide chamber carries the crystal onto the flanks, the rose retains circular/perspective framing, and folded planes still read at 40 steps. Square framing naturally crops peripheral lancets. Fine lead/engraving aliases in the emergency tier; that remains an owner/venue judgement, not a smoke-test failure.

## Isolated real-GPU timing · p99 limit 34 ms

The shared baseline was executed by the FloatPost lane against the identical unchanged original distribution `80debabd85b4482c`, using the D54-corrected runner. Its retained JSON was inspected here: Chrome / ANGLE Metal / Apple M3 Pro, 1920×1080, default energy 0.95, 30 seconds and 1,801–1,802 frame samples per geometry, p50 16.7 ms throughout.

| Geometry | Before p99 (ms) | After p99 (ms) | Result |
| -------- | --------------- | -------------- | ------ |
| 0        | 17.7            | 17.6           | PASS   |
| 1        | 17.7            | 17.7           | PASS   |
| 2        | 17.6            | 17.7           | PASS   |
| 3        | 17.7            | 17.6           | PASS   |

Baseline command (executed by FloatPost):

```sh
npm run timing -- --rig --family cathedral --port 48232 --out artifacts/timing/d56-before-isolated
```

Baseline JSON: `/Users/fabian/Development/phosphor/artifacts/timing/d56-before-isolated/cathedral.json`. GPU errors, non-finite inputs, step reductions and downgrades: all zero. FloatPost reports an atomic `mkdir /tmp/phosphor-rig.lock` before the run, `rmdir` after it, and no competing process before or after under `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"`. An earlier contaminated Cathedral baseline was discarded, not used in this table. This shared before evidence avoids a duplicate baseline rig slot.

After command (executed in this worktree, one run only):

```sh
npm run timing -- --rig --family cathedral --port 48223 --out artifacts/timing/headliners-after
```

**After PASS:** unchanged rig/1920×1080/default 0.95/30 seconds per geometry, 1,801–1,802 samples per geometry, p50 16.7 ms throughout, maximum 25.6 ms. GPU errors/non-finite/step reductions/downgrades: all zero. After JSON: `/tmp/phosphor-wt-headliners/artifacts/timing/headliners-after/cathedral.json`; distribution `96f79985a2527d97`.

An atomic `mkdir /tmp/phosphor-rig.lock` held Cathedral's own lease after Flight released its lock. **No other lanes' headless renders were detected:** prescribed `pgrep -fl "contact.mjs|test-browser|test.mjs.*--port|timing"` returned no processes before and after Cathedral. All this lane's heavy renders had finished first; the final lock was removed and the queue released.

## Verification and integration limits

`npm test`: **174 passed, 0 failed, 5 opt-in skips**. `npm run typecheck` passed. `npm run build` built 51 reachable assets (`96f79985a2527d97`). The direct headliner probe passed separately as recorded above. The legacy Cathedral opt-in probe now asserts D60's normalized structure/motion gate instead of requiring monotonically rising single-frame edge counts; it was not separately re-rendered after the owner's wrap-up instruction.

The compact energy/type sheets are 160×90, not full-resolution artistic certification. The timing/render evidence here uses this branch's pre-D56 byte-target platform. Main must recheck the integrated float/post path and the cross-family matrix after the other family reworks land; those shared files are outside this lane. Cathedral retains its local glass shoulder to preserve the byte-fallback material look; it does not yet emit HDR values above white.

## Budgets, owner decisions and limits

The primary march remains capped by `min(authored steps, 96, u_raySteps)`. In-scattering reuses the primary distance samples; AO uses three extra SDF samples only on hits. `maxRenderWidth` remains 1280 and the native aspect is preserved. Glow stays an authored control and master remains the shared brightness control; no flash path is added.

Owner must judge structural diversity, blind energy ordering, the open reliquary/rose at peak, atmosphere, palette readability and banking comfort on the venue screen. Compact pixel metrics cannot approve movement or taste. Procedural stained glass and in-scattering are artistic approximations, not physical optics; recursion stays bounded at four generations. Fine lead/engraving can alias at low pixel budgets; the 40-step emergency tier is not owner art approval. No shared contract change is requested.
