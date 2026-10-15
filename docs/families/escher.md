# Impossible Stairs · Unmögliche Treppen (#110)

One continuous world, id `impossible-stairs`, renderer `escher`, development 0–2. The existing eight preset names, seeds, schema, look ids, world states and rhythm tracks remain unchanged. No engine changes.

## Signature mathematics

**Penrose cover.** Forty-eight persistent treads, twelve per square flight. On the covering space, `h(i) = 0.045 floor(i)`, so every local increment is positive and a circuit gains 2.16 units. This is intentionally not a globally single-valued Euclidean loop. A plan point `(x,z)` lifts to `(x + 0.6 h, h, z + h)`, with a common height offset. Successive sheets differ by `2.16 (0.6,1,1)`, exactly the privileged viewing direction; they close under orthographic projection. The bounded camera excursion supplies slight parallax without a free orbit that would destroy the illusion.

**Droste quotient.** For `L = ln(3)`, `a = π/6`, `w = ln(r)/L + phase`,

```
r' = exp(fract(w) L)
θ' = θ − a (w − phase)
```

The chart obeys `F(3 R(a) p) = F(p)` and `F(p, phase+1) = F(p, phase)`. Whole-cell turns add the authored turn and integrated camera phase. A camera-clock wrap rotates each integer cell by whole turns. The recursive aperture is now 0.3 screen units instead of 0.09: stairs, masonry and doorways repeat over the frame rather than only inside a miniature's centre. A bounded logarithmic twist curls the entire hall into it. This is ray-space deformation, not an image dissolve.

Infinity also has a slow cyclic dolly, `exp(0.14 sin(cameraPhase))`, with an exact 2π period. It is an inward/outward zoom loop, not a claim of an unbounded one-direction camera flight. Recursions below the pixel footprint converge to dark palette atmosphere rather than an unstable singularity.

## States and looks

| Development | State EN / DE | Form |
| --- | --- | --- |
| 0 | Stair / Treppe | A large plaster Penrose square inside an enclosing, two-depth arcaded courtyard. |
| 1 | Relativity / Relativität | Two clean twelve-tread flights grow into perpendicular gravity frames, with continuous sloping undersides, instead of two intersecting ring copies. |
| 2 | Infinity / Unendlichkeit | The courtyard, arches and stairs curl into a frame-filling recursive atrium. |

The three state presets use seed **11001** and identical non-development parameters. The two new gravity flights keep twelve fixed addresses each throughout the morph; the primary loop keeps its original 48. Reversal changes only transformations and scale. Nothing reseeds or rewinds.

Five extra looks remain **Chalk Procession**, **Three Gravities**, **Ivory Labyrinth**, **Endless Atrium**, **Night Loggia**. All eight looks have low/mid/high energy evidence.

## Rendering and light

The primary visibility path now uses **exact analytic ray/box slabs**, not 88 sphere-tracing steps. The privileged projection supplies three nearby tread and pier candidates per flight. Conservative projected extents reject empty flights. Tests compare this candidate set with exhaustive intersection of every tread and pier for **26,076 rays**, including camera sway and width/depth extrema, with no changed winning depth.

The two other gravity frames each use twelve exact tread intersections and a sheared-box sloping support. Geometry identities do not depend on time, energy or development. Local distance estimates remain only for two-sample ambient occlusion.

Directional shadows also use exact box intersections, behind conservative flight bounds. This removes the detached shadow fragments produced by the earlier short shadow march. A white-biased directional key, secondary fill, restrained palette-coloured pools, corner/contact occlusion and distance fog distinguish white plaster from dark recesses. Walking lantern figures have HDR heads and visible slender bodies; they obey their own gravity and are depth-occluded by the hall as well as stairs. Secondary-flight walkers turn smoothly with a cosine traversal rather than teleporting at an endpoint.

The courtyard is traced separately with exact planes and cylinders: two receding walls on each side, semicircular open doorways, **0.24-unit-deep cylindrical soffits and straight jambs**, cylindrical colonnades, carved arch stones/string courses and a grouted dark floor. Column shading suggests fluting; the cylinder silhouette itself is smooth. One nearest column per wall is sufficient because its projected radius is less than half a bay, checked at every camera extreme.

All chroma comes from the palette, mixed with white or black. No new textures, reduced-resolution colour cache, engine extension or visual resolution cap. The camera is deliberately near-isometric. The kick changes framing by at most 1.8%. Portrait framing expands to preserve the square's full width; the surrounding building may naturally continue beyond the frame.

## Energy, rhythm and long shows

Energy changes integrated procession speed and lantern size, not plaster master brightness. The complete primary loop and courtyard are present at energy 0.1.

- **4 beats — Tread procession:** a local light packet climbs persistent tread addresses.
- **8 beats — Gravity light:** bounded fill reveals stair-face orientation.
- **16 beats — Recursive lantern:** the walking lights breathe through every recursive level.

The procession clock has period 48; ×3 walkers and ×5 tread packets make integer laps at its wrap. The camera clock has period 2π; all uses are sinusoidal or whole-cell rotations. Parameter-dependent motion uses integrated clocks in the late/rate-change shader. Native time checks pass 3600, 4096 and 43,200 seconds, plus energy/fader rate steps at 7200 seconds. A separate 4K Infinity capture also checks the twelve-hour shader.

## Performance and verification

Apple M3 Pro, headless Chrome/ANGLE Metal; synchronous complete-frame throughput including post, twelve samples after warm-up. Not a venue cadence guarantee.

| State | Previous commit 1080p → final | Previous commit 4K → final |
| --- | ---: | ---: |
| Stair | 2.4 → **2.5 ms** | 7.2 → **8.5 ms** |
| Relativity | 3.8 → **3.3 ms** | 13.0 → **11.4 ms** |
| Infinity | 4.1 → **3.4 ms** | 14.3 → **11.9 ms** |

Every state meets the assignment's absolute **8 / 16 ms p50** limits. Stair costs more than the old bare miniature because of the enclosing building; the two higher states are cheaper. Do not describe this as an across-the-board performance improvement.

`tests/escher.test.mjs` covers positive local height/monodromy, exact projective closure, Droste similarity and clock periods, conservative distance/flight bounds, exhaustive analytic candidate visibility, clean orthogonal gravity flights, nearest-column bounds, persistent identity/reversal, presets, continuous-world registration **by world id**, and twelve-hour rate continuity. `tests/time.test.mjs`, typecheck, build and bilingual native-browser tests pass. The full CPU suite has only the three expected stale preview/curation failures; those protected files are intentionally untouched.

## Review evidence and remaining limits

Six new 30-second improvement films were inspected after the baseline, beside an independently filmed **Liquid Chrome** reference. Iterations covered enclosing architecture and scale; clean gravity flights and supports; exact primary intersections; real arch reveals and carved detail; exact shadows/column pruning; taller lantern figures and portrait framing. Superseded MP4s were removed after preserving their contact strips. Baseline, final, reference, extra-look, three-palette and portrait films, 4K stills, energy ladder and raw timings are in the fleet worker's output directory.

**Honest final rating: 8/10, not the earlier 9/10.** Infinity has the strongest composition; the primary loop is no longer a grey-green square in a void. Remaining limits: Relativity is still a staged architectural sculpture rather than a fully interconnected Escher building; the miniature-like perfectly regular treads and sparse figures remain stylised; the recursive chart has finite annular joins and the smallest levels are footprint-filtered. Material richness and inhabited scale do not yet equal Liquid Chrome's reference-level finish.
