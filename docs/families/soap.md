# Soap Cathedral · Seifenkathedrale (#113)

One continuous world, `soap`, with development `0 → 2`: **Bubble → Cluster → Foam** (DE **Blase → Verbund → Schaum**). Eight looks; one seed and identical non-development parameters across the three world states. No engine changes.

## Algorithm and signature mathematics

Every film is an analytical intersection, not a raymarch. Four persistent sites form a regular unit-edge tetrahedron. A cell is a spherical envelope clipped to its power region; each shared power-bisector face is drawn once (`j < k`) and clipped against the remaining sites. New cells grow from zero radius; their centres move continuously out of the original bubble. The same object remains the central rose-window cluster at the peak. Six independently oriented tetrahedral groups grow from it into buttresses and a high vault; nine smaller seeded cells provide scale.

**Thin-film interference:** air / soap / air, refractive index `n = 1.333`. Snell's law gives `cos θt = sqrt(1 − (1 − cos² θ)/n²)`. The round-trip optical phase is `δ = 4π n d cos θt / λ`. For each s/p interface reflectance R, the symmetric-film Airy reflectance is

`2 R (1 − cos δ) / (1 + R² − 2 R cos δ)`.

The phase reversal at the first interface makes integer orders `2 n d cos θt = m λ` destructive; half orders are constructive. The shader evaluates 460/550/650 nm together. Optical order indexes **`palette(t)`**, never a hard-coded spectral RGB rainbow. A fourth-power palette coordinate reserves the accent end for narrow fringes. Softbox/window reflections, grazing reflection and hot liquid borders feed the float bloom path.

**Plateau's laws:** every equilateral site triple has three equal-tension films meeting at 120°. The four border directions at a regular tetrahedral vertex have pairwise dot product `−1/3`, hence **109.4712206°**. With equal bubble radius and centre distance, the two exterior spherical caps and the shared flat film also have three 120° outward tangents at their wet seam. Rotations and uniform scale preserve these angles.

**Model limits:** these are ideal tetrahedral foam junctions, not a general surface-tension solver. Intermediate unequal-radius power cells are a continuous artistic growth path, not exact Young–Laplace equilibria. Cathedral groups are arranged as architectural clusters; their overlaps are optically layered, not globally relaxed into one space-filling foam. Back films are attenuated and layers use bounded order-independent optical-depth accumulation, rather than recursive refraction or full multiple scattering. The local Plateau geometry and Airy calculation are exact within those declared limits.

## States and looks

| Look | Development | Character |
| --- | --- | --- |
| Bubble / Blase | 0 | One drifting, iridescent film, immediately composed at low energy |
| Cluster / Verbund | 1 | Four joined cells, shared membranes and readable Y-shaped liquid borders |
| Foam / Schaum | 2 | Giant rose-window cluster; near buttresses, distant vault and small floating cells |
| Pearl Vessel / Perlengefäß | 0.2 | Thinner, restrained film and raised viewpoint |
| Tidal Glass / Gezeitenglas | 0.9 | High optical orders, stronger drainage and slower drift |
| Quiet Junction / Stiller Knoten | 1.2 | Broad liquid borders, low viewpoint and unhurried flow |
| Opal Nave / Opalschiff | 2 | Wider cathedral, raised viewpoint and fine optical orders |
| Black Pearl / Schwarze Perle | 1.8 | Close, compact nave with broad low-order interference fields |

## Motion, energy and rhythm

A smooth world-space thickness field couples two nested vortices to vertical drainage. Minimum thickness is 20 nm; continuous slow replenishment makes draining endless rather than drying out. Film thickness and every cell identity are deterministic functions of seed, development and three integrated phases. Development does not reset any phase or seed.

Energy changes Marangoni-flow speed, camera-drift speed and the physical growth of peripheral cells (80–100% of their authored size), never a brightness multiplier. The main subject remains composed even at energy 0.1.

Three bounded `familyEffect` tracks act directly on the signature:

- **Fringe order**, 4 beats: local thickness excursion of at most 7.5%, moving interference fringes.
- **Border breath**, 8 beats: a regional grazing-light breath along existing Plateau borders; bounded kick contribution.
- **Opal window**, 16 beats: a rare directional highlight on a narrow upper interference order.

The camera is a closed, slow lateral float with a small vertical component. Growth carries it into the nave without a cut. Main-subject height is about 60% of the short side for Bubble and about 80% for Foam; near peripheral cells can leave the edge as spatial framing. Portrait uses the same short-side composition. Kick focal motion is bounded to 1.8%.

## Resolution, cost and endlessness

Sphere silhouettes use analytical impact-distance coverage. Shared faces and cap clipping retain a resolution-scaled AA margin. A conservative face-disc rejection includes that margin; it only removes impossible candidates. The unit-edge tetrahedron supplies an exact reused plane-normal length, avoiding repeated square roots. A dynamic six-plane array cache was measured slower and discarded.

Native headless Chrome / ANGLE Metal / Apple M3 Pro, synchronous full-frame throughput **including post**, 24 measured frames per state, energy 0.95; not venue cadence:

| State | 1920×1080 p50 | 3840×2160 p50 |
| --- | ---: | ---: |
| Bubble | 2.0 ms | 5.9 ms |
| Cluster | 1.9 ms | 6.6 ms |
| Foam | 3.9 ms | 13.8 ms |

All states satisfy the new-world 8/16 ms budgets. Zero GL errors, GPU errors or non-finite uploads. Seven group bounds cap the work; there is no simulation, unbounded loop or per-frame CPU geometry rebuild.

The flow, camera and drainage phases use three `clocks`, each exactly `2π`-periodic. The authored first-hour arithmetic has a matching `PHOSPHOR_LATE` clock variant. Rate changes integrate rather than multiplying an elapsed time; reversal is a pure geometry evaluation. GPU seam checks pass at 3600, 4096 and 43200 seconds, including energy/fader rate changes at two hours.

## Verification and visual review

- `tests/soap.test.mjs`: destructive/constructive fringe orders across wavelengths and angles; physical bounds and grazing response; every tetrahedral triple's 120° force balance; all six 109.47° border pairs; shared-power-plane symmetry and exact normal lengths; continuous 401-step development and reversal; persistent identities; camera clearance; bounded gestures; clocks; all eight preset ranges; appended continuous-world registration.
- `node --test tests/soap.test.mjs tests/time.test.mjs`.
- `npm run typecheck`, `npm run build`, `npm run test:i18n -- --port 48508 --native-gpu`.
- Five visual improvement rounds after the baseline: clearer swirling orders/light cards; a readable central nave and reduced crowding; silhouette AA/back-film attenuation/scale cues; varied tetrahedral orientation and precious full-palette fringes; stronger reflected light and small-cell scale. Final exact rejection optimization was re-filmed.
- Reviewed all eight looks at energy 0.1/0.5/0.9; full 30-second forward arc in Phosphor and Ember palettes; a 30-second fixed Opal Nave film in Glacier, 540×960 portrait. Inspected full-resolution 4K Bubble/Foam stills and a 1:1 detail crop; zero GPU errors and non-finite uploads. Baseline and final films/strips, ladder, timings and long-show JSON are retained with the lane report.

Final artistic assessment: **9/10** for the complete arc. The remaining limitation is deliberately idealised, repeated tetrahedral foam rather than an organically relaxed many-cell simulation; the film optics, junctions, scale change and dark negative space are the principal subject, not opaque cathedral architecture.
