# Look audit 2026-10-14

**EMPIRICAL**, lane L5, wave 1. Every catalog family graded against [STYLE.md](../worlds/STYLE.md) and [AUTHORING.md](../families/AUTHORING.md): signature readability, depth, light, dark ground and contrast, energy response, line weight, palette use and flat clip-art risk.

**Evidence.** Native-GPU energy ladder for all 334 looks at 0.1/0.5/0.9, 320×180, 120 frames: `PHOSPHOR_HEADLESS_RIG=1 node scripts/contact.mjs --dist . --sheet ladder --rig --port 48380 --width 320 --height 180` → `artifacts/contact/ladder/` (index.html, metrics.json; ignored by Git). Per-family sheets (rows = looks, columns = energy) were tiled into `artifacts/audit-sheets/<id>.png` and read one by one. `L.1`/`L.9` below are mean luminance from metrics.json. Zero GL errors and non-finite values.

**Limits.** One still per look and energy at t = 2 s: simulations (acid, evolution, life, sandpile) show only their seed stage, and motion, camera and rhythm are not visible. Grades judge the stills against the style rules. They are not taste rulings and do not replace owner ratings.

## Grades

Not graded: **cathedral, flight, hopf, fourspace** (being reworked by other lanes). **GATED** families are flagged only and must not change without owner sign-off.

| Family        | Grade       | Reason                                                                                                         |
| ------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| physarum      | A           | Luminous transport network on a dark ground; accent rare; readable at every energy                             |
| attractor     | A−          | Thin luminous 3D trails, lobes readable; Rössler look sits off-centre and dim                                  |
| flame         | A−          | Rich glowing IFS with depth of density; energy barely changes the picture                                      |
| hyperbolic    | B+          | Fine geodesics on a dark disc, signature clear; some looks crop the disc at the frame edge                     |
| melt          | B+          | Real lit 3D tubes and ribbons; composition small (~50%), weak energy response                                  |
| tapestry      | B (GATED)   | Strong CA triangles; busy, flat full-frame                                                                     |
| pulse         | B (GATED)   | Clean club graphics, but flat colour bars and squares                                                          |
| mandelbrot    | B           | Minibrots and filaments readable; muddy khaki colouring with halos, Burning Ship looks muddy full-frame        |
| harmonograph  | B           | Clean glowing curves, flat vector look, small, weak energy                                                     |
| metamorphosis | B           | Shaded but pastel monotone and orthographic; brightness rises with energy (L 0.03 → 0.09)                      |
| chladni       | B−          | Nodal lines readable but hairlines in an outlined plate on black; small and flat                               |
| quasicrystal  | B−          | Penrose readable; full-frame mid-tone fill, brightness doubles with energy (0.10 → 0.21)                       |
| truchet       | B−          | Crisp glowing arcs but full-frame wallpaper (L.1 0.18)                                                         |
| turmite       | B−          | Readable pixel colonies; small, flat                                                                           |
| life          | B−          | Crisp cells but small at 1080p; several looks nearly empty in the first seconds                                |
| ripple        | C+          | Diffraction readable; full-frame bright lime/pink (L.1 0.13), Raindrops looks a flat green field               |
| voronoi       | C+          | Muddy full-frame cell fills; Delaunay looks are the strongest                                                  |
| newton        | C+          | Basins readable in two looks; others dim, muddy or mostly empty                                                |
| phyllotaxis   | C+          | Discs of sub-pixel dots: moiré and 4K shimmer risk; dim, flat                                                  |
| kleinian      | C+          | Cartoon lime outlines, flat fills, bright blue grounds (L.1 0.12)                                              |
| beams         | C+          | Thin vector lines without haze or volume; near black at 0.1 (L 0.005)                                          |
| acid          | C           | Flat outlined rings on black early on; 2D only (Living Mycelium now gives the same chemistry depth)            |
| evolution     | C           | Grid of uniform rings; petals and relief not visible; flat (Afterglow Garden, wave 2)                          |
| aquarium      | C           | Busy full-frame stripes, bright (L.1 0.13 → 0.22); Lenia creatures do not read as creatures                    |
| caustics      | C           | Wire-mesh shimmer; Crossing Wave Banks reads as barcode/plaid; hard side margins                               |
| colonization  | C           | Tiny multicolour stick tree filling ~30%, hairline weight, no depth                                            |
| domain        | C           | Full-frame pastel (L.1 0.19, highest in catalog); hard black bars in zeta looks                                |
| hilbert       | C           | Saturated full-frame tubes (L.1 0.15) with letterbox bars; garish, accent everywhere                           |
| julia         | C           | Flat maroon interior on a lavender ground; brightness rises with energy (0.09 → 0.21); Burning look is noise   |
| magnetic      | C           | Grey fuzzy ellipses, almost colourless; energy blurs the structure and dims it                                 |
| phase         | C           | Full-frame noisy mosaic; Kuramoto domains not legible                                                          |
| sandpile      | C           | Small pixel mandalas; Critical Rain is near-uniform noise                                                      |
| swarm         | C           | Noise fields, tiny comets, a bright noise disc; energy darkens the frame (0.042 → 0.004)                       |
| wallpaper     | C           | 17 full-frame muddy purple patterns; flat; dark ground violated                                                |
| feedback      | C (GATED)   | Full-frame flat pastel fills (rings, boxes, triangles)                                                         |
| interference  | C (GATED)   | Blurry, muddy moiré; high energy turns to noise                                                                |

