# Living Mycelium

**EXPLORATORY / EMPIRICAL**, r5. Family `mycelium`, number 99. Artistic biology, not a calibrated fungal model. The independent r4 review was L7 / G8.5 / E7, Overall7; the earlier implementer score was not acceptance. World/state IDs, eight preset names/seeds/parameters, chemistry, rhythm IDs and authored grids remain unchanged. No additional world migration or preview bake.

## Algorithm and continuity

`mycelium-geometry.mjs` builds a deterministic, periodic 2.4 m forest floor once per seed. Correlated tip growth, negative autotropism, lateral branching, dichotomy and anastomosis produce a looped graph. Multi-source Dijkstra supplies nutrient distances; sink demand on its predecessor tree sets Murray-law radii (`r³ ∝ flow`). Seed 211 retains 31,780 graph nodes, 2,399 fusion edges and 100 mushrooms. Mushroom bases remain actual graph nodes.

The original bounded Gray–Scott substrate, exact nearest chemistry stencil, extinct-region spore recovery and `gray-scott-uv16-v1` continuity token are unchanged. Development only changes reveal, growth, morphology and camera uniforms; reversal never rebuilds the mesh or resets chemistry.

## r5 response to review

- **Living tissue rather than cut tubing:** radii are smoothed over nine existing nodes and actual germination/free-end bodies taper over several growth steps. Order-0/1 cords and selected relay routes have three cubic-Hermite subdivisions per growth segment. Small, static, torus-periodic meanders deform the actual body positions; tangents follow the deformation. Resolution-scaled width caps are narrower. This targets near-camera long rectangular quads, not only their lighting.
- **Interstitial mat:** short curved lateral fans are rooted in the existing graph, supported by softer lateral hairs and energy-revealed fine cohorts. These are visual tissue, explicitly **not** extra transport shortcuts. Main trunks stay selective; litter occlusion, soft distant falloff and persistent floor remain.
- **Litter rods:** twigs were another contributor to the blunt bar impression. Their ends now taper geometrically; their soil-lit emission is much darker, so bark cannot compete with living hyphae.
- **Fungal material:** stems have eight axial rings, a curved centreline and nonuniform taper. Cap margins have low-order asymmetric thickness and rippling; gill depth, spacing, short lamellae and transmission vary locally. Dark crowns retain subtle moist highlights rather than camouflage. Primary/secondary roles remain palette-derived; pink is reserved for the local relay.
- **Headroom without losing the floor:** shorter fruiting bodies and a small upward crane (17→18 cm) with floor-facing pitch −0.53→−0.28 radians expose whole caps against the mist. The same floor develops into the forest; no camera cut. Conservative CPU clearance includes additional stem curvature, cap asymmetry and static body displacement. All six seeds pass >3.2 cm clearance.

| State      | Development grammar                                                                       |
| ---------- | ----------------------------------------------------------------------------------------- |
| Understory | Selective trunk cords, fuzzy lateral fans, dark litter; energy opens finer tissue.        |
| Tide       | Fused mature network, more interstitial growth, first rooted primordia.                   |
| City       | Overlapping asymmetric caps, curved stems, luminous gills and spores; the floor persists. |

Extra looks remain Spore Floor, Night Membrane, Tide Turning, Street Plan and Bloom Quarter. Minimum thread radius is 0.9 px at 1080p; radius caps and halos scale with output resolution. Camera is a closed meander, with no shake and a bounded 1.5% kick lens response.

## Rhythm

Preset names remain **Dormant threads**, **Root signals**, **Spore chorus**; densities remain **3.3 / 13.9 / 17.8 hits/bar**. The driving tip-flare has a **12-sixteenth / three-beat** loop against the four-bar relay phrase. No structural over-triggering was added.

