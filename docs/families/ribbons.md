# Attractor Ribbons (97) · world Attractor Ribbons — `scene-ribbons.mjs`

**INCREMENTAL / FORMAL + EMPIRICAL**, 2026-10-14 (wave 2). 192 lit ribbons, each the recent path of one exact trajectory. Every ribbon is integrated **at the same time in three flows** — Lorenz (σ 10, ρ 28, β 8/3), Aizawa (a 0.986, b 0.7, c 0.6, d 3.5, e 0.25, f 0.1) and Thomas (b = 0.09) — so development can carry the same ribbons from one attractor to the next. No engine change.

## Algorithm

A 224 × 1153 RGBA8 simulation holds, per ribbon and flow, a 224-sample history as 16-bit fractions of the flow's box (x, y in one texel; z and a respawn generation in the next). Each history sample is two fixed RK4 steps (h = 0.005 / 0.015 / 0.08). A 24-bit step accumulator turns flow speed into whole samples: when it passes 1, every column shifts back and the heads advance; the vertex pass draws the fraction in between, so speed changes never jump and the ribbon shape is the same at every speed. On a seed change every column is filled at once (96 spin-up steps onto the attractor, then the history), so ribbons are complete from the first frame. An escaped head respawns and bumps its generation, which the vertex pass uses to break the ribbon (never observed in tests; a safeguard).

Flows, steps, boxes, centres and view frames come from the tested Strange Attractors reference (`scene-attractor.mjs`). Thomas uses b = 0.09 instead of 0.1914: at 0.1914 it is a compact knot; 0.09 lies in the chaotic labyrinth regime (λ ≈ 0.09; nearby 0.105–0.17 are periodic), with its own box (±11) and scale (1/7).

## Signature detail

- **Wings (0):** the Lorenz butterfly from its broadest side (camera sways around yaw ≈ 0.7, never edge-on), 42 % of ribbons.
- **Vortex (1):** Aizawa's sphere of spiralling bands and its axial tube, 68 %.
- **Labyrinth (2):** Thomas's cyclically symmetric tangle with long excursions, about 90 % of the ribbons (slightly thicker), a camera at 2.45 units with a wider lens, stronger parallax and stronger depth fog, so the front layers read against the back.
- Between states every ribbon blends its own positions between two trajectories (smoothstep weight); the integration never depends on development, so the morph is continuous and reversible.
- Colour follows speed along the flow (fast = lighter) shifted by each ribbon's rank; light pulses run along every ribbon; heads carry a small accent spark; tails fade into the dark.

## Looks

Butterfly Wings, Aizawa Vortex, Thomas Labyrinth (world states, seed 9701) · Long Exposure (slow, long, thin, high) · Vortex from Below · Labyrinth Rush (fast flow, many pulses) · Unfolding Wings (development 0.3) · Slow Labyrinth (development 1.85, from above).

## Energy, rhythm, camera

