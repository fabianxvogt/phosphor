# Indra's Pearls (74) — `scene-kleinian.mjs`

Limit sets of groups of Möbius maps, in the spirit of Mumford, Series and Wright's _Indra's Pearls_. Each pixel walks back into a fundamental domain: every step applies one generator (a circle inversion composed with a reflection, so an orientation-preserving Möbius map). The number of steps is the word length, which colours the nested pearls. The derivative of every map is carried along, so rims are drawn a constant number of pixels wide at any depth. The walk stops when a pearl shrinks below a pixel; those points are the limit set and glow.

## Signature detail

- **Apollonian gasket, flowing into itself.** The walk runs in the strip model (unit-diameter circles between y = 0 and y = 1: fold by translation, reflect, invert in the unit circle). The Cayley map w = i(1 + z)/(1 − z) sends it into the disc, where it becomes the integer gasket with curvatures (−1, 2, 2, 3) (tested, with Descartes' theorem and integer curvatures along the chain). Translating the strip is a symmetry, so the whole gasket flows endlessly into a tangency point.
- **Schottky pearls.** Two generators pair four circles. While the circles are apart, the limit set is Cantor dust. As they kiss (the beat pushes them closer), the pearls close into a necklace.
- **Loxodromic tunnel.** a(z) = k·z with complex k, plus one more circle pairing. Zooming by k² is a symmetry, so the spiral dive loops seamlessly.
- **Steiner's porism.** A ring of n circles between two non-concentric circles turns and always closes, because a Möbius map sends it to a concentric ring that simply rotates (tested: neighbours stay tangent at every turn). Every circle holds the whole configuration again, turning the other way.

## Variants (`variant`)

| variant | Variant                                                                    |
| ------- | -------------------------------------------------------------------------- |
| 0       | Apollonian gasket, parabolic flow; `shape` moves it by a disc automorphism |
| 1       | Schottky group of four circles; `shape` is how close they kiss             |
| 2       | Loxodromic tunnel; `shape` is the twist of k                               |
| 3       | Steiner chain of 3 + `count` circles, nested; `shape` is the offset        |

## Looks

Apollonian Flow, Integer Gasket, Gasket Lens, Indra's Pearls, Cantor Dust, Kissing Necklace, Loxodromic Dive, Hyperbolic Dive, Steiner Porism, Steiner Triplets, Nine-ring Chain.

## Energy, beat, endless

- Energy: flow ×0.5 → ×2, rim glow −0.1 → +0.25, fill +0.1 → −0.1.
- Audio: flow ← low (0.06), rim ← high (0.1), shape ← onset (0.04). The beat flashes the rims and pushes Schottky circles toward kissing. The shared punch/pulse is 0.7/1.
- Endless: every motion is a symmetry of the picture (strip translation, rotation, zoom by k², the porism turn), so it loops without a seam.

## Cost

One analytic pass, `maxRenderWidth` 1600. At most 48 cheap steps per pixel (a few multiply-adds and one division each); most pixels stop within a few steps because of the sub-pixel cut-off. Estimated under 1 ms on the reference GPU.

## Tests (`tests/kleinian.test.mjs`)

Integer gasket via Cayley plus Descartes. The strip walk (stops in circles, goes deeper in gaps, invariant under translation). The Schottky generator maps its circle pair onto each other and the outside inward. The Steiner chain stays tangent under the Möbius shift at several turns. Presets validate and cover all four groups.
