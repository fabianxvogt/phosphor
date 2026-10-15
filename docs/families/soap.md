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

Energy changes Marangoni-flow speed, camera-drift speed and the physical growth of peripheral cells (80–100% of their authored size), never a brightness multiplier. The main subject remains composed even at energy 0.1.

Three bounded `familyEffect` tracks act directly on the signature:

- **Fringe order**, 4 beats: local thickness excursion of at most 7.5%, moving interference fringes.
- **Border breath**, 8 beats: a regional grazing-light breath along existing Plateau borders; bounded kick contribution.
- **Opal window**, 16 beats: a rare directional highlight on a narrow upper interference order.

The camera is a closed, slow lateral float with a small vertical component and increased lateral travel between the near buttresses at the peak. Growth carries it into the nave without a cut. Bubble's unpunched projected diameter is 69.7% of the short side (previously 59.5%); Foam retains a clear central rose window with near peripheral cells leaving the sides as spatial framing. Portrait uses the same short-side composition. Kick focal motion is bounded to 1.8%.

Distance fog separates the near buttresses, central cluster and rear vault. An analytical focus approximation widens silhouette/clip coverage and border footprints away from the target distance, and attenuates interference contrast. It is not stochastic depth of field or an extra blur pass. Background practicals have world-space positions, visible bokeh and camera parallax. Their reflected studio-light counterpart is a bounded environment approximation, not recursive ray tracing. Rear films fade out toward Foam to avoid muddy optical layering; zero-weight rear intersections are rejected before power-plane clipping.

## Resolution, cost and endlessness

Sphere silhouettes use analytical impact-distance coverage. Shared faces and cap clipping retain a resolution-scaled AA margin. A conservative face-disc rejection includes that margin; it only removes impossible candidates. The unit-edge tetrahedron supplies an exact reused plane-normal length, avoiding repeated square roots. A dynamic six-plane array cache was measured slower and discarded.

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

**Recalibrated artistic assessment: 8.5/10**, up from the independently assessed 7/10 baseline. The prior 9/10 self-rating was too generous. The enlarged Bubble, reflected room, flowing full-palette orders, crisp borders and focus separation are substantially improved. Against Liquid Chrome, the repeated tetrahedral arrangement and approximated transparency/focus still look more idealised; this does not claim the reference's 9/10 material realism.
