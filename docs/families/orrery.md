# Brass Orrery / Messing-Orrery

**INCREMENTAL / EMPIRICAL**, 2026-10-15. Family **109**, renderer `orrery`, world `brass-orrery`. One precision mechanism develops from a watch train into an astronomical machine and a clockwork nave. No engine changes.

## Signature mathematics

The visible teeth are beveled, extruded **involute profiles**, not sinusoidal gear silhouettes. All gears share module `m = 0.05` and pressure angle `α = 20°`. For integer tooth count N:

- Pitch radius `r = mN/2`; base radius `rb = r cos α`.
- Base-circle involute `I(t) = rb(cos t + t sin t, sin t − t cos t)`.
- Involute angle at radius R: `inv(R) = sqrt((R/rb)² − 1) − atan(sqrt((R/rb)² − 1))`.
- Half tooth angle: `π/(2N) + tan α − α − inv(R)`.
- Addendum `r + m`, dedendum `r − 1.25m`. The flank begins at **max(rb, dedendum)**, so large gears do not incorrectly dip below their root circle.

Each train is a nine-gear tree: 56-tooth driver, four 24-tooth intermediates and four 40-tooth followers. Centres are separated by the **sum of pitch radii**. A child has `ωc = −ωp Np/Nc`, hence every mesh obeys `ωp rp + ωc rc = 0` (opposite rotation directions). Tooth-to-gap phase is solved at the shared pitch line; it is not independently randomized. One integrated drive phase owns every shaft. Kick and gestures never perturb the train's angular velocities.

There are **25 persistent trains / 225 actual gears / 200 meshes**: the foreground machine and 24 receding cathedral banks. Development scales and places *whole trains*, so both centre-distance and no-slip constraints survive every intermediate value. Five rigid planetary arms use exact orbital ratios **1:2:3:4:6**. The shared drive wraps at **30π**: an integer number of revolutions for 1, −7/3, 7/5 and every planetary shaft.

[orrery-model.mjs](../../orrery-model.mjs) owns the profiles, seed-only mesh construction and CPU references for train placement, camera and orbital motion. The meshes have real open spoke apertures, raised bearing rings, axles, bevels and foreground screw heads. Small cathedral gears use fewer samples along the *same* involute, not a different tooth law.

## Continuous states

All states use seed **10901** and identical non-development parameters. `development` runs continuously from 0 to 2, with reversible smooth geometric growth and camera motion; there is no state crossfade, reset or reseed.

| Development | EN / DE | Composition |
| --- | --- | --- |
| 0 | Gears / Zahnräder | A close, inclined view of the open watch train and chapter ring; involute teeth and polished bevels are immediately readable at low energy. |
| 1 | Orrery / Orrery | The same machine carries five tilted planetary orbits, rigid arms, polished spheres and a glowing central core. |
| 2 | Clockwork / Uhrwerk | Whole meshed banks extend into depth, side banks turn inward, the upper bank nests above the hero, and curved metal ribs assemble a vast clockwork nave. |

The planetary shafts grow from the existing hub; cathedral trains grow as complete units while sliding into the surrounding architecture. The foreground machine recedes by four units during the final development. Identity attributes and the mesh allocation never change when development changes.

## Eight looks

- **Gears / Zahnräder** — state 0.
- **Orrery / Orrery** — state 1.
- **Clockwork / Uhrwerk** — state 2.
- **Watchmaker / Uhrmacher** — intimate, slow early mechanism, restrained camera.
- **Copernican Night / Kopernikanische Nacht** — strongly inclined planetary planes, slower shafts and flight.
- **Silver Escapement / Silberhemmung** — polished, close mid-development mechanism.
- **Sidereal Vault / Sterngewölbe** — wider cathedral view, slower drive and glide.
- **Midnight Calibre / Mitternachtskaliber** — near-peak mechanism, quicker drive, close framing and shallow orbit inclination.

## Material, light and space

The active palette's **secondary** is the alloy, primary mixes into lighter metal and white appears in reflected studio strips and sharp highlights. Symbiosis gives a brass alloy; Glacier and Silver deliberately become cold metal. No fixed brass RGB bypasses palette choice. A soft key, two reflected studio cards, grazing rim light, raised bearings/contact-darkening proxies and filtered radial machining marks give the metal depth. The core exceeds 1.0 on the float path; accent is reserved for local tooth events and planet rims.

