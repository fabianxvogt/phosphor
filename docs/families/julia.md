# Julia Observatory

**INCREMENTAL / EMPIRICAL**, rework 2026-10-14 (wave 2, lane L5; [look audit](../research/look-audit-2026-10-14.md) proposal #1, not vetoed by the owner). The family is not GATED. All six look ids, the schema, the presets, the variants and the rhythm effects are unchanged. **The picture changes intentionally**, and the catalog previews were rebaked.

## Algorithm and signature detail

Escape-time Julia sets for four maps (quadratic z² + c, cubic z³ + c, burning-ship fold |Re z| + i|Im z| before squaring, and a four-fold mirror fold), with c travelling along an authored path near the Mandelbrot boundary. The boundary of the set is the signature.

## What changed

| Before                                                        | After                                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Flat maroon interior on a lavender ground, palette by escape count | Interior near black, with a faint orbit-trap filigree and rare accent glints                     |
| Filament brightness from the escape count                     | Boundary drawn from the Hubbard–Douady distance estimate as a constant-width glowing line (≥ 1.2 px, scales with resolution) with a halo |
| No depth                                                      | Normal-mapped relief from z/dz, lit by a key light and a rim, fading to black with distance from the set; terraces from the smooth potential |
| No exterior structure                                         | Equipotential contour lines (palette) that fade with distance                                   |
| Energy scaled brightness by up to 1.25×; mean luminance 0.09 → 0.21 from energy 0.1 to 0.9 | No brightness term. Energy drives iteration depth (×0.6–1.15), the edge parameter (closer to the boundary), drift and spin. Mean luminance is 0.03–0.05 at every energy |
| Burning path at c ≈ (−0.55, −0.6) → (−0.80, −0.74), where a CPU sweep found 48% speckled pixels | Burning path at c ≈ (−1.1, −0.1) ± (0.12, 0.06): a connected set with ≤ 2% speckle |

Where the boundary is finer than a pixel (dust), escape counts alias. The filament and relief are replaced by a dim haze there (`fwidth(n)`), and orbit-trap glints are suppressed where the trap aliases.

The derivative follows each map: 2z·dz, 3z²·dz, and a per-component sign reflection for the burning fold. The mirror's pre-fold is an isometry, so the distance estimate keeps its scale.

## Cost and limits

Native M3 Pro probe on a GPU shared with other lanes (indicative only): p50 5.2–8.6 ms at 1080p across the four maps; Burning is the most expensive because of its deep iteration. At 4K it measured 21–74 ms under heavy contention; a quiet-machine 4K measurement is still owed.

- The burning fold's exterior relief shows a blocky checker pattern from the per-quadrant sign flips. It is honest to the map, but it reads as busy.
- Distance estimates are approximate near critical points.
- `u_time` still feeds c unwrapped, as before.
- There is no world film, because `world-film.mjs` needs a development key. The rework was iterated with five native-GPU ladder sheets (all six looks, energy 0.1/0.5/0.9).