- x `reaction-front`: frequent small tip flares; fine fans also answer. Remains secondary to the relay.
- y `chemical-band`: selected-colony geodesic wave, quieter to avoid a floor-wide wash.
- z `feed`: unchanged sparse bounded substrate feeds and selected-cluster spore answers.
- w `signal-relay` (**Signal relay / Signalstaffel**): **one actual predecessor route** is selected from twelve camera-lap sectors. A compact pink head and dim trail follow it, then ascend its one hero mushroom's stem and spread radially through that mushroom's gills. Gill-only decay outlasts the head; crowns and unrelated mushrooms do not share a tint. Hue-preserving pink transmission prevents the green gill event becoming beige.

The path uses a normalized 0→0.26 coordinate, stem 0.26→0.42 and gills 0.42→0.50: causal staging is deliberate, not uniform physical propagation velocity. Count makes a small bounded head variation; envelope advances the front and hit marks the source. Sector selection follows the slow flight, not development. At sector boundaries a route can change during an event; there is no persistent event latch in this stateless shader.

Relay zero-based sixteenth positions: restrained **0,30**, duration 3 beats; driving **0,36,54**, duration 2.4; accented **0,30,40,54**, duration 2.3. All settle before the next event/seam. No full-screen white or development-triggered flashes. Shared limiter untouched.

## Cost and verification

Seed 211: **987,270 stored vertices / 94.8 MB**, one mesh instance, fixed topology. Added fine tissue and close-range subdivisions cost memory, cold generation and vertex/fragment work; no per-frame CPU regeneration.

Native ANGLE Metal / M3 Pro synchronous throughput including post (shared fleet GPU, not venue cadence), milliseconds:

| State      | 1080p p50/p95 | 4K p50/p95  | Corrected ABBA p50 delta 1080p / 4K |
| ---------- | ------------- | ----------- | ----------------------------------- |
| Understory | 5.6 / 8.7     | 14.8 / 15.4 | +27.0% / +22.2%                     |
| Tide       | 4.7 / 6.8     | 13.6 / 14.8 | +18.6% / +22.2%                     |
| City       | 6.0 / 7.2     | 17.4 / 19.2 | +18.8% / +15.2%                     |

**Raw City 4K exceeds 16 ms during contention.** Corrected interleaved ABBA final 4K p50/p95 is 11.0/12.3, 11.0/12.4, 15.2/15.9 ms; its paired absolute budget passes, but the regression is real. Reference pinned by that run: `8fc871da290861f10a24eba1ce550eea43106864`. Required shared pair also ran; it omits geometry-helper routing, so use `scripts/verify-mycelium.mjs --rig --pair --port 48460` for the honest both-source comparison. JSON/logs: `artifacts/mycelium-r5-{perf1080,perf4k,pair,pair-shared}`.

- `npm test`: **986 pass / 21 opt-in skip / zero fail**. Targeted family/world-rhythm/flash: **53 pass** before the final geometric subdivision; full suite re-run afterwards. New tests cover real predecessor routes, hero masks, normalized route bounds, fan tissue, taper, mesh finiteness and size, continuous camera, density and cross-meter. Typecheck, DE/EN i18n, formatting and `git diff --check` pass.
- Final limiter-enabled verifier: **25 cases**, three energies per state, five extra looks, portrait, 43,200-second time and reversal. Zero GL errors, non-finite uploads/float pixels, or identity rebuilds. Low-energy raw-channel >0.04 coverage: **21.4 / 32.6 / 68.2%**. Verifier PNGs/JSON: `artifacts/mycelium-r5-verify/`.
- Six saved change→film→read→critique rounds: `artifacts/look-review/mycelium-r5-round{1,2,3,4,5,6}/`. Final reviewer evidence: **`artifacts/look-review/mycelium-r5/`**, film, sheet, rhythm and grids. Final alternate palette films: `artifacts/look-review/mycelium-r5-palettes/` (ember, glacier, ultraviolet); all sheets read.

## Remaining limits

Self-assessment **L7.5 / G8.5 / E8.5 → Overall8**, **not independent acceptance**. The mat is still stylized rather than photorealistic; some portrait gills show mesh faceting. The visible stem→gill relay is stronger than r4, but a slow camera-sector boundary can change its route, and half-beat sampling cannot show every small travelling head. 4K contention and the measured cost regression remain explicit. No score is written to research tables.
