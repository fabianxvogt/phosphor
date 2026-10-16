# Liquid Chrome · Flüssiges Chrom

World `liquid-chrome`, family `ferro` **101**. One mercury lens grows a dense magnetic crown rooted in its mirror puddle. Eight preset names/seeds, schema keys, state names and four rhythm IDs remain stable. The former floating-sphere description is retained in `worlds.mjs` HISTORY so untouched saved sets upgrade.

## Model and continuity

Rosensweig's critical wavelength is `λc = 2π √(σ/(ρg))`: **9.650097 mm** for σ = 0.028 N/m, ρ = 1210 kg/m³, g = 9.81 m/s². Fixed lattice spacing 0.28 corresponds to 0.034464633 m/unit. This is an instability-inspired analytic surface, not magnetohydrodynamics or mass-conserving fluid simulation.

The triangular lattice is the nearer of two rectangular cosets, period `(a, √3a)`, offset half a period. Six neighbours meet at 60°. Unlike r3's stereographic ball chart, r4 samples **world-space xz**: roughly 130–160 peaks rise vertically from one continuous liquid lens. A seed-derived rotation preserves all sites through development and reversal. The squared conical profile has rounded shoulders, sharp tips and a smooth radial population taper; it is not a collection of separate cone meshes.

Height combines a tangent-edged lens `0.10·max(0,1−r²/3.61)^1.5`, a development-grown central mound, lattice peaks and small pressure ripples. The base remains joined to y=0 at every development. A deterministic fixed-site cohort controls energy population; dormant sites grow continuously, never slide or reseed. Energy additionally changes peak height, fluid/orbit speed and droplet size, not exposure.

| State / look         | Character                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| Pool / Spiegel       | Rippled mercury lens, reflected studio strips, a quiet breakdown composition                    |
| Crown / Krone        | Smaller peaks awaken across the fixed hexagonal lattice                                         |
| Sculpture / Skulptur | Dense, taller magnetic crown and seven orbiting chrome satellites, still attached to the puddle |
| Obsidian Lens        | Higher view, broad reflections, quieter motion                                                  |
| Needle Garden        | Strong field, higher view, narrower strips                                                      |
| Mercury Moon         | Lower view, softer peaks, larger satellites                                                     |
| Black Magnet         | Intermediate crown, narrow strips, faster fluid phase                                           |
| Silver Orbit         | Strong field, higher view, broad reflections and large satellites                               |

The first three presets retain seed 10101 and identical non-development parameters. No identity or simulation state resets during a sweep, hold or reversal.

## r4 response to independent review

The r3 review scored **L 6 / G 7.5 / E 6 / overall 6**. The principal failures were empty framing, lime-painted reflections, a floating sea urchin, weak strikes and wire-like reflections. Three filmed iterations plus final refinement were opened and critiqued, rather than trusting the earlier lane's self-rating.

- A closer oblique camera fills the frame without clipping the pool. Continuous off-axis framing and two near droplets add parallax and scale. The Pool view is higher; the top view lowers gently to expose the spike silhouette and real mirror reflection. There are no camera cuts. Focal kick remains **2.2%**.
- A dim palette-secondary studio gradient supplies depth without making the background bright. Primary/secondary-tinted silver softboxes, dark mullions and upper/lower reflected horizons describe every peak. No coloured diffuse material is added.
- Broad lime cards and the narrow magenta wire-card are gone. The palette-primary pressure front is local and varies around the pool like a reflected light arc, rather than a uniform neon halo. Accent is not used as a broad fill.
- A tangential lens edge and soft basin Fresnel region replace the hard illustrated rim. One true SDF mirror bounce preserves reflected peaks below the connected body. Near-field visibility plus a cheap neighbour reflection darken valleys.
- The peak is a dense grounded lattice, not a radially spiked sphere. Both count and height vary clearly between energy 0.1 and 0.9.

## Rhythm

The existing **Spike swell** grows needles (and Pool ripples), **Field breath** raises the same crown, and **Droplet orbit** moves the seven persistent satellites outward. Two extra near droplets remain present during the breakdown.

### Slot 3 — Magnetic strike · Magnetschlag

`magnetic-strike` reads envelope `u_rhythm.w`, newly crossed hit `u_rhythmHit.w`, and count `u_rhythmCount.w`. Its bounded signed impulse raises peak height by **up to 40%**, then passes through a small negative settling overshoot. Count alternates two poles by π. Height-dependent shear leans tips toward the active pole while every foot remains anchored in the liquid. At zero envelope the exact resting surface returns; changing the count while silent does not deform geometry.

