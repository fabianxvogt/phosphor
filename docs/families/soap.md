# Soap Cathedral · Seifenkathedrale (#113)

One continuous world, `soap`, with development `0 → 2`: **Bubble → Cluster → Foam** (DE **Blase → Verbund → Schaum**). Eight looks; one seed and identical non-development parameters across the three world states. No engine changes.

## Algorithm and signature mathematics

Every film is an analytical intersection, not a raymarch. Four persistent sites form a regular unit-edge tetrahedron. A cell is a spherical envelope clipped to its power region; each shared power-bisector face is drawn once (`j < k`) and clipped against the remaining sites. New cells grow from zero radius; their centres move continuously out of the original bubble. The same object remains the central rose-window cluster at the peak. Six independently oriented tetrahedral groups grow from it into buttresses and a high vault; nine smaller seeded cells provide scale.

**Thin-film interference:** air / soap / air, refractive index `n = 1.333`. Snell's law gives `cos θt = sqrt(1 − (1 − cos² θ)/n²)`. The round-trip optical phase is `δ = 4π n d cos θt / λ`. For each s/p interface reflectance R, the symmetric-film Airy reflectance is

`2 R (1 − cos δ) / (1 + R² − 2 R cos δ)`.

The phase reversal at the first interface makes integer orders `2 n d cos θt = m λ` destructive; half orders are constructive. The shader evaluates 460/550/650 nm together. Optical order indexes **`palette(t)`**, never a hard-coded spectral RGB rainbow. The coordinate `0.02 + 0.79 f + 0.17 f¹²`, where `f = (1 + sin δ)/2`, traverses the whole palette without dwelling at its accent end or wrapping discontinuously. The top drains to a 6 nm minimum black film; the lower reservoir carries several higher orders. Projected softboxes include an actual crossbar and curve with the reflected direction. Palette practicals, grazing reflection and hot liquid borders feed the float bloom path.

**Plateau's laws:** every equilateral site triple has three equal-tension films meeting at 120°. The four border directions at a regular tetrahedral vertex have pairwise dot product `−1/3`, hence **109.4712206°**. With equal bubble radius and centre distance, the two exterior spherical caps and the shared flat film also have three 120° outward tangents at their wet seam. Rotations and uniform scale preserve these angles.

**Model limits:** these are ideal tetrahedral foam junctions, not a general surface-tension solver. Intermediate unequal-radius power cells are a continuous artistic growth path, not exact Young–Laplace equilibria. Cathedral groups are arranged as architectural clusters; their overlaps are optically layered, not globally relaxed into one space-filling foam. Back films are attenuated and layers use bounded order-independent optical-depth accumulation, rather than recursive refraction or full multiple scattering. The local Plateau geometry and Airy calculation are exact within those declared limits.

## States and looks

| Look                            | Development | Character                                                                          |
| ------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| Bubble / Blase                  | 0           | One drifting, iridescent film, immediately composed at low energy                  |
| Cluster / Verbund               | 1           | Four joined cells, shared membranes and readable Y-shaped liquid borders           |
| Foam / Schaum                   | 2           | Giant rose-window cluster; near buttresses, distant vault and small floating cells |
| Pearl Vessel / Perlengefäß      | 0.2         | Thinner, restrained film and raised viewpoint                                      |
| Tidal Glass / Gezeitenglas      | 0.9         | High optical orders, stronger drainage and slower drift                            |
| Quiet Junction / Stiller Knoten | 1.2         | Broad liquid borders, low viewpoint and unhurried flow                             |
| Opal Nave / Opalschiff          | 2           | Wider cathedral, raised viewpoint and fine optical orders                          |
| Black Pearl / Schwarze Perle    | 1.8         | Close, compact nave with broad low-order interference fields                       |

## Motion, energy and rhythm

A cell-local thickness chart couples a compact Cartesian vortex to fine folded gravity-drainage layers. The vortex uses a smooth radius-dependent rotation, not a singular polar chart. Positive flow phase carries the fine layer waves downwards. Film thickness bottoms out at 6 nm in the black cap; continuous slow replenishment makes draining endless rather than drying out. `filmThickness()` and `filmPalettePosition()` expose CPU references for the shader's normalised chart and optical palette coordinate. Film thickness and every cell identity are deterministic functions of seed, development and three integrated phases. Development does not reset any phase or seed.

Energy changes Marangoni-flow speed, camera-drift speed, fine drainage-fold amplitude (0.02–0.05 in the normalised chart) and the physical growth of peripheral cells (80–100% of their authored size), never a brightness multiplier. The main subject remains composed even at energy 0.1.

