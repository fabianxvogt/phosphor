# Interference Rituals — family sign-off packet

2026-10-08 · `family/interference` · scene commit `d5495dc` · **INCREMENTAL / EMPIRICAL**; no formal optical-model claim.
Draft awaiting owner art approval and isolated real-GPU timing; technical evidence is recorded below.

## Types and authored looks
- **0 · Moire curtains:** near-parallel planar waves produce diagonal sweeping envelopes; Moire Veil / Tempo Veil.
- **1 · Paired ripples:** two circular wave sources form a central interference saddle; Twin Tides / Ripple Resonance.
- **2 · Crossed gratings:** intersecting planar directions form a lattice of moving cells; Golden Lattice / Crossed Loom.
Merged orbit → crossed gratings, petal → paired ripples, horizon → moire curtains; their presets became Crossed Loom, Ripple Resonance and Tempo Veil. All six authored looks remain bounded.

## Grayscale distinctness
The 480×270, 120-frame, energy-0.5 sheet uses one seed, palette and base preset for all types.
Baseline: six declarations, near pairs 2/3 = 0.1865 and 4/5 = 0.2352. After cutover: three types, no near pair below 0.25.

| Type | Distances to other interference types | Nearest cross-family type |
| --- | --- | --- |
| 0 | 1: .3305 · 2: .5034 | Fractal Flight · path 1: .3756 |
| 1 | 0: .3305 · 2: .3448 | Magnetic Choir · flow 2: .3503 |
| 2 | 0: .5034 · 1: .3448 | Acid Mycelium · composition 4: .4205 |
Final `npm run contact -- --sheet types --port 48122 --out artifacts/contact/interference-all-types` comparison: 320 flags globally, **none involving interference** below .25.

## Energy ladder (0.1 / 0.5 / 0.9)
All eighteen PNGs inspected: each geometry progresses from broad/soft to denser/sharper, with hard-edged peak bands.
Transport motion rises for every authored look; spatial-frequency factors are 0.48 / 1 / 1.52 and midpoint contrast factors 0.56 / 1 / 1.44.
No energy brightness gain or audio brightness lift is authored; master stays responsible for brightness. Contrast/pigment changes need not conserve mean luminance.

| Type · representative preset | Mean luminance | Edge density | Technical ladder verdict |
| --- | --- | --- | --- |
| 0 · Moire Veil | .0706 / .0747 / .1030 | .0000 / .0000 / .0657 | Ordered detail/contrast; low motion can hold still |
| 1 · Twin Tides | .0523 / .0529 / .0530 | .0000 / .00002 / .00070 | Ordered rings/contrast; saturated blue suppresses this edge proxy |
| 2 · Golden Lattice | .0583 / .0678 / .0835 | .0007 / .0528 / .0972 | Ordered cell density/contrast |
Ripple Resonance also increases edges .00005 / .0165 / .0501; fixed-threshold edges are not an aesthetic or motion verdict.

## Aspect and correctness
All three types inspected at 640×360, 1280×360 and 480×480: native aspect coordinates preserve geometry, subjects stay visible, no empty bands; WebGL/non-finite = 0 throughout.
Aspect-specific metric warnings: ultrawide 0/1 = .2021; square 1/2 = .1331. Standard 16:9 distinctness passes; owner must judge these alternate compositions.
`node --test tests/interference.test.mjs`: baseline one metadata failure; after cutover 3/3 pass (presets, energy transport, shared kick weights).
`npm test`: **133/133 pass**. `npm run build`: pass, 47 reachable assets.
`node scripts/test-browser.mjs --only lab --port 48122`: **pass**, all 104 looks non-blank, WebGL 0, non-finite 0, textures accounted; every family passes energy extremes, 32:9/square/portrait and fade/no-leak checks (Chrome 156, software GPU).
Shared punch 1 / pulse 1.2 gives +5.7704% zoom / +40.3928% pulse at energy .9. Rest/kick PNGs inspected for all three types with automatic flash disabled; normalized mean RGB differences .1556 / .1879 / .2216 demonstrate visible shared-layer response.

## Contact sheets (absolute paths; copied into the main checkout's `artifacts/` at merge)
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-types/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-ladder/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-16x9/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-ultrawide/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-square/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-all-types/index.html`
- `/Users/fabian/Development/phosphor/artifacts/contact/interference-probe/metrics.json` (nearest matrix and six `type-N-rest/kick.png` frames in this directory).
Every contact command uses headless software rendering and `--port 48122`; artifacts are local, not committed.

## Owner decision and limits
Judge grayscale type identity, order every ladder at a glance, approve peak-time looks and alternate-aspect framing. Art sign-off has not been executed.

**Rig timing PASS (2026-10-08, parent):** `npm run timing -- --rig --family interference`, Chrome on the M3 Pro (ANGLE Metal, built-in display), 1920×1080, energy 0.95, 30 s per type, with two headless lanes loading the CPU (load average ≈ 34): p50 16.7 ms, p99 17.6 ms for all three types, max 24.9 ms, GPU errors 0, non-finite 0, no step reduction or downgrade.
One field removes the interference envelope and reduces planar types to gratings. Fine unresolved carriers are deliberately filtered, not guaranteed to survive every screen/ratio.
Old saved clips containing removed composition values 3–5 no longer validate; a saved show holding one now falls back to a new set while the original stays in local storage under `phosphor-set-v3-unreadable` (platform safeguard added at merge). Reauthor such clips.
Cross-family comparisons use this worktree's 103921c-derived scene set, not other lanes' unmerged revisions.
The combined all-family sheet + initial supplementary probe hit its 1800 s deadline after the sheet was written. The scoped kick probe completed separately in 26 s without async health waits; its temporary helper was removed. This is not a rig-timing result.
