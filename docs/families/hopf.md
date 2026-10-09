# Hopf Fibration (80) — `scene-hopf.mjs`

The 3-sphere S³ ⊂ C² is a bundle of great circles, one over every point of the 2-sphere. The Hopf map (z1, z2) → (2·z1·z̄2, |z1|² − |z2|²) sends each circle to one point. Stereographic projection from S³ into space turns every great circle into a round circle (one through the pole into a straight line). 65 536 particles draw 256 fibres of 256 points each; the visual pass keeps trails.

## Signature detail

- **Every pair of circles is linked exactly once.** Tested with the Gauss linking integral on two projected fibres: |L| = 1.
- **Villarceau circles.** The fibres over one circle of latitude fill a torus, each one a tilted circle winding once around both ways. Nested latitudes give nested tori.
- **Colour is the map.** Each fibre takes the colour of its base point on S² (hue by longitude, light by latitude), so the picture shows the Hopf map as well as the bundle. Tested: every point of a fibre maps to its base point, and projected fibres are planar round circles.
- **Through infinity.** A slow rotation of S³ in four dimensions carries circles through the projection pole: they grow, straighten into a line and come back from the other side.

## Variants (`variant`)

| variant | Fibres over …                                                        |
| ------- | -------------------------------------------------------------------- |
| 0       | one circle of latitude: a torus of Villarceau circles                |
| 1       | five latitudes: nested tori                                          |
| 2       | a loxodrome from pole to pole: fibres sweep from the axis to a ring  |
| 3       | scattered, drifting points (Fibonacci sphere): separate linked rings |

## Looks

Clifford Torus, Thin Torus, Nested Tori, Loxodrome Fibres, Linked Rings, Ring Storm, Through Infinity, Fibre Bloom.

## Energy, beat, endless

- Energy: 4D tumble ×0.6 → ×1.6, light −0.1 → +0.2, camera turn ×0.6 → ×1.8.
- Audio: tumble ← low (0.05), light ← onset (0.12), latitude ← high (0.04). The beat makes the latitudes breathe. The shared punch/pulse is 0.6/1.
- Endless: the 4D tumble, the camera and the drifting base points never repeat exactly.

## Cost

65 536 points, each a handful of trig functions, plus one fade pass. Under 1 ms on the reference GPU.

## Tests (`tests/hopf.test.mjs`)

Fibres map to their base points; projected fibres are round circles; the Gauss linking number of two fibres is ±1; presets validate and cover all four configurations.
