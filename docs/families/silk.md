# Silk Storm / Seidensturm

**INCREMENTAL / EMPIRICAL**, revised 2026-10-15. Family **111**, renderer `silk`, world `silk-storm`. Prescribed, continuously deforming cloth; not a collision-resolving cloth simulation. No engine changes.

## Persistent material and signature mathematics

Twenty-eight persistent strips share a **160 × 6** tessellation each: 161,280 vertices, six floats per vertex (~3.9 MB). Attributes are `(u, v, ribbon id, three seeded identity values)`. Only seed changes rebuild the mesh. At development 0 adjacent material edges coincide exactly, forming one nominal **12 × 8.4** sheet.

The Strouhal relation is **f = St U/L**, with **St = 0.2**, L = 12, U = 2–12. Default U = 7.5 gives f = 0.125 Hz before energy modulation. An integrated clock owns `2π f`: wind changes speed, never existing phase.

The carrier integrates the unit tangent

`C′(s) = (cos(a sin(ks − φ)), sin(a sin(ks − φ)))`.

The Bessel expansion through J4 has measured tangent strain below **0.062%** for a ≤ 1.08; tests allow 0.15%. `flutter()` and its GLSL equivalent share the same formula.

The revised Veil uses an oblique material chart:

- `x = 12(u − 1/2)`, `y = 8.4(g − 1/2)`;
- `s = 0.8x + 0.6y + 7.32`, `w = −0.6x + 0.8y`;
- `φ = clock + 0.38 sin(0.45w + clock)`;
- `a = 0.72 amplitude (0.85 + 0.15 cos(0.55w))`.

The carrier is evaluated at `1.55s`, divided by 1.55 and centred at the material midpoint. This gives approximately 2.325 longitudinal waves, with curved ridges and varying fold depth rather than parallel painted stripes. Two small normal-direction travelling harmonics add fine folds. The rotation itself preserves length; phase/depth variation and the fine folds are **artistic gathering**, not an isometry. CPU tests measure the _complete rendered surface_: maximum sampled longitudinal deformation 12.05%, transverse 13.72%, principal stretch/compression 13.97%, conservatively bounded at 13% / 15% / 15%. The previous 3.4% bound no longer applies. No global material-conservation claim is made.

The vortex carrier is a unit-speed conical helix:

- `r(s) = 0.45 + 0.235s`;
- `θ(s) = θ₀ + (0.72/0.235) ln(r/0.45)`;
- `y(s) = sqrt(1 − 0.235² − 0.72²)(s − L/2)`.

Thus `r′² + (rθ′)² + y′² = 1`. Radius grows from 0.45 to 3.27 over ~7.84 units of height. Golden-angle identities persist through the entire morph. Width taper, travelling torsion, transverse ruffles and four long outer turns enrich the cone. Joining/separating strips and changing their rest composition are authored morphs, not a finite-element solve.

## States and looks

All state presets retain seed **1811**, names and identical non-development parameters. Every intermediate value is real geometry, reversible without resetting time or identity.

| Development | EN / DE           | Composition                                                                                                |
| ----------- | ----------------- | ---------------------------------------------------------------------------------------------------------- |
| 0           | Veil / Schleier   | One large silk sheet, ~65–80% of landscape frame height, with deep curved travelling folds in darkness.    |
| 1           | Banners / Banner  | Twenty-eight long ribbons with varied 3D tilt, torsion and near/far layers, rather than horizontal strips. |
| 2           | Tornado / Tornado | A towering conical vortex; the camera cranes below it and rises into its hollow axis.                      |

Five additional stable looks: **Raking Moon / Streifmond**, **Crosswind / Querwind**, **Woven Night / Gewebte Nacht**, **Spindle / Spindel**, **Satin Wake / Satinspur**. Their preset names, seeds and parameters remain unchanged. Woven Night is intentionally a sparse transitional view; it is weaker than the main state compositions.

## Light, camera, depth and rhythm

Fabric has **one uniform palette-secondary dye**: no longitudinal palette blobs. Two persistent ribbons receive rare palette-accent dye as the tornado forms. A single raking key establishes bright anisotropic sheen ridges and dark troughs; key direction glides continuously into the established vortex lighting. The anisotropic lobe uses different longitudinal/transverse roughness. Specular values can exceed 1.0 on the float target. Backlight transmission is concentrated at free edges; weave and hems are derivative-filtered.

