# Kinetic Rain

Family **102**, renderer `kinetic`, world `kinetic-rain` (**Kinetic Rain / Kinetischer Regen**). A choreographed suspended-light installation above a dark mirror floor. **r4, openai-codex/gpt-6.1-sol**. This specification supersedes the former closed sphere/torus/Möbius renderer; its implementation and evidence remain in git and the r3 capture directory.

## Review-driven structural rework

Independent r3 review: **L5.5 / G8.5 / E7, overall6.5**. Its five must-fixes were a rubber-torus peak, isolated late framing, knotted transition, unlit quiet canopy and ambiguous cascade/wireframe gestures. r4 changes the geometry and composition, not just glow:

- The original **96×96 = 9,216** motor addresses persist at every development. Lamps move vertically, never reindex onto a closed surface. There are no collapsed poles, overlapping wings or contracted ring skins.
- Quiet canopy has a shallow sculptural crest and selective luminous cores over a mostly secondary-colour body. Near/far attenuation, local globe shading, rare seeded hot cores and real suspension threads establish layers.
- Waves grow into broad open sculptural folds with small deterministic height tiers. Camera dolly clears the footprint before rising; an offset aim, retained analytic haze, suspension threads, tiled dark ground and an extensive mirrored lamp population preserve installation scale.
- Cascade follows physical height, with a delayed light-only mirror echo. The lattice gesture selects sparse staggered lamps, never the cables.

**Self-assessed look:7.5/10**, not an independent acceptance claim. The dot-grid remains conspicuously regular; near/far layers can overlap in projection, and nearly monochrome palettes separate the gestures less strongly than the default. No live venue-cadence or external-projector qualification is claimed.

## Position law and states

A lamp `(i,j)` always has `x=(i−47.5)×0.25`, `z=(j−47.5)×0.25`. `kinetic-model.mjs` mirrors the shader's height, radius, camera, ring and cascade formulas on the CPU. Identity, geometry buffer, random seed and motor address are independent of development.

For `s=smoothstep(0,1,development)` and `f=smoothstep(1,2,development)`, height is

`2.8 + mix(mix(ripple,wave,s), fold,f) + tiers×(0.2+0.8f) + kickRing`.

- **Ceiling / Decke (0):** two broad travelling ripples (amplitudes0.14/0.10) and a shallow Gaussian crest at radius5. Gentle height tiers and selective internal lenses prevent an unlit olive-dot plane.
- **Waves / Wellen (1):** crossing plane waves, radial waves, a three-arm spiral and standing interference cycle with a smooth four-weight partition of unity, held for55% of each phase. Amplitude and fine detail respond to energy.
- **Sculpture / Skulptur (2):** four open heightfields—crossing folds, concentric bowl folds, a two-arm curl and standing saddle folds—cycle through the same weights. Broad heights span roughly3m; deterministic tiers are bounded by0.15m. The convex blend stays an injective heightfield at intermediate phases and developments.

Peak fold gain is `0.68+0.22×amplitude`. Globe radius is `0.046×size×(1+0.2f)`, leaving physical air between neighbours even at maximum size. Motor ceiling is9.4m. CPU tests cover floor/motor clearance, fixed addresses, reversal, clock seams, normal finiteness and maximum motor speed3m/s. These are analytic motor choreographies, not rigid-body/cable simulation.

## Looks and saved sets

All eight names/seeds, three world states, schema keys and rhythm IDs remain unchanged:

Still Ceiling, Wave Choreography, Floating Sculpture, Slow Tide, Rain Curtain, Dense Swell, Möbius Drift, Night Mirror.

**Möbius Drift** retains its legacy saved-look name and seed6006; it now opens on the curling heightfield rather than a closed half-twisted band. World description changed; the previous exact world definition is appended to `HISTORY` in `worlds.mjs`. Both dictionaries retain all old strings and add the new descriptions beside the family rhythm keys.

## Material, camera and depth

Every lamp is a depth-writing ray/sphere impostor with output-pixel antialiasing. Its frosted body surrounds a luminous lens: secondary-colour body, a primary crest, and rare stable hot cores. Geometry no longer carries coherent surface-normal illumination that would turn the lamp field into a rubber shell. No temporal grain or random per-frame twinkle is used.

The early camera orbits at radius6±0.4, height0.75±0.1. It dollies14m outward over development1…1.65 and only then rises4.75m over1.6…2. The aim has a perpendicular offset0.9…1.9m and lowers toward the floor to leave room for the installation above its mirror. Focal length1.4…1.78 uses the short side in every aspect; kick lens gain is exactly2%. Camera movement depends on integrated clocks and development, not a brightness or kick jump. Very fast manual development sweeps still move the camera correspondingly quickly; there is no engine spring.

