# Fractal Flames (69) — `scene-flame.mjs`

The chaos game. 65,536 GPU particles each pick one of a few transforms at random every tick (weighted), apply it and land on the attractor of the iterated function system. Additive points over fading trails turn their visit density into the picture.

## Signature detail

- **Draves' flame algorithm:** after each affine map comes a non-linear variation (swirl, spherical, sinusoidal, julia, disc). Each point's colour is the running average of the colours of the transforms that made it, so the colours show which map built which part of the flame.
- **The linear classics are recognisable at a glance:** Barnsley's fern (four maps with probabilities 1/85/7/7 %, whose leaflet maps sway in the wind) and Heighway's dragon. With 4-fold symmetry, four dragons rotated about their end point **tile the plane**, each in its own colour. A 6-fold fern becomes a snowflake of fronds.
- Flames feed their n-fold symmetry back into the iteration, as Draves' symmetry transforms do. The linear classics are only copied when drawn, which keeps them crisp.

## Variants (`species`)

swirl · sinusoidal weave · spherical bloom · julia flame · Barnsley fern · Heighway dragon

## Looks

Swirl Flame, Sinusoid Weave, Spherical Bloom, Julia Flame, Kaleido Flame (5-fold), Julia Mandala (6-fold), Barnsley Fern, Fern Snowflake, Heighway Dragon, Dragon Rose (four dragons tiling).

## State, endless, cost

- One texel per particle, RGBA8: x and y with 12 bits each and the colour coordinate with 8 bits, inside a per-species box. The maps are contractive (the largest singular value is < 1, tested), so the quantisation is forgiven.
- Escaped particles, and 0.2 % per tick at random, respawn by copying another particle, which already lies on the attractor. The maps morph on closed loops (`mod(u_time, 3600)`), so it runs endlessly with constant density.
- Cost: one 256² simulation pass with a few dozen ALU ops per particle, 65,536 points, and one fetch per pixel for the trails. Well under 1 ms.

## Energy, beat, audio

Morph speed ×0.4 → ×2.2, spin ×0.5 → ×2, brightness +0.4. The shared punch/pulse is 0.9/1. Audio: morph ← low, brightness ← high.

## Tests (`tests/flame.test.mjs`)

Packing round-trip; the textbook fern and dragon maps; each species stays in its box across the morph loop and symmetry (linear classics never escape); the fern's height; contractivity of every generic map; presets validate.