Six bounded material-space ray samples per vertex measure local moving-fold occlusion, interpolated across the dense mesh. This is an approximate local self-shadow, not a shadow map and **not complete inter-ribbon cast shadows**. Actual depth testing provides inter-ribbon occlusion; an inner-vortex darkening term adds contact depth. Distance fog strengthens toward Tornado, dimming far layers while near highlights retain contrast. No sorted transparency/refraction is used.

The camera now starts around z = 10, not 13, with slow lateral drift. It eases back as the banners spread through ~8.5 units of depth. The existing continuous below-cone crane and hollow-axis rise are retained. A changing up-vector avoids a vertical-look singularity. Top-state foreground ribbons intentionally surround the camera and cross the frame border. Projection is short-side based; kick focal punch stays below 1.8%. Portrait and three library palettes were filmed.

Energy changes wind speed (×0.7–1.3) and fold amplitude (×0.75–1.2), not brightness. Stable `familyEffect` gestures:

1. **Flutter packet**, 4 beats: a restrained sheen packet follows existing material folds.
2. **Selvedge cohort**, 8 beats: one persistent ribbon cohort catches accent at its hems.
3. **Vortex sweep**, 16 beats: a broad bounded light front climbs the fabric.

Four bounded 2π-periodic clocks own flutter, vortex turn, drift and raking-light modulation. Shaders never use `u_time`; development never reseeds or resets anything.

## Verification and cost

- `node --test tests/silk.test.mjs tests/time.test.mjs`: **17/17 pass**. Frequency from actual zero crossings, tangent reference, complete gathered-sheet metric, unit-speed helix, joined seams, seeded identity, real fold depth / banner angle and depth span, continuity/reversal, periodicity, camera clearance and finite presets. World lookup is by **id**, never registry position.
- `PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_SILK_GPU=1 node --test tests/browser/silk.test.mjs`: pass. Twelve low-energy GPU frames across development 0/.5/1/1.3/1.7/2 and times 3600/43200; zero GL/non-finite errors. Paused .65 → 1.92 → .65 is pixel-identical and keeps the same mesh buffer.
- Native `check-time-wrap.mjs --rig --port 48506 --families silk`: zero seam/rate errors across 3600, 4096 and 43200 s.
- Typecheck, build and native DE/EN i18n smoke pass.
- Full CPU repository suite: 739 pass, 9 skip, 3 expected unbaked-preview/editorial-catalog failures; integration owns those files.

Apple M3 Pro / Chrome / ANGLE Metal, energy .95, 12 synchronous samples including post-processing, p50 / p95 milliseconds:

| State   | Baseline 1080p | Final 1080p   | Baseline 4K | Final 4K      |
| ------- | -------------- | ------------- | ----------- | ------------- |
| Veil    | 2.2 / 2.4      | **2.3 / 3.9** | 4.4 / 4.5   | **5.2 / 5.7** |
| Banners | 1.9 / 2.1      | **2.0 / 2.2** | 4.4 / 5.3   | **4.3 / 4.7** |
| Tornado | 2.1 / 2.3      | **2.0 / 2.3** | 4.3 / 4.5   | **4.8 / 5.0** |

Every state is below the required 8 ms / 16 ms p50 budgets. These are shared-machine throughput samples, not external-display cadence qualification.

## Review

Baseline plus **four 30-second filmed improvement rounds**, compared with an independently filmed **Liquid Chrome** reference. Rounds addressed scale/uniform dye, directional variety and anisotropy, curved folds/local shadowing, then material centring and restrained secondary dye. Superseded intermediate films were deleted; their strips, baseline/reference/final films, three-palette evidence, portrait, full-size stills, all eight energy ladders and logs remain in the fleet worker's `output/evidence/` (absolute paths in its report).

Honest final rating: **8/10**, versus approximately 6/10 baseline, **not 9/10** against Liquid Chrome. The improvement is clear, especially uniform silk sheen and spatial banners. Remaining limits: stylised prescribed satin, no collision solve or complete cast-shadow/translucency transport, some regularity in Veil ridges and a sparse Woven Night transition. The immersive vortex remains the strongest state.