Sparse vertical suspension threads are palette-muted, additive and antialiased. Only one in36 threads is rendered, keeping them subordinate to the lamps. They are not driven by rhythm. Floor reflection is a separate depth-tested lamp population with Fresnel attenuation and height-dependent soft coverage. Analytic piecewise-exponential haze fills the footprint in every state, including the peak. The mirror is an artistic approximation, not a physically integrated glossy reflection.

## Energy, clocks and rhythm

Energy changes wave amplitude×0.65…1.25, globe size×0.8…1.08, speed×0.6…1.5, detail+0…0.5, form pace×0.8…1.3 and orbit pace×0.75…1.5. It is not a brightness multiplier. Four integrated periodic clocks own wave phase (`0.52×speed`,2π), choreography (`morph/22`,4), direction (`0.12×(0.5+0.5×morph)`,4π) and orbit (`0.035×orbit`,2π). Bounded periodic formulas remain endless at12-hour scene times.

1. **Kick rings, slot0:** original Gaussian/cosine motor ring, with a local luminous crest.
2. **Index sweep, slot1:** a narrow secondary-colour diagonal lamp band.
3. **Lattice lines, slot2:** staggered every-eighth lamp cohorts chime locally; no luminous wireframe.
4. **Drop cascade / Tropfenkaskade, slot3:** normalised envelope moves a Gaussian front from height5.65 toward0.15. Width0.14m; alternating count-selected tilt is bounded. Mirrored lamps use progress delayed0.14, without moving their geometry. A rest gate makes zero envelope exactly silent, including the delayed mirror. Newly crossed hits affect only high launching lamps.

Unchanged presets: **Suspended drops / Pendulum rain / Lattice cascade**. Family densities **2.25 /6.75 /12.67 hits/bar**; syncopation, phrase fills and the accented index sweep's24-step non-square loop are preserved. Signature steps (one-based): restrained5/23 of32 eighths; driving1/5/9/13 of16 eighths; accented1/5/9/19/23/27 of32 sixteenths. Limiter untouched, no full-screen white. Offline review films use the shared deterministic capture harness; limiter-enabled native verification is separate.

## Five film rounds and evidence

1. Open heightfield removed torus/knot; large still exposed dim far lamps and low framing.
2. Corrected aim, introduced luminous lenses and crest hierarchy; large still still read too much like a dense skin.
3. Tested larger tiers/higher crane; sheets and full-size stills exposed noisy point texture and too much foreshortening.
4. Reduced tiers/crane and corrected late aim; recovered separated broad folds and mirror.
5. Added subdued real suspension cues, distinguishing an installation from a floating dot surface. Final speed gate reduced the wave clock to0.52 so maximum CPU motor speed stays below3m/s.

Final reviewer evidence: **`artifacts/look-review/kinetic-rain-r4/`**, default sheet/rhythm/film, `grids.md`, large `quiet.png`, `peak.png`, `cascade.png`. Extra Ember/Glacier films and sheets in `palettes/`, Silver portrait reverse film in `portrait-reverse/`. Round1…5 directories retained. Read individual960×540 stills as well as all sheets.

## Verification and native cost

Apple M3 Pro / Chrome ANGLE Metal,30 synchronous samples/state including post; throughput, not display cadence:

| State     | 1080p p50/p95 ms | 4K p50/p95 ms | ABBA median Δ1080p /4K vs main |
| --------- | ---------------- | ------------- | ------------------------------ |
| Ceiling   | 2.4/3.8          | 4.8/5.2       | −19.4% /−5.5%                  |
| Waves     | 2.3/3.8          | 5.1/5.5       | −14.3% /−13.0%                 |
| Sculpture | 2.3/3.0          | 5.5/5.7       | −16.0% /−5.7%                  |

Geometry remains165,888 vertices, six floats/vertex (~4MB/seed). No extra pass, simulation, state texture or engine change. One height evaluation/lamp replaces reindexing, surface differentiation and normal-based shell shading.

- `npm test`: **1,014 pass,22 opt-in skips,0 failures**, including world rhythm and flash-pipeline tests. Family14/14 pass; tests replace obsolete torus assertions with injectivity, clearance, pure reversal, motor speed, bounded descending signature, delayed mirror silence and analytic-haze quadrature.
- Typecheck and build pass. Native DE/EN i18n smoke passes with `--native-gpu`; earlier software-mode attempts timed out (wrong rig flag), retained in logs. Core owned scene/model/tests/docs/plan pass Prettier; five shared metadata/catalog/dictionary files already differ from Prettier on main, verified against `git show`, and were not globally reformatted.
- Native family verifier: **45 portrait cases**, energies0.1/0.5/0.9 × development0/0.7/1/1.65/2 × Ember/Glacier/Silver at scene time43200, limiter enabled. Zero GL/non-finite errors, all visible. This is late-time rendering, not a12-hour runtime soak.
- Cost JSON: `perf-1080/`, `perf-4k/`, `pair-1080/`, `pair-4k/` under final evidence. Both resolutions improve every paired median. No absolute budget breach.