Four bounded `familyEffect` tracks act directly on the signature:

- **Fringe order**, legacy 4 beats: local thickness excursion of at most 16%, moving interference fringes.
- **Border breath**, legacy 8 beats: stronger regional grazing-light breath along existing Plateau borders; bounded kick contribution.
- **Opal window**, legacy 16 beats: a stronger but rare directional highlight on a narrow upper interference order.
- **Film shimmer**, slot 3: an expanding capillary wave temporarily changes local thickness by at most 29.12% (including the one-frame hit term), with a saturated palette-accent catchlight. `u_rhythm.w` moves and fades the wave, `u_rhythmHit.w` marks the strike, and `u_rhythmCount.w` selects one of three persistent membrane cohorts. It neither pops geometry nor changes identity. Dormant/unaddressed waves skip their expensive chart evaluation.

The named presets remain **Thin silence**, **Opal breathing**, **Iridescent bells**. Their family-only densities are **3.0 / 7.0 / 13.0 hits per bar**. Signature steps: restrained `[2,13]` in a 16-step eighth-note loop; driving `[0,3,6,9,12,14]` in a 16-step eighth-note loop; accented `[0,3,6,10,13,19,22,25]` in a 33-step sixteenth-note cycle. That last loop walks across the bar against the existing five-beat fringe figure. All four tracks settle before their next hit. DE/EN names and descriptions are included.

The camera is a closed, slow lateral float with a small vertical component and increased lateral travel between the near buttresses at the peak. Growth carries it into the nave without a cut. Bubble's unpunched projected diameter is now 76.9% of the short side with a slightly off-axis composition (previously 69.7%); Foam retains a clear central rose window with near peripheral cells leaving the sides as spatial framing. Portrait uses the same short-side composition. Kick focal motion is bounded to 1.8%.

Distance fog separates the near buttresses, central cluster and rear vault. An analytical focus approximation widens silhouette/clip coverage and border footprints away from the target distance, and attenuates interference contrast. It is not stochastic depth of field or an extra blur pass. Four faint world-space nave shafts provide camera parallax and a floor light pool supplies a height cue. They are a closed-form ray/beam scattering approximation, not a raymarched atmosphere. The distracting defocused bokeh practicals have been removed. Their reflected studio-light counterpart is a bounded environment approximation, not recursive ray tracing. Rear films fade out toward Foam to avoid muddy optical layering; zero-weight rear intersections are rejected before power-plane clipping.

## Resolution, cost and endlessness

Sphere silhouettes use analytical impact-distance coverage. Shared faces and cap clipping retain a resolution-scaled AA margin. A conservative face-disc rejection includes that margin; it only removes impossible candidates. The unit-edge tetrahedron supplies an exact reused plane-normal length, avoiding repeated square roots. A dynamic six-plane array cache was measured slower and discarded.

### Historical pre-r3 measurements

Native headless Chrome / ANGLE Metal / Apple M3 Pro, synchronous full-frame throughput **including post**, energy 0.95; not venue cadence. Baseline is this revision's fresh measurement of `7d41bac`, 24 frames/state; final is 36 frames/state on the same shared rig:

| State   | 1920×1080 p50 baseline → final | 3840×2160 p50 baseline → final |
| ------- | -----------------------------: | -----------------------------: |
| Bubble  |                   2.5 → 2.2 ms |                   8.4 → 8.0 ms |
| Cluster |                   3.1 → 2.5 ms |                   8.8 → 8.1 ms |
| Foam    |                   4.5 → 4.0 ms |                 16.2 → 13.9 ms |

All states satisfy the new-world 8/16 ms budgets. Zero GL errors, GPU errors or non-finite uploads. Seven group bounds cap the work; there is no simulation, unbounded loop or per-frame CPU geometry rebuild.

The flow, camera and drainage phases use three `clocks`, each exactly `2π`-periodic. The authored first-hour arithmetic has a matching `PHOSPHOR_LATE` clock variant. Rate changes integrate rather than multiplying an elapsed time; reversal is a pure geometry evaluation. GPU seam checks pass at 3600, 4096 and 43200 seconds, including energy/fader rate changes at two hours.

## Verification and visual review

