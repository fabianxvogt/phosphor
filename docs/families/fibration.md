# Linked Fibres (96) · world Hopf Bloom — `scene-fibration.mjs`

**INCREMENTAL / FORMAL + EMPIRICAL**, 2026-10-14. The Hopf fibration of S³ as real 3D geometry: every tube is one exact fibre, a great circle of S³ over one point of S², stereographically projected to a round circle in space. Rendered on the engine's mesh path with a depth buffer; no engine change.

## Algorithm

The fibre over the base point (θ, φ) is q(s) = (cos η·e^{i(s+φ)}, sin η·e^{is}), η = θ/2; the Hopf map (z1, z2) → (2·z1·z̄2, |z1|² − |z2|²) sends all of it to (sin θ cos φ, sin θ sin φ, cos θ). A 4D rotation in the (x1, y2) plane (the *tumble*) moves the projection pole off the south-pole fibre, so tori swing into Dupin cyclides while staying an exact (rotated) Hopf fibration. Stereographic projection p = (x1, y1, x2)/(1 − y2) and its exact first and second derivatives (q″ = −q) give each circle's Frenet frame in the vertex shader; tubes are built around it. Projected z is the world's vertical axis.

## Signature detail

- **Linked circles.** Any two fibres are linked once (Gauss linking integral, tested at all three states, with tumble, within and across tori and with the core).
- **Villarceau circles and nested tori.** The fibres over one latitude fill a torus, each winding once around both ways. Later layers bloom out of their parent latitude, so the audience sees one torus become nested shells.
- **The core circle.** The unit circle (all fibres over the north pole) appears last, in accent, at the centre of every torus.
- **The circle action.** Light beads flow along all fibres at once (q → e^{iα}q moves every point along its own fibre); on the large outer circles they visibly accelerate on the far side, showing the conformal scale of the projection.
- **Colour is the map.** Latitude sets each shell's tone (inner shells warmer); longitude shades around each torus.

## States (world Hopf Bloom, seed 9601)

| development | state  | content |
| ----------- | ------ | ------- |
| 0           | Torus  | One Clifford torus (θ = π/2) of 20 linked Villarceau circles, far camera, telephoto. |
| 1           | Nest   | Five nested tori (θ = 0.90…2.00); inner shells warm and solid, outer shells glassier. |
| 2           | Bundle | Eight tori plus the core circle (135 fibres); closer camera, wider lens, parallax through the shells. |

Between states, each new torus emerges at its parent's latitude and moves out to its own, while its fibres grow as tapered arcs that close into rings in a seeded sweep. All values in [0, 2] are real geometry; reversal is the same function run backwards. Identity (φ, layer, growth order, arc start) is fixed per seed in the mesh.

## Looks

Linked Torus, Nested Shells, Full Bundle (the world states) · Cyclide Swing (side view, full tumble) · Glass Nest (looking down the axis: the "eye") · Bundle Weather (fast flow, many beads) · Half Bloom (development 1.5, low view) · Slow Core (close, from above, thick tubes).

## Energy, beat, camera

- Energy (orthogonal to development): fibre flow ×0.5→×1.6, tumble ×0.7→×1.35, camera orbit ×0.6→×1.6, bead count +0.5 (the next bead fades in). No brightness term.
- Speeds are **integrated** in a 4×1 RGBA8 simulation (24-bit phases: yaw, flow, tumble, drift), so energy or fader changes alter speed, never position; phases wrap, so late `u_time` cannot lose precision.
- Camera: slow orbit around the axis, gentle pitch/distance drift, elevation per look; kick punches focal length ≤ 2.2%. The tumble is bounded by a pole margin (see Tests), so geometry stays within |p| ≤ cot(0.21) ≈ 4.70 while the camera stays ≥ 5.88 away: it never enters geometry.
- Rhythm: **Fibre chase** (4 beats, every third fibre of every torus plus a comet), **Torus shell** (8 beats, one latitude torus rim-lit), **Meridian link** (16 beats, fibres over one meridian glow through all tori).
- Audio: tumble ← low (0.05), beads ← onset (0.08). Shared punch/pulse 0.1/0.15.

## Depth and style

Perspective with orbit parallax; distance fog to the palette ground; key light + wrap + specular; fresnel rim (secondary/white, a little accent); nested occlusion (faces towards the core circle darken with the number of shells already around it) plus true depth-buffer occlusion; scale cues (outer shells few, large and glassy, inner shells many, small and bright). Tubes keep at least ~1.3 px width (thinner ones dim instead) and silhouettes soften into the ground over a pixel to avoid shimmer.

## Cost

135 fibres × 144 segments × 8 sides = 933 120 vertices (2 floats each, 7.5 MB), built once per seed; no textures beyond a 4×1 phase state. Indicative M3 Pro whole-frame p50 (shared GPU): 1080p 2.7–3.5 ms, 4K see the report in `artifacts/performance/`.

## Endless

The fibration is static mathematics; motion comes from wrapped phases (orbit, flow, tumble, drift) that never stop and never accumulate float error. Nothing can die out.

## Tests (`tests/fibration.test.mjs`)

Hopf map of every visible fibre point equals its base point (also under the tumble); projected fibres are round planar circles; Gauss linking |L| = 1 for sampled pairs at all states; bounded projection over a development × tumble grid and camera clearance; integer states complete (0: torus only; 1: five tori; 2: all), Lipschitz-continuous development, new tori start at the parent latitude; deterministic per-seed identity and exact attribute packing; presets validate and the world is detected as a continuous development.

## Limits

The tumble's camera target follows the core circle analytically (x = tan a), not the full cyclide's bounds. Nested-occlusion darkening is an approximation (the untumbled core direction), not computed ambient occlusion. Bead length varies with the projection's speed by design. No MSAA: edge softening is shading-based.