- Energy: flow speed ×0.55→×1.5, ribbon length ±0.15, camera orbit ×0.6→×1.6, light pulses ±0.2. No brightness term.
- Camera: integrated sway phase (24-bit), drift phase; development moves it from 3.0 to ~2.45 units with focal 2.1 → 1.5, a ±10 % in-and-out weave and ≤ 5° roll at the peak; kick ≤ 2.2 % focal. Tested: the eye stays ≥ 1.4 from the centre (outside every flow's 95th-percentile radius ≈ 1.05); ribbons closer than 0.45 to the eye thin to nothing, so rare excursions never fill the lens.
- Rhythm: **Ribbon cohort** (4 beats, one in four ribbons lit along its whole trajectory), **Flow run** (8, light runs down every ribbon), **Head sparks** (16, all heads flare).
- Audio: flow ← low (0.04), pulses ← onset (0.08).

## Depth and style

Perspective with parallax; distance fog into the palette ground; ribbons are camera-facing bands shaded as tubes (key, wrap, specular, fresnel rim); depth-buffer occlusion with a per-ribbon depth order (no z-fighting on Aizawa's sphere); scale cues from many thin ribbons; min ~1.2 px width (thinner dims) and soft silhouettes.

## Cost (indicative, shared GPU)

Simulation: one 258 k-texel pass per tick (heads integrate, the rest shift). Mesh: 192 × 128 segments × 6 = 147 k vertices, 1 float each. Whole frame at 1080p measured under heavy GPU sharing ≈ 1.2–2× Living Forms in the same run (see report). A seed change fills the history once: load ≈ 95 ms vs ≈ 25–45 ms for Living Forms.

## Endless

Chaotic flows never settle; the history is a sliding window, phases wrap, positions are bounded by construction (16-bit box fractions) and escapes respawn.

## Tests (`tests/ribbons.test.mjs`)

Flow constants match the shader tables; quantized trajectories stay in their boxes with radius < 1.45 and per-sample steps < 0.2; every flow has a positive finite-time Lyapunov exponent at its setting; development weights and ribbon presence are continuous, and 80–95 % of the ribbons are present at the peak; camera clearance over a development × phase × parameter grid; deterministic per-seed identity; presets validate and the world is continuous.

## Labyrinth framing (polish 2026-10-15)

At the peak the camera stood at 2.05 units (±16 %) with focal 1.55: the visible half-height at the centre was 1.1–1.5 units while Thomas excursions reach about 1.5, so loops touched the bottom edge, and all 192 ribbons made the core a uniform tangle. Now: distance 2.45 (±10 %), focal 1.5 (visible half-height 1.47–1.8), 90 % of the ribbons (`shown(2)` 1.08 → 0.88), width factor at the peak 0.7 → 0.88 and depth fog ×1.6. Ladder (480×270): loops stay inside the frame with a margin at all three energies for Thomas Labyrinth, Labyrinth Rush and Slow Labyrinth; the form fills about 55–65 % of the short side. Mean 8-bit level drops 10.2 → 7.9 (smaller on screen, fewer ribbons). Throughput unchanged (1080p 1.6 ms, 4K 3.7 ms, control 1.5 / 3.4–3.8 ms).

## Wave 5 (2026-10-15): light as a solid trajectory

Three filmed rounds: (1) correct the tube impostor's double-signed normal (the left/right halves had the same normal), initially reduce rendered subdivisions; (2) rank-weighted widths put a few broad trajectories against fine tracers, narrow dark troughs and stronger pearl glints; (3) increase the Labyrinth lens 1.5 → 1.72 and centre its target. Final cost polish uses 128 rendered segments, retaining all 224 exact history samples; portrait focal is reduced 12% to contain the butterfly's broad wings. No preset, seed, flow constant, world definition or schema changed.

Initial single-run timings showed sub-millisecond shared-machine drift. A controlled interleaved comparison loads **both original scene and original geometry** from `deaaae1`, alternates baseline/final three times and takes the median of 36-frame p50s. 1080p states 0/1/2: **2.2/2.6/2.7 → 2.3/2.3/2.5 ms**; 4K: **5.9/6.2/5.9 → 5.8/5.7/5.8 ms**. Every state is within +5%; the largest is +4.55%. These are synchronous whole-frame probes, not venue cadence.

Evidence: fleet worker `rework-geometry/output/evidence/ribbons/` (baseline/final films, Long Exposure, all-look energy ladder, ember and glacier portrait; paired-cost.json). Tests add a cross-section-normal reference and guard the vertex reduction. Honest rating **8.5/10**: the wings and vortex are strong; the Thomas state remains a compact chaotic knot during some parts of its evolution rather than consistently a grand spatial labyrinth.

## Limits

The blend between attractors is a geometric interpolation between real trajectories, not a trajectory of any intermediate flow. GPU fp32 trajectories diverge from the CPU reference after a few Lyapunov times (only statistics are comparable, by design of chaos). Quantization adds ~1e-4 box-relative noise per sample.
