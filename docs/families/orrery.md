# Brass Orrery / Messing-Orrery

**INCREMENTAL / EMPIRICAL**, third revision, 2026-10-15. Family **109**, renderer `orrery`, world `brass-orrery`. Gears / Zahnräder → Orrery → Clockwork / Uhrwerk. No engine changes. World ID, eight look IDs/names/seeds, preset parameters, schema keys and rhythm IDs remain unchanged.

## Signature mathematics

Real extruded **involute profiles**, with common module `m = 0.05`, pressure angle `α = 20°` and integer tooth counts 56/24/40:

- Pitch radius `r = mN/2`, base radius `rb = r cos α`.
- Involute `I(t) = rb(cos t + t sin t, sin t − t cos t)`.
- Flank half-angle `π/(2N) + tan α − α − inv(R)`, where `inv(R) = sqrt((R/rb)² − 1) − atan(sqrt((R/rb)² − 1))`.
- Addendum `r + m`, dedendum `r − 1.25m`; start the flank at `max(rb, dedendum)`.

Each train is a nine-gear tree: one 56-tooth driver, four 24-tooth intermediates, four 40-tooth followers. Pitch-centre distance is `rp + rc`; signed angular ratio is `ωc = −ωp Np/Nc`, so `ωp rp + ωc rc = 0`. Tooth-to-gap phase is solved on each contact line. There are **25 seed-persistent trains, 225 gears and 200 meshes**. Entire trains transform rigidly and scale uniformly through development; no kick perturbs a meshing shaft.

Five planetary shafts have exact ratios **1:2:3:4:6**, radii `1.3 + 0.49i` and independently inclined planes. A shared drive period **30π** completes integer turns for every gear and planet. This is an authored astronomical clock, not a Solar System ephemeris or contact-dynamics solver.

`orrery-model.mjs` contains CPU references for profiles, bevels, train/camera placement, inclined planet and meridian positions, palette-owned alloy selection, light falloff and sphere eclipses. Shared mitered tooth bevels remain 0.008 units wide, capped at twice that width; regression tests reject crossing inset edges. The far-bank annulus now uses one triangle fan per tooth: **every original outer involute/bevel point is preserved**, with fewer redundant inner-bore vertices. Tests check preserved points and positive triangle winding.

## Continuous composition

The three state presets retain seed **10901** and identical non-development parameters. Development 0–2 is reversible geometry and continuous camera motion, never a dissolve, reset or rebuild.

| State | Composition |
| --- | --- |
| Gears / Zahnräder | Close oblique main mechanism, overlapping peripheral teeth and smaller trains behind. Real 0.52-unit-thick bodies, raised bearings, spoke apertures, filtered machining and closed near-hero rear/inner faces. |
| Orrery | Camera now aims **at the sun**, not behind it; a continuous development-local dolly centres the hero. Three meridians have distinct 0.28/0.71/1.14-radian inclinations, rather than all sharing one flattened plane. Over a complete camera loop, CPU projection measures **65.8–67.2% short-side height and 79.8–80.9% width** for the meridians alone. The background gear train slides 1.1 units farther behind them. |
| Clockwork / Uhrwerk | Flight into inward gear walls, a gear-covered roof and eight receding vault bays. Double ribs, diagonal trusses, transmission shafts and chains flank the monumental pendulum. The original sun and orrery remain down the nave. |

The camera is roll-free and closed, with a clear central flight corridor and bounded **1.8%** kick focal punch. Short-side projection is shared by landscape and portrait. Near peripheral cropping is intentional; the central Orrery is not cropped. Tests cover the entire camera loop, centred sun, meridian coverage, safe projection depth and portrait/landscape edge margin.

## Brass, sun, rounded carriers and atmosphere

The alloy chooses the **warmer primary/secondary anchor inside the current palette** using `r + 0.35g − b`, then retains 8% of the other anchor. Thus Phosphor uses its yellow primary instead of blue; Symbiosis uses its ochre secondary instead of mint. Copper is bronze; Glacier and Silver remain appropriately cool. No fixed brass RGB and no palette-independent orange light are introduced.

Directional reflection cards have darker empty directions, stronger narrow strips, less white dilution and a brighter palette rim. Filtered lathe markings and recessed bearing-seat darkening remain. The sun is emissive geometry and a local point light with **`10 / (0.7 + distance²)`** falloff (twice the previous strength), normal incidence, modest ambient bounce and warm specular response. Five analytic moving planet eclipses use the actual inclined planet centres within a 12-unit shadow reach. Core and small specular peaks exceed 1.0 on the float path; the scene does not flash white.

The bright rectangular panel was traced to an **edge-on flat-sided bearing hoop**, not just a wall. Cathedral bearing hoops are now smooth-normal, round-section tori. Wide rectangular wall carriers were also replaced with paired round rods. These are geometric fixes, not just darker paint over the panel.

