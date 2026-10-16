# Brass Orrery / Messing-Orrery

**INCREMENTAL / EMPIRICAL**, fleet r4, 2026-10-17. Family **109**, renderer `orrery`, world `brass-orrery`. Implementer: openai-codex/gpt-6.1-sol. No engine, limiter, preset, schema, state or rhythm-placement changes; no HISTORY migration needed.

## Signature mathematics

Actual extruded involutes, common module `m = 0.05`, pressure angle `α = 20°`, integer teeth 56/24/40:

- Pitch radius `r = mN/2`, base radius `rb = r cos α`.
- Involute `I(t) = rb(cos t + t sin t, sin t − t cos t)`.
- Flank half-angle `π/(2N) + tan α − α − inv(R)`, with `inv(R) = sqrt((R/rb)² − 1) − atan(sqrt((R/rb)² − 1))`.
- Addendum `r + m`, dedendum `r − 1.25m`; flank begins at `max(rb, dedendum)`.

Each nine-gear train is a tree: one 56-tooth driver, four 24-tooth intermediates, four 40-tooth followers. Pitch-centre distance is `rp + rc`; signed ratio `ωc = −ωp Np/Nc` preserves `ωp rp + ωc rc = 0`. Contact phases solve tooth-to-gap alignment. **25 seed-persistent trains, 225 gears, 200 meshes** transform rigidly under uniform train scales. Rhythm never changes meshing shaft speeds.

Five planetary shafts use ratios **1:2:3:4:6**, radii `1.3 + 0.49i` and independent inclinations. The shared drive period **30π** completes integer turns for all shafts. This is an astronomical clock, not an ephemeris or contact-dynamics simulation. CPU references in `orrery-model.mjs` cover involutes, 0.008-unit shared bevels, camera/train placement, orbits, palette anchor, light falloff and sphere eclipses.

## States, camera and looks

Three same-seed **10901** states, identical other parameters; reversible development 0–2 never rebuilds geometry:

| State               | Composition                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gears / Zahnräder   | Oblique thick mechanism, near tooth arcs, raised bearings, spoke apertures and machining.                                                                                                |
| Orrery              | Central sun, inclined meridians, continuous 9% focal compensation. First side banks remain near the camera instead of retreating into black; ribs, shafts and floor emerge continuously. |
| Clockwork / Uhrwerk | Gear walls, roof, eight receding bays, chains, trusses and a pendulum frame the original train. Distant mechanisms darken; the bob no longer obscures the central mechanism.             |

Roll-free camera, short-side projection, deliberately cropped peripheral masses. CPU tests cover the complete middle-state camera loop and safe meridian margin including 1.8% kick. Camera/drive clocks wrap at **2π / 30π**. Eight unchanged looks: Gears, Orrery, Clockwork, Watchmaker, Copernican Night, Silver Escapement, Sidereal Vault, Midnight Calibre.

## r4 review response

1. **Middle staging:** near banks no longer move backwards as the camera retreats. First-bank centres at development 1 are `(±4.6, 0, 3)`, under six units ahead of the camera. Existing architecture and floor perspective continue through the middle.
2. **Readable strike:** a thicker, jewel-tipped fork sits in front of and left of the sun. The count-selected contact uses the same rigid rotation and development transform as the actual fork. A narrow stress front crosses gear faces and bearing seats, not broad cylinder sides. Explicit envelope gating gives dark recovery; muted counts change zero pixels.
3. **Peak hierarchy:** pendulum bob radius **0.95 → 0.50**, peak planet radii scaled by **0.52** with matching eclipse radii. Receding banks and peak meridians dim; cohort glints narrow to an annulus. Geometry/ratios persist.
4. **Materials:** palette-derived saturated alloy, narrower reflection card, reduced broad fill/white dilution and reduced sun diffuse/emission. Tooth roots, cool glints, solid bevels, floor and black gaps remain.

Three r4 film rounds plus a final refinement were inspected as sheets and individual 960px stills. Round 1 over-warmed the alloy. Round 2 exposed the critical obstruction as the **pendulum bob**, not an orbiting planet. Round 3 corrected the obstruction and enlarged pallet contacts; final refinement suppressed sidewall stress patches and count-dependent idle tip light.

