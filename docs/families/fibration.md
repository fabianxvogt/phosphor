# Linked Fibres (96) · world Hopf Bloom — `scene-fibration.mjs`

**INCREMENTAL / FORMAL + EMPIRICAL**, 2026-10-14. The Hopf fibration of S³ as real 3D geometry: every tube is one exact fibre, a great circle of S³ over one point of S², stereographically projected to a round circle in space. Rendered on the engine's mesh path with a depth buffer; no engine change.

## Algorithm

The fibre over the base point (θ, φ) is q(s) = (cos η·e^{i(s+φ)}, sin η·e^{is}), η = θ/2; the Hopf map (z1, z2) → (2·z1·z̄2, |z1|² − |z2|²) sends all of it to (sin θ cos φ, sin θ sin φ, cos θ). A 4D rotation in the (x1, y2) plane (the _tumble_) moves the projection pole off the south-pole fibre, so tori swing into Dupin cyclides while staying an exact (rotated) Hopf fibration. Stereographic projection p = (x1, y1, x2)/(1 − y2) and its exact first and second derivatives (q″ = −q) give each circle's Frenet frame in the vertex shader; tubes are built around it. Projected z is the world's vertical axis.

## Signature detail

- **Linked circles.** Any two fibres are linked once (Gauss linking integral, tested at all three states, with tumble, within and across tori and with the core).
- **Villarceau circles and nested tori.** The fibres over one latitude fill a torus, each winding once around both ways. Later layers bloom out of their parent latitude, so the audience sees one torus become nested shells.
- **The core circle.** The unit circle (all fibres over the north pole) appears last, in accent, at the centre of every torus.
- **The circle action.** Light beads flow along all fibres at once (q → e^{iα}q moves every point along its own fibre); on the large outer circles they visibly accelerate on the far side, showing the conformal scale of the projection.
- **Colour is the map.** Latitude sets each shell's tone (inner shells primary, outer shells secondary); longitude adds primary inlays without broad grey complementary-colour mixtures.
- **Fibre current (slot 3).** A single-use hit starts a 0.72 s travel clock; a coloured head and softer base-colour wake follow the exact circle parameter along an event-count-selected longitude braid. The scheduled envelope bounds its visible lifetime; muting stops the light, never the underlying circle action.

## States (world Hopf Bloom, seed 9601)

| development | state  | content                                                                                                                                                           |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0           | Torus  | One Clifford torus (θ = π/2) of 20 linked Villarceau circles, filling roughly 75–85% of the landscape frame height.                                               |
| 1           | Nest   | Five nested tori (θ = 0.90…2.00); inner shells warm and solid, outer shells glassier; wider lens contains the growing structure.                                  |
| 2           | Bundle | Eight tori plus the core circle (135 fibres). The camera enters the outer projection envelope from above: near fibres sweep out of frame around the linked heart. |

Between states, each new torus emerges at its parent's latitude and moves out to its own, while its fibres grow as tapered arcs that close into rings in a seeded sweep. All values in [0, 2] are real geometry; reversal is the same function run backwards. Identity (φ, layer, growth order, arc start) is fixed per seed in the mesh.

## Looks

Linked Torus, Nested Shells, Full Bundle (the world states) · Cyclide Swing (side view, full tumble) · Glass Nest (looking down the axis: the "eye") · Bundle Weather (fast flow, many beads) · Half Bloom (development 1.5, low view) · Slow Core (close, from above, thick tubes).

## Energy, beat, camera

- Energy (orthogonal to development): fibre flow ×0.5→×1.6, tumble ×0.7→×1.35, camera orbit ×0.6→×1.6, bead count +0.5 (the next bead fades in). No brightness term.
- Speeds are **integrated** in a 5×1 RGBA8 simulation (24-bit phases: yaw, flow, tumble, drift, plus a bounded signature travel age), so energy or fader changes alter speed, never position; phases wrap, so late `u_time` cannot lose precision. Light-packet count now ranges from 1 to 8 with the beads fader, with continuous entry of each new packet.
- Camera: slow orbit, gentle pitch/distance drift, elevation per look; kick punches focal length ≤ 2.2%. Base distance 6.0 → 6.3 → 4.2, focal length 2.7 → 1.45 → 1.35. The peak eye enters the projection ball but stays above the actual tubes. The CPU reference checks either radial exclusion or the exact swept vertical bound `sin(eta)/(cos(eta)−|sin(a)|)`, including maximum thickness, all elevations and the closest distance. A smooth minimum-pitch guard lifts low-elevation looks before the dolly. Drift harmonics complete whole turns across the integrated phase wrap.
- Rhythm: **Fibre chase** (every third fibre of every torus plus a comet), **Torus shell** (one latitude torus rim-lit), **Meridian link** (fibres over one meridian glow through all tori), and **Fibre current** (a moving local head/wake). Legacy periods remain compatible; the live scheduler uses the authored phrase styles below.
- Audio: tumble ← low (0.05), beads ← onset (0.08). Shared punch/pulse 0.1/0.15.

