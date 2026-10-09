# Phyllotaxis (79) — `scene-phyllotaxis.mjs`

Vogel's model of a sunflower head (1979): seed n sits at radius c·√n and angle n·α. With α the golden angle, 360°·(2 − φ) ≈ 137.508°, the most irrational turn there is, the seeds pack evenly and never line up. Up to 32 000 seeds are drawn as stateless particles; the visual pass keeps a short trail.

## Signature detail

- **Fibonacci spirals.** The eye sees spiral arms (parastichies) in consecutive Fibonacci numbers, because each seed's nearest neighbours sit a Fibonacci number of seeds away (tested: for seeds 900–1100 of 1500, every nearest neighbour is 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, … apart). Colouring seed n by n mod F (alternate arms bright and dim) lights exactly F arms. F climbs 8 → 13 → 21 → 34 → 55 → 89 every 8 beats.
- **Rational angles make spokes.** The sweep variant swings α through the golden angle. Whenever α = 2π·p/q, the seeds collapse onto q straight spokes (tested exactly for 2/7). The golden angle is where every spoke pattern dissolves.
- **The Fibonacci sphere.** The same rule on a sphere (z = 1 − (2i + 1)/N) spreads points almost perfectly evenly (tested: the smallest neighbour distance stays above 0.6 × the mean). It turns in 3D.
- **Growth.** Every seed slides outward along the spiral while new seeds are born at the centre, like a living meristem. Each seed keeps its identity and colour.
- A ring of light runs out from the centre on every beat.

## Variants (`variant`)

| variant | Variant                                                 |
| ------- | ------------------------------------------------------- |
| 0       | Sunflower, golden angle (plus an optional fixed offset) |
| 1       | Angle sweep through the golden angle: spokes ↔ spirals  |
| 2       | Fibonacci sphere in 3D                                  |
| 3       | Growth from the centre                                  |

## Looks

Sunflower, Fibonacci Arms, Dense Head, Golden Sweep, Spokes and Spirals, Fibonacci Sphere, Golden Globe, Growing Head, Seed Fountain.

## Energy, beat, endless

- Energy: speed ×0.5 → ×2, light −0.1 → +0.2, trails +0.05 → −0.1.
- Audio: speed ← low (0.06), light ← onset (0.12), seed size ← high (0.06). The shared punch/pulse is 0.6/1.
- Endless: the F cycle, the sweep, the sphere's turn and the growth all loop seamlessly (the growth relabels seeds without a jump).

## Cost

Up to 32 000 points (a few multiply-adds each) plus one fade pass. Well under 1 ms on the reference GPU.

## Tests (`tests/phyllotaxis.test.mjs`)

The golden angle. Nearest neighbours at Fibonacci distances. Exact spokes for a rational turn. Even spread on the Fibonacci sphere. Presets validate and cover all four models.
