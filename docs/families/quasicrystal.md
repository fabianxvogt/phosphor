# Aperiodic Tilings (70) — `scene-quasicrystal.mjs`

De Bruijn's multigrid method. D families of parallel lines (directions e_j, offsets γ_j) cut the plane. Every crossing of a line of family r with a line of family s becomes a rhombus with edges e_r and e_s, placed at the vertex Σ K_j e_j, where K_j counts the lines of family j on the near side. The result covers the plane without gaps or overlaps and never repeats. Per pixel the shader runs the duality backwards: tiling point x sits near grid point 2x/D, so it tries the nearby crossings of every pair of families and keeps the one rhombus that contains x.

## Signature detail

- **Thick and thin rhombi in their own colours.** In the Penrose tiling (D = 5) they appear in the golden ratio. The test samples 20 000 points and finds the thick rhombi's area share at φ·sin 72° / (φ·sin 72° + sin 36°) ≈ 0.724.
- **Ribbons (Conway worms) light up on the beat.** The rhombi dual to one grid line form a wavy chain whose tiles all share edges parallel to e_j. Each beat lights every third ribbon of the next family, and a pulse runs along it. The ribbons are the hidden grid made visible.
- **Phason flips.** The offsets γ_j drift. Tiles flip in place (three rhombi around a hexagon swap) while the tiling stays perfectly aperiodic. For D = 5, Σγ = 0 keeps it a true Penrose tiling.
- **Vertex stars.** Every vertex is a lattice point Σ K_j e_j and glows softly. The five-fold stars and suns of Penrose and the eight-fold stars of Ammann–Beenker stand out.

## Variants (`tiling`)

| tiling | Variant                                                           |
| ------ | ----------------------------------------------------------------- |
| 0      | Penrose rhombs (D = 5, directions 2πj/5): 72° and 36° rhombi      |
| 1      | Ammann–Beenker (D = 4, directions πj/4): squares and 45° rhombi   |
| 2      | Heptagonal (D = 7): three rhombus shapes                          |
| 3      | Dodecagonal (D = 6, directions πj/6): squares, 60° and 30° rhombi |

## Looks

Penrose Rhombs, Phason Storm, Penrose Ribbons, Ammann–Beenker, Octagonal Glass, Heptagonal Lace, Dodecagonal Star, Close Rhombs.

## Energy, beat, endless

- Energy: phason speed ×0.4 → ×2.2, drift ×0.5 → ×2, ribbon light +0.4, edge width −0.1 → +0.2.
- Audio: phason ← low (0.08), ribbons ← onset (0.15), edges ← high (0.08). The shared punch/pulse is 0.8/1.
- Endless: the camera pans and turns through an infinite, non-repeating plane; the offsets drift on bounded sines; time is wrapped with `mod(u_time, 3600)`.

## Cost

One analytic pass, `maxRenderWidth` 1280. Per pixel, at most D(D−1)/2 pairs × 9 crossings × D dot products (Penrose ≤ 450 multiply-adds; most pixels stop much earlier). Estimated 1–3 ms on the reference GPU; the heptagonal tiling is the dearest.

## Tests (`tests/quasicrystal.test.mjs`)

Penrose directions are the fifth roots of unity and Σγ = 0. For all four tilings and two phason phases, 1500 random points each lie in exactly one rhombus (no gaps, no overlaps). Neighbours across each edge exist. Penrose thick/thin area share matches the golden ratio. Presets validate and cover all four tilings.