## Depth and style

Perspective with orbit parallax; distance fog to the palette ground; key light + wrap + specular; fresnel rim (secondary/white, a little accent); nested occlusion (faces towards the core circle darken with the number of shells already around it) plus true depth-buffer occlusion; scale cues (outer shells few, large and glassy, inner shells many, small and bright). Tubes keep at least ~1.3 px width (thinner ones dim instead) and silhouettes soften into the ground over a pixel to avoid shimmer.

## Cost

135 fibres × 96 segments × 8 sides = 622 080 vertices (2 floats each, 5.0 MB), built once per seed; no textures beyond a 4×1 phase state. Native M3 Pro whole-frame paired p50 against the previous wave-5 final: 1080p 2.775/3.025/3.125 → 2.700/2.925/3.075 ms; 4K 5.825/6.375/6.425 → 5.825/6.400/6.500 ms. These are medians of four-frame block means, not claims of 0.025 ms measurement accuracy. See the fleet report for raw standard probes and contention notes.

## Endless

The fibration is static mathematics; motion comes from wrapped phases (orbit, flow, tumble, drift) that never stop and never accumulate float error. Nothing can die out.

## Tests (`tests/fibration.test.mjs`)

Hopf map of every visible fibre point equals its base point (also under the tumble); projected fibres are round planar circles; Gauss linking |L| = 1 for sampled pairs at all states; bounded projection over a development × tumble grid and camera clearance; integer states complete (0: torus only; 1: five tori; 2: all), Lipschitz-continuous development, new tori start at the parent latitude; deterministic per-seed identity and exact attribute packing; presets validate and the world is detected as a continuous development.

## Wave 2 (2026-10-14): Bundle as the headline

Intentional visual change after owner review: the Bundle had been the busiest image, not the strongest. Now development 1 → 2 also lifts the camera (+0.34 rad), backs it off (+0.7) and re-aims below the centre so the whole bundle sits inside the frame (outer rings off the edges); the inner shells' light doubles toward the peak; the core circle is the one accent ring; rim and bead accent are reduced (rim accent 0.22 → 0.08, beads 0.6 → 0.3) and the fibre-chase cohort brightens its own colour instead of turning accent. Mathematics, mesh, looks and ids are unchanged; previews rebaked.

## Wave 5 (2026-10-15): sculptural bundle

Three filmed rounds: (1) reduce repeated circle vertices 144 → 112 while retaining eight tube sides; thicken the peak and reduce excessive rear fog; (2) narrower pearl glints, stronger secondary rim and inner-shell light, with less hollow outer-shell shading; (3) crane a further 0.18 radians into the peak, aim nearer the centre and increase the peak lens from 1.72 to 1.85. The linked circles remain the entire subject; no decorative overlay. All preset names, seeds, parameters and world definitions are unchanged.

M3 Pro native headless synchronous whole-frame p50, states 0/1/2: 1080p **2.2/2.6/2.9 → 1.7/2.2/2.1 ms**; 4K **8.2/5.6/6.1 → 4.1/4.4/5.2 ms** (shared-machine measurements, not venue cadence). Baseline and final films, energy ladder, Glass Nest film, ember and glacier/portrait sweeps: fleet worker `rework-geometry/output/evidence/fibration/`. The rework test locks saved-look identity and bounds polygon sagitta below .002 scene units. Judged **9/10** for the continuous geometric read; the rear fibres remain intentionally subdued.

## Final round (2026-10-15): scale and an immersive climax