- `tests/soap.test.mjs`: destructive/constructive fringe orders across wavelengths and angles; physical bounds and grazing response; black-cap/lower-reservoir contrast; finite, spatially continuous and exactly periodic vortex chart; bounded local thickness pulse; full-palette coverage without wrapping; every tetrahedral triple's 120° force balance; all six 109.47° border pairs; shared-power-plane symmetry and exact normal lengths; continuous 401-step development and reversal; persistent identities; camera clearance and Bubble framing; bounded gestures; clocks; all eight preset ranges; continuous-world registration **found by world id**, never registry position.
- `node --test tests/soap.test.mjs tests/time.test.mjs`.
- `npm run typecheck`, `npm run build`, `npm run test:i18n -- --port 48508 --native-gpu`.
- This follow-up filmed a fresh baseline and **Liquid Chrome** reference, then five visual improvement rounds: larger cell-local full-palette films; projected studio window/bokeh; black cap and depth/focus/border lighting; finer folds and corrected single fog attenuation; compact vortex and higher-order reservoir. A sixth film verified the exact early rear-film rejection optimization.
- Reviewed all eight looks at energy 0.1/0.5/0.9; full 30-second forward arcs in Phosphor and Ember; a 30-second fixed Opal Nave film in Glacier, 540×960 portrait. Inspected all three full-resolution 4K states and a 1:1 detail crop. A GPU sweep checked 130 forward/reverse frames at low/high energy with zero GL errors and non-finite uploads. Long-show seams/rate steps pass. Baseline, reference and final films/strips, comparison, ladder and measurements are retained with the lane report; superseded intermediate films were deleted.

## Round 3 — 2026-10-16, openai-codex/gpt-6.1-sol

The current independent baseline supersedes the older optimistic artistic claims: **L6 / G2 / E2, Overall 4.5**. Three change/capture/critique rounds plus a final optimisation pass addressed the isolated bubble, uniformly white Plateau seams and invisible rhythm. Directional interference-coloured borders replace the white outline bias; the reflected key is less white, distant films fade more strongly, and low states have a larger off-axis subject, nave shafts and a floor light pool. The exact Airy/Plateau construction, three states, eight preset names/seeds, schema and prior rhythm IDs remain unchanged. No world definition migration was needed.

### Current cost

Native ANGLE Metal / Apple M3 Pro, 36 synchronous frames per state including post, energy 0.95 (shared rig, not venue cadence):

| State   | 1080p p50 / p95 |   4K p50 / p95 | ABBA p50 delta vs main, 1080p / 4K |
| ------- | --------------: | -------------: | ---------------------------------: |
| Bubble  |    2.5 / 2.6 ms |  8.9 / 10.1 ms |                     −20.0% / −3.3% |
| Cluster |    2.8 / 3.3 ms | 10.2 / 11.2 ms |                     −8.3% / −31.3% |
| Foam    |    5.4 / 5.8 ms | 17.9 / 18.8 ms |                     −4.2% / −12.6% |

The 4K absolute Foam run **exceeds the 16 ms target**, despite improved interleaved throughput. Its paired final was 16.7 ms vs main 19.1 ms. An earlier contended run measured 20.8 ms at 4K and up to 10.3 ms at 1080p; both runs are retained, not silently discarded. Removing bokeh calculations and skipping unaddressed shimmer waves recovered the initial pair regression. Use supported `--families soap` on the profiler (it has no singular `--family` option).

### Current verification / evidence

- `npm test`: 985 passed, 21 optional browser cases skipped, zero failures (1006 total). Final targeted family/world-rhythm/flash suite: 49 passed.
- Typecheck, build and native DE/EN i18n passed; touched formatted code passes Prettier. Shared i18n formatting is preserved to avoid unrelated reformatting.
- `scripts/verify-soap.mjs --rig --port 48861`: 24 all-look energy-ladder stills (0.1/0.5/0.9), Ember/Glacier state stills, portrait peak, 243 forward/reverse frames, 3600/4096/43200-second native health checks, and 120 native RAF frames with the unmodified live limiter enabled. Zero GL/GPU/non-finite errors; no empty low-energy look. This is a bounded smoke test, not a photosensitivity certification or long-show temporal seam measurement.
- Canonical reviewer evidence: `artifacts/look-review/soap-cathedral-r3/soap-cathedral-{sheet,rhythm}.png`, film and `grids.md`. Baseline and rounds 1–3 are retained alongside. Additional evidence: `artifacts/soap-r3-checks/`, profiles in `artifacts/soap-r3-perf/`.

**Current look self-assessment: 7/10, not an independent pass.** The local pink capillary wave is plainly visible and materially appropriate; the scene still exposes repeated tetrahedral clusters, approximate additive transparency, very faint architecture at peak, and a restrained energy ladder. A genuinely spatial foam nave remains a better next step than claiming this is already an 8.
