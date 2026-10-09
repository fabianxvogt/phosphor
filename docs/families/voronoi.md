# Voronoi Cells (71) — `scene-voronoi.mjs`

Every pixel belongs to its nearest site. Up to 96 sites live in a 96×2 simulation texture (16-bit positions on a 16:9 torus, plus a heat byte per site) and run **Lloyd's algorithm**: each step a site moves toward the centroid of its own cell. The shader estimates the centroid from 40 samples on a Vogel spiral around the site. Random cells relax into a centroidal Voronoi tessellation, which in the Euclidean metric is a near-perfect honeycomb.

## Signature detail

- **Lloyd relaxation, visible.** A fresh look starts from random sites and settles into hexagons within seconds. Beats jolt single sites (their cells flash). Every 16 beats a shockwave pushes a region outward, its ring runs across the screen, and the cells heal back into the honeycomb. Tested on the CPU with the same sampling: after 60 steps the quantisation energy drops by more than 15 %, at least 70 % of the cells are hexagons, and the spread of the neighbour distances falls by more than half.
- **The metric shapes the cells.** Minkowski p = 1 gives taxicab cells with 45° borders, 2 Euclidean polygons, 16 nearly Chebyshev squares, and p < 1 (no longer a metric) concave cells around astroid stars. In the morph variant, p glides 0.7 → 16 → 0.7 and the relaxed lattice itself changes shape: diamonds, hexagons, squares.
- **Power diagram.** Every site carries a breathing circle (weight w = r²) and a point belongs to the site with the smallest |x − s|² − w. The borders stay straight: they are the radical axes, and they pass through the intersections of neighbouring circles.
- **Delaunay dual.** Edges between sites whose diametral circle is empty (the Gabriel graph, a subgraph of the Delaunay triangulation) glow over dim cells. Each edge crosses the border it is dual to.

## Variants (`variant`)

| variant | Variant                                                         |
| ------- | --------------------------------------------------------------- |
| 0       | Relax: fixed metric p from the `metric` parameter               |
| 1       | Metric morph: p glides between 0.7 and `metric` (period ≈ 57 s) |
| 2       | Power (Laguerre) diagram with breathing weight circles          |
| 3       | Delaunay dual: Gabriel edges over the Euclidean cells           |

## Looks

Honeycomb Relax, Lloyd Storm, Big Cells, Taxicab Diamonds, Chebyshev Blocks, Concave Stars, Metric Morph, Power Bubbles, Laguerre Froth, Delaunay Net, Gabriel Lace.

## Energy, beat, endless

- Energy: jolts ×0.4 → ×2, relaxation ×0.7 → ×1.4, glow −0.1 → +0.25, shockwave −0.2 → +0.3.
- Audio: jolts ← onset (0.15), glow ← high (0.08), relaxation ← low (0.06). The shared punch/pulse is 0.7/1.
- Endless: relaxation pulls toward order, beats and shockwaves push back out, so it never freezes. The view pans slowly across the seamless torus; time is wrapped with `mod(u_time, 3600)`.

## Cost

Simulation: one 96×2 pass per frame, 40 samples × N sites per site (≤ 370 k distance tests). Visual: one pass over N ≤ 96 sites per pixel, `maxRenderWidth` 1280. Minkowski p ≠ 2 costs two `pow` per site. The Gabriel test runs only for pixels within a few pixels of an edge. Estimated 1–3 ms on the reference GPU.

## Tests (`tests/voronoi.test.mjs`)

Minkowski lengths (taxicab, Euclid, near-Chebyshev, the concave p < 1 ball). Lloyd turns random cells into a honeycomb (energy, hexagon share, neighbour-distance spread); Euler on the torus keeps the mean neighbour count at six. Taxicab and Euclid give different partitions. Presets validate and cover all four variants.