L0's independent film correctly rated the previous final around 7/10: distant fibres and similar framing throughout. Two filmed visual revisions enlarged the opening, added a low palette studio glow and subtle depth fog, and brought the peak camera into the outer envelope. A further filmed safety/cost correction lifts low-elevation looks early enough to avoid the tubes, bounds peak overscan, and cuts segments 112 → 96 without changing the exact Hopf curves, tube sides or seeded identities. Filtered bead windows and a cohort-only chase avoid unnecessary foreground shading; the shared post chain handles display transfer. Inherited non-integer camera-drift harmonics (1.7/2.3) are now whole turns (2/2), with a wrap-periodicity test.

All IDs, look names, seeds, parameters and world definitions are unchanged. Final evidence is under fleet worker `rework-geometry/output/final-round/fibration/`: before/final films, revision strips, ember and glacier portrait films, three-palette native 1080p/4K stills. Paused development reverses exactly without rebuilding the mesh. **Honest revised rating: 8/10**, superseding the earlier self-rating of 9. The peak has real scale and parallax, but extreme foreground arcs still reveal tessellation.

## Round 3 (2026-10-16): luminous linked current

Three filmed revisions retain all exact Hopf centrelines, 622,080 vertices, eight look names/seeds, schema and world states. No HISTORY entry is needed: world definitions and look identities did not change. Changes: saturated latitude/longitude colour separation, reduced white specular/rim contribution, internal axial light, smooth rather than rectangular bead packets, stronger shell/meridian/cohort accents, and a small periodic camera-target drift (eye path/clearance and 2.2% kick bound unchanged). No new geometry, engine changes, preview rebakes or limiter changes.

| Preset         | Character                                                                    | Aggregate family hits/bar |
| -------------- | ---------------------------------------------------------------------------- | ------------------------- |
| Quiet fibres   | Sparse six-beat cohorts, latitude answers, two current entries over two bars | 3.3                       |
| Linked circles | Six-beat shell addresses against a two-bar current braid                     | 6.8                       |
| Meridian braid | Sixteenth-note current fills against five-/six-/twelve-beat selections       | 11.9                      |

Signature current driving steps (zero-based eighths in a 16-step/two-bar cycle): **2, 4, 7, 9, 12, 14**. Restrained: 2, 13 of 16 eighths. Accented: 0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24, 26, 28, 30 of 32 sixteenths. Envelopes settle before the next hit, including the wrap. Other three count-selected tracks stay at ≤2 events/bar. German and English signature copy is supplied beside existing family rhythm keys.

Native M3 Pro synchronous throughput including post (Torus/Nest/Bundle, p50/p95 ms): **1080p 1.9/2.1, 2.4/3.4, 2.5/2.9; 4K 4.9/5.3, 5.6/6.0, 5.8/6.5**. Interleaved ABBA pair vs main: repeat 1080p p50 **0%, 0%, +4.2%**; 4K **0%, +2.0%, −9.7%**. First 1080p pair was noisy (+10%, 0%, −7.4%); repeat passed the 5% gate. Pair routing shares the final geometry helper on both sides, so it isolates shader/material/rhythm cost rather than the tiny target-drift change. Shared-machine throughput is not venue cadence.

Verification: full suite **979 pass / 21 skipped / 0 fail**, typecheck, DE/EN browser integration, scoped Prettier, family/world-rhythm/flash tests; native `scripts/verify-fibration.mjs --rig --port 48880` tests 27 state × energy × palette cases (Phosphor/Ember/Glacier, energies .1/.5/.9), portrait/square Glass Nest, late time 43,200 s and forward/reverse development without a mesh rebuild. Live limiter remains enabled throughout that check; minimum lit coverage 24%, gain 1, zero GL/nonfinite/browser errors. An isolated authored restrained signature strip verifies that the GPU travel age resets once on the hit, then increases monotonically through the envelope (rather than resetting on every simulation write). The before, rounds 1–3, final film/sheets, grids and probe JSONs live under `artifacts/look-review/` in the lane worktree. Film harness captures are deterministic renderer evidence, not live safety qualification.

Remaining: thin far fibres and close circle tessellation are visible at high contrast; the opening remains a contained geometric sculpture, not an environment. The signature is clearly local, but dense driving playback makes the full path harder to follow than a restrained isolated hit. Self-assessment L7, not a claimed independent ≥8 pass.

## Limits

The tumble's camera target follows the core circle analytically (x = tan a), not the full cyclide's bounds. Nested-occlusion darkening is an approximation (the untumbled core direction), not computed ambient occlusion. Bead length varies with the projection's speed by design. No MSAA: edge softening is shading-based.
