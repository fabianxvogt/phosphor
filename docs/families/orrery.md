# Brass Orrery / Messing-Orrery

**INCREMENTAL / EMPIRICAL**, fleet r3, 2026-10-16. Family **109**, renderer `orrery`, world `brass-orrery`. Implementer: openai-codex/gpt-6.1-sol. No engine or flash-limiter changes. World/state/look IDs, eight preset names/seeds/parameters, schema keys and the three existing rhythm IDs are unchanged. Slot 3 is additive; no world HISTORY migration is needed.

## Signature mathematics

Real extruded **involute profiles**, with common module `m = 0.05`, pressure angle `α = 20°` and integer tooth counts 56/24/40:

- Pitch radius `r = mN/2`, base radius `rb = r cos α`.
- Involute `I(t) = rb(cos t + t sin t, sin t − t cos t)`.
- Flank half-angle `π/(2N) + tan α − α − inv(R)`, where `inv(R) = sqrt((R/rb)² − 1) − atan(sqrt((R/rb)² − 1))`.
- Addendum `r + m`, dedendum `r − 1.25m`; the flank starts at `max(rb, dedendum)`.

Each train is a nine-gear tree: one 56-tooth driver, four 24-tooth intermediates and four 40-tooth followers. Pitch-centre distance is `rp + rc`; signed angular ratio is `ωc = −ωp Np/Nc`, so `ωp rp + ωc rc = 0`. Tooth-to-gap phase is solved on each contact line. **25 seed-persistent trains, 225 gears, 200 meshes** transform rigidly with uniform train scales; rhythm never changes a meshing shaft's speed.

Five planetary shafts have exact ratios **1:2:3:4:6**, radii `1.3 + 0.49i` and independent inclined planes. The shared drive period **30π** completes integer turns for every gear and planet. This is an astronomical clock, not a Solar System ephemeris or a contact-dynamics simulation.

`orrery-model.mjs` provides CPU references for involutes, bevels, train/camera placement, planet/meridian positions, warm-anchor selection, light falloff and sphere eclipses. Shared mitered bevels remain 0.008 units wide, capped at twice that width. Far-bank annulus fans preserve every outer involute/bevel point. No topology or upload cost changed in this fleet round.

## States, camera and looks

The three state presets retain seed **10901** and identical non-development parameters. Development 0–2 is reversible geometry, not a dissolve, reset or mesh rebuild.

| State               | Composition                                                                                                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gears / Zahnräder   | Close oblique mechanism, overlapping peripheral teeth and smaller receding trains. Thick bodies, raised bearings, spoke apertures and filtered machining.                                                                                                    |
| Orrery              | Central sun and independently inclined meridians. Continuous development-local **9% focal compensation** enlarges the intermediate hero without changing its camera phase. Whole-camera-loop tests retain a safe short-side margin, including the 1.8% kick. |
| Clockwork / Uhrwerk | Inward gear walls, gear-covered roof, eight receding bays, trusses, transmission shafts, chains and a monumental pendulum. The original sun/orrery persists down the nave.                                                                                   |

The roll-free camera uses short-side projection in landscape and portrait. Near peripheral cropping is intentional; the central meridians remain inside the tested margin. Foreground movement, depth fog, contact shading, reflection gradients and repeated scale cues supply depth.

Eight unchanged looks: Gears, Orrery, Clockwork; Watchmaker / Uhrmacher; Copernican Night / Kopernikanische Nacht; Silver Escapement / Silberhemmung; Sidereal Vault / Sterngewölbe; Midnight Calibre / Mitternachtskaliber.

## Fleet r3 look changes and energy grammar

The palette's warmer primary/secondary anchor still owns the alloy. Bounded accent absorption warms the default lime anchor into gold without hard-coded orange RGB. Lower white dilution preserves mid-tone saturation; cool reflection cards separate from the metal. Reduced background scattering and secondary-owned dark fog restore black gaps and overlapping depth layers rather than veiling the cathedral in olive haze.

Filtered major/minor dial graduations resolve with energy **0.15–0.8**. Energy also changes integrated gear/camera rates, not master exposure. Engraving is a detail change, not new geometry. Sun geometry and the local `10 / (0.7 + distance²)` light retain analytic moving planet eclipses. Bright peaks are local; no screen-space flash is drawn.

Round 1 added the signature and stronger local gestures; round 2 separated alloy/cards, reduced haze and enlarged the hero; round 3 refined gold absorption, dial indices and the spatial strike width/colour. Before and all three round films are retained under `artifacts/look-review/brass-orrery-r3-*`.

## Four gestures and three presets

| Slot  | Gesture                                | Visible mechanism                                                                                                                                                                                                                                                                                                                                       |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Escapement tick                        | Bounded anchor rock and count-selected engaged tooth sectors, rather than tinting an entire face.                                                                                                                                                                                                                                                       |
| 1     | Ratio cohort                           | A persistent shaft cohort catches a cool face/rim glint; meshing ratios never change.                                                                                                                                                                                                                                                                   |
| 2     | Clockwork wave                         | An infrequent accent wave propagates over actual tooth rims through the cathedral.                                                                                                                                                                                                                                                                      |
| **3** | **Escapement strike / Hemmungsschlag** | Alternating pallet origins launch a narrow amber/accent stress front through real gear rims, bearing seats and armillary rings. `u_rhythm.w` drives propagation, `u_rhythmHit.w` contributes to bounded anchor motion, and `u_rhythmCount.w` alternates the origin/direction. With envelope and hit zero, count changes cannot produce light or motion. |