During decay the pressure front travels from radius **1.15 to 2.65** across the lens and exposed puddle. It bends the actual height surface and adds a soft reflected arc outside the crown. Kick FOV does not carry the gesture. No event depends on development, no full-screen white, and the shared flash limiter is unchanged.

| Preset           | Strike loop (one-based sixteenths)                                                                              | Family hits/bar |
| ---------------- | --------------------------------------------------------------------------------------------------------------- | --------------- |
| Still mercury    | Two bars: 1 / 27; long settling spaces, extra offbeat Pool swells                                               | **3.0**         |
| Magnetic breath  | Two bars: 1 / 4 / 7 / 9 / 11 / 14 / 17 / 20 / 23 / 25 / 28 / 31; syncopated pushes rather than straight eighths | **9.5**         |
| Chrome resonance | Two bars: 1 / 4 / 7 / 9 / 11 / 15 / 17 / 19 / 22 / 25 / 28 / 31                                                 | **10.0**        |

All four gestures retain independently authored restrained/driving/accented loops. The accented 12-beat swell against 16-beat satellites remains intact. Every strike envelope settles before its next authored event. DE/EN signature labels/descriptions remain available; the revised world description adds translations without removing old saved-description keys.

## Time, cost and verification

Three integrated 2π clocks preserve fluid phase, camera orbit and studio motion at 3600/43200 s. Their uses are periodic. Rendering uses one full-resolution primary ray, tight slab rejection, the engine's `u_raySteps` governor, tetrahedral normals, seven bisections for negative overshoots and one bounded mirror bounce. There is no reduced-resolution colour cache. The almost-flat Pool skips the lattice calculation and uses a less conservative distance step.

Native Chrome / ANGLE Metal / Apple M3 Pro, synchronous whole-frame throughput including post, 30 samples per state:

| State     | 1080p p50/p95 | Final 4K p50/p95 | Interleaved 1080p pair p50 vs main |
| --------- | ------------- | ---------------- | ---------------------------------- |
| Pool      | 2.7 / 3.6 ms  | 8.1 / 9.1 ms     | +17.4%                             |
| Crown     | 4.2 / 5.9 ms  | 14.3 / 14.6 ms   | +8.6%                              |
| Sculpture | 5.1 / 6.3 ms  | 15.8 / 16.1 ms   | −2.3%                              |

Absolute median budgets pass in the final run. A heavily contended earlier 4K run measured **21.9 / 20.6 / 22.9 ms p50**; it is retained, not discarded. The final pair's +5% relative gate **fails for Pool and Crown**. Do not claim venue cadence or independent aesthetic acceptance from these probes.

- Full `npm test`: **995 pass, 21 opt-in skips, zero failures**. Targeted family/world-rhythm/flash suite: **51/51**. Typecheck, build and native DE/EN i18n pass. Scene/tests/verifier/family-doc/plan formatting passes. Five shared files still warn; the same five warnings were reproduced on main's sources, so unrelated rows/dictionary entries were not reformatted.
- CPU references cover physical wavelength, exact hex neighbours, grounded field, 401-point forward/reverse continuity, energy population, bisection, anchored strike growth, negative settling tail, outward pressure front and 3:4 polyrhythm. Presets and density floors validate.
- Native verifier: **162 late-time cases**, **162 same-slot reversal frames**, three palettes × three energies, portrait states and 4K; zero GL/non-finite errors. Separate **240-frame 1080p limiter-enabled** run: non-exempt, approval active, no limited frames or GPU errors.
- Review film rounds: `artifacts/look-review/liquid-chrome-r4-round{1,2,3}/`. Final still/film/rhythm/grids: **`artifacts/look-review/liquid-chrome-r4/`**.
- Energy/portrait/late/live evidence: `artifacts/films/ferro-r4-verification/`. Final profiles: `artifacts/performance/ferro-r4-final-{1080,4k,pair}/`; earlier contended/repeat probes remain alongside them.

## Remaining limitations

The lattice is intentionally regular and the lower-energy Crown remains quieter than the peak. Grazing needle tips can retain subpixel glints; the mirror reflection is strongest along the front edge rather than across a broad floor. Two analytic near droplets give softer edges, not a physical depth-of-field lens. The pressure wave is a bounded envelope-driven approximation, not a simulated travelling fluid impulse. Independent review remains the acceptance authority.