Energy reveals filtered major/minor dial indices at **0.15–0.8** and changes integrated movement rates, never master exposure. The sun remains a local inverse-square light, `10 / (0.7 + distance²)`, with analytic moving planet eclipses. Events remain local behind the unmodified live limiter.

## Four gestures / unchanged presets

| Slot | Gesture                            | Effect                                                                                            |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0    | Escapement tick                    | Bounded fork rock and engaged tooth sectors.                                                      |
| 1    | Ratio cohort                       | Count-selected narrow cool dial/bearing catches.                                                  |
| 2    | Clockwork wave                     | Sparse wave along real tooth rims.                                                                |
| 3    | Escapement strike / Hemmungsschlag | Alternating jewel contact, followed by a narrow gear-face/bearing stress front and dark recovery. |

| Style      | Name                                  | Hits/bar | Slot-3 eighth-note steps (zero-based) |
| ---------- | ------------------------------------- | -------- | ------------------------------------- |
| restrained | Sleeping gears / Schlafende Zahnräder | 3.75     | 14, 28                                |
| driving    | Brass escapement / Messinghemmung     | 12.5     | 0, 13, 18, 30                         |
| accented   | Cathedral clock / Kathedralenuhr      | 19.5     | 0, 11, 22, 24, 30                     |

Slot 3 spans four bars. Off-beats, fast local tooth ticks, spaced structural waves and the three-bar accented cohort retain their original placement differences. Existing DE/EN labels remain unchanged.

## Cost and verification

Seed-only mesh: **1,887,642 vertices / 128,359,656 uploaded bytes** (3,456 vertices added for mirrored contact jewels). Fixed 128 MiB construction allocation, no new pass or simulation. Earlier architecture visibility deliberately increases middle-state fill cost.

Native Apple M3 Pro / ANGLE Metal, 48 synchronous frames/state including post, energy 0.95; shared-machine throughput, **not venue cadence qualification**:

| State     | 1080p p50/p95 | 4K p50/p95     | ABBA Δ p50 vs main 1080p / 4K |
| --------- | ------------- | -------------- | ----------------------------- |
| Gears     | 4.2 / 8.3 ms  | 8.7 / 11.1 ms  | +4.8% / +5.1%                 |
| Orrery    | 5.1 / 7.8 ms  | 10.1 / 14.0 ms | +10.3% / +19.2%               |
| Clockwork | 5.5 / 8.1 ms  | 11.8 / 15.4 ms | −3.7% / +2.0%                 |

Absolute p50 budgets pass; **paired +5% gate fails**, chiefly the deliberately fuller middle. Do not hide this regression.

- `npm test`: **1020 pass / 22 opt-in skips / 0 fail**; world-rhythm and pipeline-flash included. Typecheck and touched-file Prettier pass. Native DE/EN UI passes.
- Opt-in family GPU: **14/14**, 81 state/energy/palette/aspect/4K combinations at 43,200 seconds; zero GL/non-finite errors; identical paused reversal, same mesh; muted count changes zero pixels. This inherited deterministic probe disables asynchronous approval through its shared render helper; it is not limiter acceptance.
- Separate `scripts/verify-orrery.mjs --rig --port 48782`: **35 limiter-enabled captures**, three palettes × three states × three energies at square aspect and 12h, plus eight samples across an actual scheduled strike at energy 0.85. Zero GL/non-finite errors, no empty frames or full-screen white. `report.json` records limiter state, lit fraction and white area.
- Raw evidence: `artifacts/orrery/r4-{gpu,live,profile-1080,profile-4k,pair-1080,pair-4k}/`.
- Final reviewer evidence: `artifacts/look-review/brass-orrery-r4/`, including standard sheets/film/grids, large middle/peak frames and supplementary limiter-enabled `strike-sequence.png` / individual strike stills.

**Self-assessment: L 7.5, not an independent pass.** Stronger inhabited middle, exposed contact and less obstructed peak. Remaining risk: abundant thin orbital crossings and some dull alloy mid-tones; the short default rhythm strip is less explanatory than the consecutive live strike samples. Independent reviewer owns the ≥8 verdict.