Three world-specific presets, counting **family tracks only**, excluding globals:

| Style      | Name                                  | Hits/bar | Slot-3 loop, eighth-note steps |
| ---------- | ------------------------------------- | -------- | ------------------------------ |
| restrained | Sleeping gears / Schlafende Zahnräder | 3.75     | `........                      | ......X. | ........ | ....x...` |
| driving    | Brass escapement / Messinghemmung     | 12.5     | `X.......                      | .....X.. | ..x..... | ......X.` |
| accented   | Cathedral clock / Kathedralenuhr      | 19.5     | `X.......                      | ...X.... | ......x. | X.....X.` |

Slot 3 spans four bars: zero-based steps **14,28** / **0,13,18,30** / **0,11,22,24,30**. Fast tooth ticks fill the grid; slower shaft addresses and phrase waves retain recovery space. The shared limiter is unchanged. DE/EN labels and descriptions are additive immediately after this family's existing descriptions.

## Endlessness and cost

Drive and camera integrated clocks wrap at **30π** and **2π**. Pendulum, dust and orbital phases respect those periods; no simulation can stall or saturate. Late shaders are checked at **43,200 seconds**.

Unchanged seed-only mesh: **1,884,186 vertices / 628,062 triangles / 128,124,648 uploaded bytes**. The model uses a bounded 128 MiB construction allocation. The added cost is fragment-side filtered engraving and bounded stress-front arithmetic, not new passes, resources, raymarches or topology.

Native Apple M3 Pro / Chrome / ANGLE Metal; 48 synchronous samples per state including post, energy 0.95. These are shared-machine throughput measurements, **not venue cadence qualification**:

| State     | 1080p p50 / p95 | 4K p50 / p95   | Paired main delta 1080p / 4K |
| --------- | --------------- | -------------- | ---------------------------- |
| Gears     | 4.3 / 4.5 ms    | 8.5 / 9.0 ms   | +5.0% / +7.8%                |
| Orrery    | 4.0 / 4.6 ms    | 7.9 / 9.0 ms   | +2.6% / +9.7%                |
| Clockwork | 4.9 / 5.3 ms    | 10.8 / 11.6 ms | +4.3% / +7.3%                |

All absolute p50 budgets pass (8/16 ms). The ABBA pair probe against main has **64 frames/candidate/state**; its stricter +5% relative gate exits nonzero, especially at 4K. This regression is reported, not hidden. Raw probes live in `artifacts/orrery/r3-verification/{profile-1080,profile-4k,pair-1080,pair-4k}/profile.json`.

## Verification and evidence

- Full suite: **974 pass, 21 opt-in skips, zero failures**. Includes world-rhythm and pipeline-flash tests.
- Family native GPU suite: **13/13 pass**, including **81** combinations of 3 states × 3 energies (0.1/0.5/0.9) × Symbiosis/Glacier/Silver × landscape/portrait/4K at time 43,200. Zero GL errors/non-finite values, minimum downsampled mean 7.77/255, minimum peak 242/255.
- Isolated slot-3 GPU probe: muted count changes affect **0%** of pixels; an early strike affects **15.0%**, and moving its front affects **30.4%** (RGB delta >3/255 at 160×90). This proves localized visible response, not aesthetic quality; the shared limiter stays intact.
- Paused 0.73 → 1.97 → 0.73: byte-identical frame and same mesh. CPU tests cover continuous placement, exact meshing, preset validation, slot 3, all style loops and grid density.
- Typecheck, build, distribution check and native DE/EN i18n pass. The UI script requires `--native-gpu`; `--rig` alone is ignored by that script and its software attempt timed out. Profile CLI uses `--families` (the brief's singular `--family` is unsupported).
- Prettier passes the fully owned scene/test/doc/plan files. Full shared dictionaries already fail Prettier on main; only the new keys are formatted, avoiding unowned rewrites.
- Final reviewer evidence: `artifacts/look-review/brass-orrery-r3/brass-orrery-{sheet,rhythm}.png`, `brass-orrery.mp4`, `grids.md`. Additional full films: `brass-orrery-r3-ember/`, `brass-orrery-r3-glacier/`. Portrait/4K energy images and health JSON: `artifacts/orrery/round3-gpu/`.

**Self-assessment: L 6.5/10, not an independent pass.** Warm/cool separation and rhythmic mechanism accents improve substantially over baseline. Remaining weaknesses: the intermediate orrery is still a compact centred assembly with empty landscape margins; distant teeth remain high-frequency; pale stroke highlights can read as tint rather than a mechanically striking pallet; the large mesh and 4K relative regression remain. A further conceptual composition pass would be needed to claim L≥8 honestly.
