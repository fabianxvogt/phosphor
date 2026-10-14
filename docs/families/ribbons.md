# Attractor Ribbons (97) · world Attractor Ribbons — `scene-ribbons.mjs`

**INCREMENTAL / FORMAL + EMPIRICAL**, 2026-10-14 (wave 2). 192 lit ribbons, each the recent path of one exact trajectory. Every ribbon is integrated **at the same time in three flows** — Lorenz (σ 10, ρ 28, β 8/3), Aizawa (a 0.986, b 0.7, c 0.6, d 3.5, e 0.25, f 0.1) and Thomas (b = 0.09) — so development can carry the same ribbons from one attractor to the next. No engine change.

## Algorithm

A 224 × 1153 RGBA8 simulation holds, per ribbon and flow, a 224-sample history as 16-bit fractions of the flow's box (x, y in one texel; z and a respawn generation in the next). Each history sample is two fixed RK4 steps (h = 0.005 / 0.015 / 0.08). A 24-bit step accumulator turns flow speed into whole samples: when it passes 1, every column shifts back and the heads advance; the vertex pass draws the fraction in between, so speed changes never jump and the ribbon shape is the same at every speed. On a seed change every column is filled at once (96 spin-up steps onto the attractor, then the history), so ribbons are complete from the first frame. An escaped head respawns and bumps its generation, which the vertex pass uses to break the ribbon (never observed in tests; a safeguard).

Flows, steps, boxes, centres and view frames come from the tested Strange Attractors reference (`scene-attractor.mjs`). Thomas uses b = 0.09 instead of 0.1914: at 0.1914 it is a compact knot; 0.09 lies in the chaotic labyrinth regime (λ ≈ 0.09; nearby 0.105–0.17 are periodic), with its own box (±11) and scale (1/7).

## Signature detail

- **Wings (0):** the Lorenz butterfly from its broadest side (camera sways around yaw ≈ 0.7, never edge-on), 42 % of ribbons.
- **Vortex (1):** Aizawa's sphere of spiralling bands and its axial tube, 68 %.
- **Labyrinth (2):** Thomas's cyclically symmetric tangle with long excursions, all ribbons, a closer camera with a wider lens and stronger parallax.
- Between states every ribbon blends its own positions between two trajectories (smoothstep weight); the integration never depends on development, so the morph is continuous and reversible.
- Colour follows speed along the flow (fast = lighter) shifted by each ribbon's rank; light pulses run along every ribbon; heads carry a small accent spark; tails fade into the dark.

## Looks

Butterfly Wings, Aizawa Vortex, Thomas Labyrinth (world states, seed 9701) · Long Exposure (slow, long, thin, high) · Vortex from Below · Labyrinth Rush (fast flow, many pulses) · Unfolding Wings (development 0.3) · Slow Labyrinth (development 1.85, from above).

## Energy, rhythm, camera

- Energy: flow speed ×0.55→×1.5, ribbon length ±0.15, camera orbit ×0.6→×1.6, light pulses ±0.2. No brightness term.
- Camera: integrated sway phase (24-bit), drift phase; development moves it from 3.0 to ~2.05 units with focal 2.1 → 1.55, a ±16 % in-and-out weave and ≤ 5° roll at the peak; kick ≤ 2.2 % focal. Tested: the eye stays ≥ 1.4 from the centre (outside every flow's 95th-percentile radius ≈ 1.05); ribbons closer than 0.45 to the eye thin to nothing, so rare excursions never fill the lens.
- Rhythm: **Ribbon cohort** (4 beats, one in four ribbons lit along its whole trajectory), **Flow run** (8, light runs down every ribbon), **Head sparks** (16, all heads flare).
- Audio: flow ← low (0.04), pulses ← onset (0.08).

## Depth and style

Perspective with parallax; distance fog into the palette ground; ribbons are camera-facing bands shaded as tubes (key, wrap, specular, fresnel rim); depth-buffer occlusion with a per-ribbon depth order (no z-fighting on Aizawa's sphere); scale cues from many thin ribbons; min ~1.2 px width (thinner dims) and soft silhouettes.

## Cost (indicative, shared GPU)

Simulation: one 258 k-texel pass per tick (heads integrate, the rest shift). Mesh: 192 × 160 segments × 6 = 184 k vertices, 1 float each. Whole frame at 1080p measured under heavy GPU sharing ≈ 1.2–2× Living Forms in the same run (see report). A seed change fills the history once: load ≈ 95 ms vs ≈ 25–45 ms for Living Forms.

## Endless

Chaotic flows never settle; the history is a sliding window, phases wrap, positions are bounded by construction (16-bit box fractions) and escapes respawn.

## Tests (`tests/ribbons.test.mjs`)

Flow constants match the shader tables; quantized trajectories stay in their boxes with radius < 1.45 and per-sample steps < 0.2; every flow has a positive finite-time Lyapunov exponent at its setting; development weights and ribbon presence are continuous and complete at the peak; camera clearance over a development × phase × parameter grid; deterministic per-seed identity; presets validate and the world is continuous.

## Limits

The blend between attractors is a geometric interpolation between real trajectories, not a trajectory of any intermediate flow. GPU fp32 trajectories diverge from the CPU reference after a few Lyapunov times (only statistics are comparable, by design of chaos). Quantization adds ~1e-4 box-relative noise per sample.