Perspective parallax, exponential distance fog, tiled dark ground, actual depth-tested foreground floor-reflection triangles and receding metal vault ribs establish scale. The camera is a continuous, roll-free, closed dolly/orbit through the clear nave, not a cut or a teleport through a gear. The kick changes focal length by at most **1.8%**. Projection is short-side based, including portrait. The hero mechanism stays centred; peripheral cathedral architecture may intentionally extend outside the frame.

## Energy, rhythm and endlessness

Energy changes drive and camera rates, not an overall brightness factor. Integrated engine clocks prevent rate changes from jumping phases, including after twelve hours. The drive period is 30π; camera period is 2π. The ordinary authored and long-show variants have matching products and no arbitrary time modulus. Nothing accumulates, dies or saturates.

Three `familyEffect` gestures act on the signature:

1. **Escapement tick / Hemmungstakt**, 4 beats: bounded anchor rock and local highlights on engaged tooth rims. The kick also rocks the anchor, never the meshed shafts.
2. **Ratio cohort / Wellenkohorte**, 8 beats: white glints on a persistent shaft-index cohort.
3. **Clockwork wave / Uhrwerkwelle**, 16 beats: a bounded radial light wave along tooth rims through the nave.

## Cost

1,762,452 vertices / 587,484 triangles, 17 floats per vertex. The fixed-capacity CPU construction allocates 128 MiB rather than building a very large temporary JS number array; the uploaded vertex range is **119.85 MB**. Construction is seed-only. The GPU buffer is larger than particle worlds, but the visual pass is a cheap depth-tested mesh, not a raymarch. The reflection duplicates only the foreground mechanism, not the entire hall.

Native headless Chrome / ANGLE Metal / Apple M3 Pro; 12 synchronous samples, energy 0.95, post-processing included:

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Gears | 2.8 / 3.0 ms | 5.4 / 5.6 ms |
| Orrery | 3.3 / 4.4 ms | 5.6 / 5.9 ms |
| Clockwork | 4.6 / 4.8 ms | 6.2 / 6.4 ms |

An earlier shared-machine run was 4.3–5.1 ms at 1080p and 7.0–8.4 ms at 4K. Both runs satisfy the new-world 8/16 ms p50 budgets. These are throughput probes, not venue display-cadence qualification.

## Verification and visual review

- `node --test tests/orrery.test.mjs tests/time.test.mjs`: 17 pass, one opt-in GPU test skipped. With `PHOSPHOR_HEADLESS_RIG=1 PHOSPHOR_ORRERY_GPU=1`: **18/18 pass**.
- CPU references check involute tangent unwinding, tooth thickness/count/rotation, all 200 meshes across development and long-time drive values, tooth-gap phase, exact planetary ratios, deterministic finite identity attributes, reversible development, camera continuity, presets and world registration.
- Opt-in GPU check: all states at energy 0.1, Symbiosis/Glacier/Silver, landscape/portrait/4K, time 43,200; zero GL errors/non-finite uploads, no black frames, late shader active. Paused development 0.73 → 1.97 → 0.73 is **pixel-identical with the same mesh object**.
- Native seam/rate audit passes at 3600, 4096 and 43,200 seconds and under two-hour energy/fader changes.
- `npm run typecheck`, `npm run build`, and `npm run test:i18n -- --native-gpu --port 48504` pass (DE and EN browser workflows).
- Full CPU suite: **739 pass, 10 skip, 3 expected catalog-preview/curation failures**. Preview baking and editorial ordering are deliberately left to integration.
- Reviewed the 30-second continuous-world films in default, Symbiosis and Silver, the Glacier extra-look film, all eight energy ladders, portrait and full-size 4K late-time stills. Five improvement rounds plus final framing/core-clearance cleanup followed the first working film. Final author rating: **9/10**.

Evidence paths in this lane: `artifacts/orrery/baseline/`, `artifacts/orrery/final/`, `artifacts/orrery/extra/`, `artifacts/orrery/ladder/`, `artifacts/orrery/gpu/`, `artifacts/orrery/time/`, `artifacts/orrery/perf1080/`, `artifacts/orrery/perf4k/`. The fleet report records their absolute handoff locations.

## Limits

This is a kinematic clockwork construction, not a rigid-body/contact or historically accurate astronomical ephemeris simulator. Planet ratios are exact authored integers, not Solar System periods. Metal reflections and local occlusion are analytic lighting proxies, not ray-traced inter-gear reflection/shadows. Very distant teeth remain fine, high-frequency mesh detail; fog suppresses them rather than adding a new engine AA pass. The floor reflection is sharp and deliberately dim. The GPU vertex buffer is substantial; external-projector contrast, multi-hour live cadence and crossfade memory pressure still merit integrated venue testing.
