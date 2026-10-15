# Impossible Stairs · Unmögliche Treppen (#110)

One continuous world, renderer `escher`, development 0–2. White plaster, dark stage, scarce walking lanterns. No engine changes.

## Signature mathematics

**Penrose cover.** There are 48 persistent treads, twelve per square flight. On the covering space, `h(i) = 0.045 floor(i)`, so every local increment is positive and one circuit gains 2.16 units. This is deliberately **not** a globally single-valued height on a closed Euclidean curve. Each tread's flat plan point `(x,z)` is lifted to `(x + 0.6 h, h, z + h)` (with a common height offset). Successive sheets differ by `2.16 (0.6,1,1)`: exactly the privileged viewing direction. They therefore close under projection while their local surfaces remain ordinary horizontal stair treads. The tiny bounded camera excursion reveals parallax without unmasking the join.

**Droste quotient.** With `L = ln(3)`, `a = π/6`, `w = ln(r)/L + phase`, the canonical chart is

```
r' = exp(fract(w) L)
θ' = θ − a (w − phase)
```

It obeys `F(3 R(a) p) = F(p)` and `F(p, phase+1) = F(p, phase)` exactly, to numerical precision. Whole-cell turns add the authored turn and the integrated camera phase; the corresponding similarity angle changes by the same amount. A camera-clock wrap rotates each integer cell by whole turns, so it cannot jump. The CPU tests check both the canonical quotient and this animated extension.

The outer sculpture remains a composed silhouette. Only its central annulus repeats; a continuous logarithmic ray-space twist curls the whole structure toward it. This is geometric ray remapping, not an image dissolve. Subpixel recursion converges to dark palette atmosphere rather than a flickering singularity. The infinitely small mathematical levels are not individually resolved.

## States and looks

| Development | State EN / DE | Form |
| --- | --- | --- |
| 0 | Stair / Treppe | One clean impossible square stair loop on a colonnade. |
| 1 | Relativity / Relativität | Two more persistent loops grow, hinge and separate into perpendicular gravity frames. |
| 2 | Infinity / Unendlichkeit | The architecture curls into a rotating self-similar recursive atrium. |

All three states use seed **11001** and identical non-development parameters. Reversing development reverses only geometry/transforms; it never reseeds or rewinds the clocks.

Five additional looks: **Chalk Procession** (broad, slow colonnade), **Three Gravities** (open, narrow stairs and larger lanterns), **Ivory Labyrinth** (broad intermediate structure, reverse turn), **Endless Atrium** (narrower spiral and faster procession), **Night Loggia** (deep piers and partially hinged stairs). Eight catalog looks total, all bilingual.

## Rendering and light

Bounded full-resolution sphere tracing: at most 88 steps inside a sphere bound, four conservative flight AABBs, then only adjacent tread/pier candidates in the local chart plus the neighbouring flight's cap at a corner. Chebyshev box distance preserves the exact box zero set and is a conservative distance lower bound; no square roots in that hot primitive. The flight bounds conservatively contain all tread and pier boxes at every width/depth fader extreme (CPU checked).

Pixel-softened analytic face normals avoid differentiating candidate switches. Four distance samples give a bounded soft key shadow; two normal-offset samples provide ambient occlusion. A white-biased palette key, secondary rim/fill, distance attenuation, low stage spill and small scale-cue lanterns give depth. Lantern heads exceed 1.0 before bloom; their bodies follow the local gravity. All chroma comes from palette uniforms, mixed only with white/black.

The camera is **near-isometric/orthographic by design**, not a free perspective orbit: forced perspective is the mathematical subject. It makes a very slow, closed, bounded directional excursion. Portrait uses the short side and preserves the complete sculpture. The kick changes framing by at most 1.8%.

## Energy, rhythm, endlessness

Energy changes integrated procession speed and lantern size, not the plaster's master brightness. Even at 0.1 the stair loop is fully present.

- **4 beats — Tread procession:** a local light packet climbs persistent tread addresses.
- **8 beats — Gravity light:** a bounded soft light reveals stair-face orientation.
- **16 beats — Recursive lantern:** the small walking lights breathe through the nested levels.

The procession clock has period 48; both its ×3 walking and ×5 address phases complete whole 48-tread laps. The camera clock has period 2π; other camera uses are sinusoidal or integer-cell rotations. Parameter-dependent motion uses integrated clocks in the late/rate-change shader. No simulation, texture history or unbounded position accumulates. Native checks pass 3600 s, 4096 s and 43,200 s; no time seam or GPU error was found.

## Cost and verification

Apple M3 Pro, native headless Chrome/ANGLE Metal, synchronous complete frame including post (12 measured frames after warm-up; not venue cadence):

| State | 1920×1080 p50 | 3840×2160 p50 |
| --- | ---: | ---: |
| Stair | 2.2 ms | 7.1 ms |
| Relativity | 3.7 ms | 12.8 ms |
| Infinity | 4.0 ms | 13.7 ms |

All below 8 / 16 ms. No resolution cap, framebuffer downscaling, shared-engine modification, or preview/curation edit.

`tests/escher.test.mjs` checks local positive height increments and monodromy, exact projective closure, Droste similarity and animation periods, box lower bounds, shader flight bounds, persistent identity and reversible development, 12-hour rate changes, all presets and continuous-world registration. Also run `tests/time.test.mjs`, typecheck and bilingual browser verification.

Review evidence lives in the fleet worker's `output/`: baseline plus final 30-second films/contact strips, an extra Night Loggia film, copper/glacier/ultraviolet palette films, portrait film, all-eight-look energy ladder, full-size stills, native timings and time-seam results. Eight improvement passes addressed framing, pale plaster light, gravity separation, recursion motion, excessive 4K cost, subpixel convergence, the final stronger spiral and fine corner-sector cracks visible in the 4K stills. Superseded films were deleted.

**Remaining limits:** a privileged-camera illusion rather than physically impossible global geometry; the final recursion intentionally occupies the atrium instead of filling the entire screen; extremely small levels are filtered out. The aesthetic is crisp architectural miniature, not a photoreal building. Final self-rating: **9/10**.
