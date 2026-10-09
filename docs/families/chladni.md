# Chladni Figures (81) — `scene-chladni.mjs`

A vibrating plate throws sand off its moving parts. Grains come to rest only where the plate stands still, so 65 536 grains (a 256×256 simulation texture of 16-bit positions, two steps per frame) draw the nodal lines of the current mode. Every 8–64 beats the plate jumps to a new mode (crossfaded over 1.5 beats), and the sand visibly migrates into the next figure, the moment Chladni showed his audiences in 1787.

## Signature detail

- **Sand on the nodes, by physics, not by drawing.** Each grain hops randomly with a step proportional to the local amplitude |u| and descends slightly on u². Its stationary density grows like 1/u², so it piles up on the nodal lines. Tested on the CPU with the shader's update: after 600 steps the share of grains near a node rises from ~1/8 to more than half.
- **Square plates** use the classic cos-combination modes cos(nπx)·cos(mπy) ± cos(mπx)·cos(nπy) (twelve (n, m, ±) pairs). The antisymmetric ones have a nodal diagonal (tested).
- **Circular plates** use Bessel modes J_n(j_{n,s}·r)·cos(nθ): rings and diameters. The diameters turn slowly, because these modes are degenerate. J_n is computed in the shader by quadrature of Bessel's integral (tested to vanish at the tabulated zeros).
- **Faraday hexagons:** three standing waves at 60°.
- Grains at rest shine; flying grains are dim. The plate shimmers faintly where it moves.

## Variants (`variant`)

| variant | Variant                                                                  |
| ------- | ------------------------------------------------------------------------ |
| 0       | Square plate, a new mode every `hold` beats                              |
| 1       | Mode morph: modes glide into each other all the time; sand never settles |
| 2       | Circular plate, Bessel modes                                             |
| 3       | Faraday hexagons                                                         |

## Looks

Chladni Plate, Fast Modes, Fine Sand, Mode Morph, Drumhead, Bessel Rings, Faraday Hexagons, Honeycomb Sand.

## Energy, beat, endless

- Energy: vibration ×0.6 → ×1.6, sand light −0.1 → +0.2, shimmer −0.1 → +0.25.
- Audio: vibration ← low (0.08), shimmer ← onset (0.15), light ← high (0.06). The shared punch/pulse is 0.6/1.
- Endless: the mode sequence is seeded and never stops changing.

## Cost

Simulation: 65 536 grains × 2 steps × 3 field evaluations (two modes each; Bessel modes 24 cosines). Particles: one field evaluation per grain. Visual: one field evaluation per pixel, `maxRenderWidth` 1280. About 1–2 ms on the reference GPU for the circular plate, less for the others.

## Tests (`tests/chladni.test.mjs`)

Bessel quadrature zeros, the nodal diagonal of antisymmetric modes, sand gathering on the nodes with the shader's update rule, and presets validating and covering all four plates.
