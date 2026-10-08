# Fractal Flight sign-off packet · 2026-10-08

**Headless checklist complete; D47 draft pending owner art approval and isolated real-GPU timing.** Classification: **INCREMENTAL / EMPIRICAL**; no research novelty claim.

## Types and recommended looks
| Path | Structural description | Authored look |
| --- | --- | --- |
| 0 · Corridor | Axial flight through nested square sponge portals, with a small transverse sway. | Long Corridor |
| 1 · Corkscrew | Helically twisted sponge walls, orbiting camera, oblique forward view and travel-coupled roll. | Corkscrew |
| 2 · Shaft | Descending camera looking across a three-times-taller lattice of vertical apertures. | Mine Shaft |
| 3 · Inner tunnels | Level-one side passage looking diagonally into successive small junctions. | Narrows |

## Grayscale distinctness · threshold .25
| Comparison | Distance |
| --- | --- |
| Flight 0 ↔ 1 | .422 |
| Flight 0 ↔ 2 | .486 |
| Flight 0 ↔ 3 | .711 |
| Flight 1 ↔ 2 | .377 |
| Flight 1 ↔ 3 | .546 |
| Flight 2 ↔ 3 | .447 |
| Flight 0 nearest other: Interference composition 4 | .425 |
| Flight 1 nearest other: Julia map 0 | .552 |
| Flight 2 nearest other: Julia map 0 | .453 |
| Flight 3 nearest other: Julia map 0 | .686 |
`contact --sheet types --family flight` passes all six pairs. Final `contact --sheet types` across 69 types flags **no cross-family pair below .25 involving flight**. Exact distances: `node tests/flight-render.test.mjs --port 48126 --matrix artifacts/contact/flight-all-types` (all browser commands used port 48126, headless only).

## Energy ladder · technical verdict, owner ordering pending
| Path | Mean luminance 0.1 / 0.5 / 0.9 | Edge density 0.1 / 0.5 / 0.9 | PNG verdict |
| --- | --- | --- | --- |
| 0 | .102 / .202 / .217 | .013 / .038 / .101 | Ordered: sparse portals → perforated walls → dense nested detail. |
| 1 | .092 / .236 / .367 | .009 / .031 / .161 | Ordered: broad spiral surfaces → apertures → recursive spiral lattice. |
| 2 | .105 / .252 / .201 | .020 / .029 / .093 | Ordered: tall apertures → smaller openings → dense vertical lattice. |
| 3 | .123 / .473 / .241 | .009 / .020 / .105 | Ordered: bare junction → pierced chamber → densely carved junction. |
All 18 PNGs inspected; Ember Drift and Neon Spiral also order clearly with rising edges. Mean luminance is intentionally not an energy-ordering criterion (shaft/inner-tunnel peak frames are darker than mid). At base energy .5, motion speed scales .265× / 1× / 1.735×; recursion, fixed-pivot contrast and shared beat response rise. Neither headlight nor master gets an energy curve.

## Motion, safety and governor
Travel and roll integrate in one RGBA8 texel instead of multiplying the current speed/roll by elapsed time. Fractional recursion levels open new holes continuously; the type selector remains discrete. Camera cores stay in free space at every opening, including ±12% continuous parameter drift; the corkscrew distance field includes a conservative twist bound.
`node tests/flight-render.test.mjs --port 48126` passed: all four paths at energy 0.1/0.5/0.9, model times 0/60/300 s, both 96 and 64 ray steps (72 frames), WebGL/non-finite inputs zero. The actual shader's full travel cycle was sampled at minimum opening: clearance >0.05. Tiny speed/roll edits at minute five changed no pixels before the next tick (byte delta 0).
PNG inspection: portal/curl/shaft/junction structures remain readable at 64 steps. Across the sampled frames, minimum 64/96 mean-luminance ratio 0.867 and edge-density ratio 0.828; this is correctness/legibility evidence, not rig timing.
Beat weights are `punch: 1.3, pulse: 1`. `node tests/flight-render.test.mjs --port 48126 --beat-only` passed at energy .9 / 64 steps with automatic flash disabled: all four quiet/kick PNG pairs inspected, distances .200 / .242 / .189 / .240, punch .075 and pulse .337. This isolates the shared kick responses; it is not a flash-safety certification.

## Correctness and aspect
`npm test`: 138/138 passed, including bounded authored looks for every path and portable preset round trips. `npm run build && node scripts/test-browser.mjs --only lab --port 48126`: passed; 47 built assets, all 104 looks non-blank, WebGL 0, non-finite 0, textures accounted; extreme-energy, aspect and fade checks passed.
`contact --sheet types --family flight --width W --height H` at 640×360, 1280×360 and 480×480: all four types rendered and all 12 PNGs inspected, no stretching, lost subject or empty bands. The 960-pixel shading cap preserves aspect; no screen-shape crop or fixed simulation frame was introduced.

## Local evidence
- Long-run/64-step PNGs and metrics: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-probe/`
- Grayscale types (120 frames, four types, zero same-family flags below .25): `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-types/index.html`
- All six authored ladders: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-ladder/index.html`
- 640×360: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-16x9/index.html`
- 1280×360: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-wide/index.html`
- 480×480: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-square/index.html`
- Final all-family sheet: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-all-types/index.html`
- Exact within/nearest distances: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-distances/distances.json`
- Isolated quiet/kick PNG pairs and metrics: `/Users/fabian/Development/phosphor-worktrees/family-flight/artifacts/contact/flight-beat/`

## Owner decisions and known limits
Owner must judge grayscale structural diversity, blind ordering of every energy ladder, presets/palettes, spiral-motion comfort and small-hole aliasing. Parent runs `npm run timing -- --rig --family flight` alone on the reference display (not run in this lane). These are the two remaining sign-off parts; no platform/contract blocker was found.
The six-unit travel cycle repeats continuously; Random glides vary its look, not its camera topology. Travel and roll are 16-bit phases (approximately 0.000092 distance units / 0.000096 radians per quantum); extremely small roll rates can quantize to zero. Fine recursion can shimmer, particularly at low pixel budgets. The 40-step tier and real-GPU p99 are not established here.