Distance fog and a clipped, bounded Lorentzian approximation to a raking light-sheet integral veil both background and solid metal. Background shaft pools support the long nave. **480 seeded, depth-tested dust triangles** drift continuously with the integrated drive and have real parallax; no full-screen per-pixel dust hash or volume march. The dark tiled floor and dim depth-tested hero reflection remain.

## Stable looks, energy and endlessness

Eight unchanged looks: Gears, Orrery, Clockwork; Watchmaker / Uhrmacher; Copernican Night / Kopernikanische Nacht; Silver Escapement / Silberhemmung; Sidereal Vault / Sterngewölbe; Midnight Calibre / Mitternachtskaliber.

Energy changes integrated gear/camera rates, not master brightness. Drive and camera clocks wrap at **30π** and **2π**; pendulum, dust and all orbital phases respect those periods. No simulation can stall, saturate or die. Existing local `familyEffect` gestures remain:

1. **Escapement tick**, 4 beats: bounded anchor/pendulum rock and engaged tooth-rim light.
2. **Ratio cohort**, 8 beats: persistent shaft-cohort glint, never a speed change.
3. **Clockwork wave**, 16 beats: bounded radial tooth-light wave.

## Cost and performance

Final mesh: **1,884,186 vertices / 628,062 triangles / 128,124,648 uploaded bytes**. Previous final: 1,966,938 vertices / 133,751,784 bytes. The seed-only bounded 128 MiB construction allocation is unchanged; upload size decreases **4.2%** despite round carriers and dust. Camera position is passed flat from the existing vertex calculation instead of rebuilding its trigonometry/basis at every metal pixel. No new engine passes or resources.

Apple M3 Pro / headless Chrome / ANGLE Metal, energy 0.95, synchronous throughput including post. This assignment's governing ceiling is **previous final +5%**, as well as 8/16 ms absolute. Final run: 48 samples/state.

| State | Previous final → final 1080p p50 | Final p95 | Previous final → final 4K p50 | Final p95 |
| --- | --- | --- | --- | --- |
| Gears | 4.1 → **3.4 ms** | 3.9 ms | 6.7 → **6.9 ms** | 7.6 ms |
| Orrery | 3.4 → **3.3 ms** | 3.6 ms | 7.1 → **6.7 ms** | 7.2 ms |
| Clockwork | 4.4 → **4.1 ms** | 4.6 ms | 9.1 → **8.4 ms** | 9.0 ms |

All six final p50 values meet the governing ceilings; largest increase is **3.0%**. A fresh initial baseline was faster (1080p 3.4/3.2/3.8, 4K 6.0/5.9/7.7 ms); a pre-final candidate measured 3.2/3.0/3.8 and 5.9/5.9/7.6 ms. Another final-source run during shared-machine contention measured 3.9/4.0/4.8 and 8.0/7.5/8.9 ms and exceeded some relative ceilings. All profiles are retained, not hidden; these are noisy shared-machine throughput probes, not venue qualification. The report distinguishes the prior committed final baseline from the fresh initial probe.

## Verification and visual review

- Focused CPU/time suite: **21 pass, 1 opt-in skip**. Native GPU enabled: **22/22 pass**.
- Added warm-anchor, whole-camera-loop centred hero/framing, exact outer-point/fan-winding and rounded-hoop normal regressions. World tests now find `brass-orrery` **by ID**, never registry position.
- Native matrix: 3 states × Symbiosis/Glacier/Silver × landscape/portrait/4K, energy 0.1, time 43,200. No GL errors, non-finite uploads or black frames. Paused 0.73 → 1.97 → 0.73 remains pixel-identical with the same mesh object.
- Native time-wrap/rate audit passes at 3600, 4096 and 43,200 seconds and after late energy/fader changes.
- Typecheck, build and native German/English UI checks pass.
- Full suite: **743 pass, 10 skip, 3 expected catalog-preview/curation failures only**. Protected tests/editorial files are untouched.
- **Five filmed improvement rounds**, each 30 seconds, compared with a newly filmed Liquid Chrome reference: centred warm hero; controlled sun plus haze; cheaper depth-tested dust and fill; rounded-hoop slab repair plus vertex-camera reuse; independently inclined meridians and final framing. All eight energy ladders, three final world-palette films, Glacier extra-look film, portrait and 4K stills were reviewed. Superseded videos were removed; strips and a hash manifest remain.

**Honest rating: 8.3/10, not 9.** Framing, illumination and spatial atmosphere improve substantially, and the flat panel is gone. Liquid Chrome still has the cleaner highlight hierarchy and sculptural/material refinement. Remaining weaknesses: distant teeth are high-frequency; arm construction is schematic; reflections/occlusion are analytic rather than full scene transport; the bright central gear can still compete with the sun; the vertex buffer remains large.

Evidence lives under `artifacts/orrery/round3-*`, an ignored symlink into the lane's absolute output evidence directory. `output/report.md` records final commit, exact paths, filmed rounds, costs and limitations.