## Cross-catalog consistency problems

1. **Dark ground.** Mean luminance at energy 0.1 exceeds 0.08 in domain, truchet, hilbert, aquarium, ripple, kleinian, quasicrystal, julia and gated feedback/tapestry. *Fix:* a ladder gate (`meanLuminance` at 0.1 ≤ 0.08 and `blackFloorP2Luminance` near zero). Darken fills and keep the light on the signature line or body.
2. **Energy drives brightness.** Julia, quasicrystal, voronoi, aquarium, evolution and metamorphosis roughly double in brightness from 0.1 to 0.9. Swarm and magnetic go the other way. *Fix:* flag L.9/L.1 outside 0.67–1.5 in the ladder metrics, and move energy into iterations, density, trail length and motion.
3. **Energy hardly visible.** Flame, melt, harmonograph, chladni, hyperbolic and kleinian show near-identical columns. *Fix:* attach `energy` curves to structural params (trail length, iteration depth, sway, camera speed).
4. **Flat outline style.** Chladni, colonization, kleinian, beams, harmonograph, acid and evolution draw outlined shapes on black, the failure STYLE names. *Fix:* an optional shared relief helper in the scene prelude (height → normal → key, fill, rim, contact darkening) like the one in `scene-mycelium.mjs`, with a constant-width signature line and soft halo.
5. **Composition and borders.** Colonization, sandpile, turmite, phyllotaxis, chladni, harmonograph and melt fill well under 60% of the short side. Hilbert (letterbox bars), caustics (hard side margins), domain zeta (black bars) and hyperbolic (cropped disc) cut content at the frame edge. *Fix:* target 60–85% and fade at the border.
6. **Line weight.** Hairlines (beams, chladni, colonization), sub-pixel dots (phyllotaxis, caustics mesh) and fat tubes (truchet, hilbert) sit side by side. *Fix:* a shared `lineMask(distancePx)` with a 1.5 px minimum at 1080p that scales with resolution, so nothing shimmers at 4K.
7. **Accent as fill.** Hilbert, wallpaper, kleinian and ripple paint large areas in accent and secondary. *Fix:* keep accent at ≤ 10% of lit pixels and add a palette-distance share to `imageMetrics`.
8. **Audit tooling.** At 120 frames, simulations show only their inoculum. *Fix:* give contact sheets a per-family warm-up (for example frames scaled by `simulation.steps`) so audits see mature states.

## Proposed wave-2 reworks (weakest first; owner veto)

1. **Julia Observatory → dark-ground Julia relief.** Draw the boundary from the distance estimate as a constant-width glowing filament. Render the smooth escape potential as lit 3D relief (key, rim, contact shadow), keep the interior near black with rare orbit-trap glints, and walk c slowly along the main cardioid and bulbs (dust → dendrite → rabbit). This could become a continuous world with c as the development key. Keep the four variants.
2. **Wallpaper Groups → embossed symmetry relief.** Treat the symmetrised wave function as a height field and light only its crests (rim in accent) on a dark ground. Show mirror and glide axes as thin accent lines so p1–p6m become legible, and add a slow oblique camera tilt. All 17 groups and look ids stay.
3. **Domain Colouring → analytic landscape.** Render log|f| as an oblique terrain with zeros as dark pits and poles as luminous spires, phase isolines as thin palette contours and a dark ground. This removes the full-frame pastel without losing the domain-colouring signature.

Runners-up: hilbert (garish full frame), phase (illegible domains), swarm (noise). Gated **feedback** and **interference** grade C, but need owner sign-off before any change.
