# Causal Tapestry — family sign-off packet

**2026-10-08 · INCREMENTAL / EMPIRICAL · draft until owner art approval and isolated real-GPU timing.** Headless captures are correctness/art-review evidence, not performance evidence or artistic sign-off. Scope: `scene-tapestry.mjs` and `tests/tapestry-gate.test.mjs`; exact CA evolution and recorded-history reverse playback are unchanged.

## Structural types (`scene.type`: `seedShape` 0–3)

- **0 Cascade:** one vertically unrolled, expanding triangular history curtain; preset **90 · Nested linen**.
- **1 Cross:** four opposed history arms meeting at the centre, with binary cells cut out of solid yarn; preset **54 · Twin brocade**.
- **2 Rails:** five parallel sideways-history strips with staggered ages; preset **110 · Persistent knots**.
- **3 Rosette:** rotating annular loom, angular cells and radial generations, with cut-out yarn; preset **30 · Wild silk**.

The selector still chooses the matching initial seed arrangement as well as layout. All eight authored presets retain their bounded parameters and seeds. The original sheet flagged 0/1 (0.063), 1/3 (0.118), 0/3 (0.131); the rebuilt within-family sheet has **zero pairs below 0.25**.

## Distinctness (mid-energy grayscale; threshold 0.25)

| Type | 0 | 1 | 2 | 3 | Nearest other family/type |
| --- | --- | --- | --- | --- | --- |
| 0 Cascade | — | .6559 | .6021 | .4643 | Melt family 3 · .1381 |
| 1 Cross | .6559 | — | .7079 | .4543 | Aquarium habitat 0 · .4855 |
| 2 Rails | .6021 | .7079 | — | .7443 | Cathedral geometry 3 · .3281 |
| 3 Rosette | .4643 | .4543 | .7443 | — | Aquarium habitat 0 · .3652 |

All **21 cross-family flags** concern Cascade (0): Melt family 3 (.1381), 2 (.1737), 0 (.2009); Evolution Garden planting 3 (.1407), 6 (.1831); Light Beams form 3 (.1423), 1 (.1527), 0 (.2164), 2 (.2185); Fourth Dimension shape 1 (.1602), 0 (.1875); Magnetic Choir flow 1 (.1726), 0 (.1797); Particle Swarm form 2 (.1815), 0 (.1905); Hyperbolic Loom tiling 1 (.1928), 0 (.2201), 2 (.2344); Feedback Chapel geometry 3 (.2013), 1 (.2265), 0 (.2369). **Types 1–3 have no cross-family flags.** Owner must judge these static-proxy similarities; no other family was changed.

## Energy ladder (0.1 → 0.5 → 0.9; clip base 0.5, 120 frames)

PNG review: all four recommended presets read calm → developed → intense through finer history, stronger foreground/background contrast and faster evolution, not just colour. All eight authored ladders have strictly increasing edge density. Luminance is recorded, not required to rise: contrast moves around a fixed midtone; no scene brightness gain is tied to energy, and master remains shared.

| Type / recommended preset | Linear mean luminance | Edge density | Technical ladder verdict |
| --- | --- | --- | --- |
| 0 / 90 | .0116 / .0132 / .0117 | .0178 / .0483 / .0675 | Ordered; larger/finer causal triangle |
| 1 / 54 | .0259 / .0819 / .0785 | .0144 / .1876 / .3051 | Ordered; four arms gain woven detail |
| 2 / 110 | .0669 / .1332 / .1424 | .2618 / .3127 / .4158 | Ordered; horizontal threads become dense relief |
| 3 / 30 | .0252 / .0417 / .0474 | .1360 / .1710 / .1882 | Ordered; annulus gains contrast/detail and rotation |

## Aspect checks

All four types rendered at **640×360, 1280×360 and 480×480**: WebGL/non-finite inputs **0/0** in all 12 captures. PNG review found no stretching, letterbox/empty bands or lost central subject. Ultra-wide crops the vertical history/annulus; square crops the curtain and horizontal cross arms, preserving their centres. The annular hole remains circular in both crops.

## Correctness and shared beat

- `npm test`: **130 passed, 1 intentional opt-in skip**; `npm run build`: **47 assets built**. `node scripts/test-browser.mjs --only lab --port 48124`: **all 104 looks non-blank, WebGL 0, non-finite 0, textures accounted**; extreme energy, odd aspects and one-slot/no-leak fades passed for every family.
- `node tests/tapestry-gate.test.mjs --port 48124 --matrix artifacts/contact/tapestry-cross-family`: **passed**. All four types have ordered scroll **11/34/57 rows/s**, weave **.40/.72/1.00**, rendered edges and kick response. Same-state off/kick PNG review confirms shared punch/pulse at 0.9, with automatic flash suppressed: mean 8-bit RGB differences **0: 11.31; 1: 24.92; 2: 46.45; 3: 20.11** (all zero at 0.1). Declared weights are punch **.8**, pulse **1**; no injection alters the exact CA.

## Contact sheets (absolute paths; copied into the main checkout's `artifacts/` at merge)

- Types: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-types/index.html`
- Baseline comparison: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-before/index.html`
- All authored ladders: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-ladder/index.html`
- 16:9: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-640x360/index.html`
- Ultra-wide: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-1280x360/index.html`
- Square: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-480x480/index.html`
- All-family grayscale types: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-cross-family/index.html`
- Isolated kick PNGs and full distance matrix: `/Users/fabian/Development/phosphor/artifacts/contact/tapestry-probes/metrics.json`

## Owner decision and limits

Judge structural identity in grayscale, the ladder's at-a-glance order (especially the dense rosette), calm/peak usefulness and acceptable cover-crop. Approve or reject the recommended presets; then run `npm run timing -- --rig --family tapestry` alone on the reference rig (all types at high energy, p99 ≤ 34 ms, no downgrade/errors).

**Rig timing PASS (2026-10-08, parent):** `npm run timing -- --rig --family tapestry`, Chrome on the M3 Pro (ANGLE Metal, built-in display), 1920×1080, energy 0.95, 30 s per type, under heavy CPU load from parallel headless lanes (load average ≈ 136): p50 16.7 ms, p99 17.6 ms for all four types, max 24.2 ms, GPU errors 0, non-finite 0, no step reduction or downgrade. Art sign-off has not been executed.

Known limits: simulation is 512 cells × 511 retained generations; square/ultra-wide use 16:9 cover-crop, not native recomposition. Distances are static 120-frame grayscale proxies, not settled-history or motion proofs. Thin threads may alias on an LED wall. At very low energy, authored 184/22 can clamp scroll to zero and show only sparse initial history. Reverse revisits stored rows, never reconstructs older history. Arbitrary edited rules (e.g. 0/255) need not make useful art; the gate concerns declared types and authored looks. No real-GPU timing or owner sign-off was performed in this lane.
