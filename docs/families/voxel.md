# Data Monolith · Datenmonolith

Family **115**, renderer `voxel`, world `data-monolith`. Eight stable looks and seeds. One persistent population of **1,296 addressed cubes** develops through Rain → Assembly → Unfold. This revision replaces the distant showcase framing with a low, monumental hall and an interior architectural flight. No world definitions, look identifiers, preset parameters, translations or engine code changed in this revision.

## Signature mathematics

`voxel-model.mjs` supplies the actual instance data and independent CPU references. The infinite-lattice, synchronous additive cellular automaton is

```
s[g+1](x,y,z) = s[g](x−1,y,z) XOR s[g](x+1,y,z)
             XOR s[g](x,y−1,z) XOR s[g](x,y+1,z)
             XOR s[g](x,y,z−1) XOR s[g](x,y,z+1).
```

The seed cell is `(0,0,0)`; all other cells are dead. Duplicate parents **cancel**, rather than performing union/dilation. Over GF(2), Frobenius gives `A^(2^k)` as six translated cells at distance `2^k`. Generation **27 = 16+8+2+1** has exactly 1,296 live addresses. Those actual recursive voids determine the architecture; it is not a decorative noise fractal. The topology is baked deterministically on the CPU, not stepped by the animation frame rate.

The monolith contains **8 × 27 × 6** cubes, with pitch `(0.46, 0.44, 0.46)` and a floor-contacting first row. Assembly sorts bottom-up, then by interleaved **Morton xyz bits** within each layer. Rank maps every persistent cube to a sorted live CA address. Seed controls rain addresses and independent fall phases, not the CA rule or population. Development never rebuilds identity buffers.

**225 structural bridges** join nearest same-axis live-cell pairs across gaps of 10 or 12 lattice units, without skipping another live cell. They are explicit scaffolding, not additional claimed CA cells. Both cubes and bridges have depth-correct mirrored instances: **3,042 instances** total. The shared mesh has 36 opaque cube vertices and six additive tail vertices.

## Continuous arc and camera

| State               | Composition                                                                                                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rain · Regen        | A 20 × 20 × 14 hall populated by large falling cubes at multiple depths. Foreground edges soften, thin luminous motion tails follow the fall, brighter distant columns and stronger floor mirrors establish the space.                                                               |
| Assembly · Aufbau   | An approximately 12-unit tower, centred and seen from a low upward-looking camera. Its top intentionally extends beyond the frame, per the monumental brief. Bright edge grids contrast with dark faces; scanning planes, face readouts and addressed bit flips animate the surface. |
| Unfold · Entfaltung | The CA spans 30 world units. The same camera cranes to height 12.5 and moves inside its central void, looking through foreground blocks, structural spans and distant recursive clusters. Distance fog separates the layers.                                                         |

Fractional development uses staggered smoothstep positions and dimensions, not a dissolve. Reversal retraces the same geometric law. Rain uses a cosine descent with a shrunken hidden return: its **position remains continuous even during partial assembly**. Near-lens rain shrinks before crossing the near plane. The solid architecture never uses that concealment.

`cameraFrame()` is the CPU camera reference. The closed path moves through a bounded azimuth sweep, preserving the central subject and stable horizon; development supplies the continuous dolly/crane into the architecture. CPU tests sample the solid cubes and bridge AABBs throughout development, all camera phases and the distance range to guard clearance. The top-state camera sits _inside_ the architecture rather than observing a floating diamond from outside.

## Material, light and colour

Dark solid bodies carry a directional key, secondary fill, specular response and a rim. Bright antialiased edges exceed 1.0 on the float path. Rare memory pads and travelling readouts give the large faces local detail. Accent is confined to addressed bit-flip events; the rest uses primary/secondary palette tones. Eight tall analytic light columns, a low-frequency atmospheric pool, a perspective grid and stronger mirrored geometry anchor the hall.

The foreground focus effect is deliberately inexpensive: distance-dependent edge softness plus soft additive streaks, **not a physical depth-of-field post pass**. Reflections are geometrically correct sharp mirrors with Fresnel/height attenuation, not a roughness convolution.

## Stable looks

The three state presets share seed **1151** and identical non-development parameters.

| Look             | Character                                                      |
| ---------------- | -------------------------------------------------------------- |
| Rain             | Large digital matter falling through the full hall.            |
| Assembly         | Monumental scanned tower.                                      |
| Unfold           | Interior of the recursive architecture.                        |
| Quiet Addresses  | Slower, larger rain beginning assembly.                        |
| Memory Vault     | Closer, denser tower with restrained glitch.                   |
| Parity Cathedral | Wider architecture with finer cubes.                           |
| Broken Register  | Partially unfolded tower with stronger addressed displacement. |
| Cold Archive     | Narrower, denser architecture with a slow camera.              |

No preset names, seeds, schema keys/ranges, world ids, look ids or state names changed. Tests resolve the world with `.find((w) => w.id === "data-monolith")`, never registry position.

## Energy and rhythm

Energy affects rain population, fall speed, camera speed and bounded displacement, never a global brightness multiplier. Low energy already has visible foreground cubes and a lit, grounded hall.

- **Address flip**, every 4 beats: a persistent modulo-16 address cohort receives an accent edge.
- **Scan plane**, every 8 beats: a narrow plane traverses the same matter. A slow periodic sweep and fine face readouts keep the surface alive between events.
- **Register shift**, every 16 beats: one persistent modulo-8 monolith row makes a bounded displacement.
- **Kick:** a travelling bit-front rotates local cubes, brightens their edges/memory pads and makes rare accent bits visible. Lens punch stays at 1.8%.

There are no full-screen flashes and no change to the shared limiter. Three integrated periodic clocks drive fall (period 1), camera (2π) and readout/scan motion (2π). Parameter/energy rate changes never jump phase. There is no raw `u_time`, hourly wrap, stochastic frame state or stale live simulation.

## Cost

Chrome / ANGLE Metal / Apple M3 Pro, synchronous whole-frame throughput including post, energy 0.95. A paired **60-sample** probe routes both the old scene and its original model for the reference commit `528dd003469a8780f2e95174ad6ddc43faa39f1a`:

| State    | 1080p baseline → final p50 | 4K baseline → final p50 |
| -------- | -------------------------- | ----------------------- |
| Rain     | 1.9 → 1.9 ms               | 5.1 → 4.4 ms            |
| Assembly | 2.0 → 2.0 ms               | 5.4 → 4.5 ms            |
| Unfold   | 2.2 → 1.9 ms               | 5.1 → 4.9 ms            |

The previous round's reported finals were 2.4 / 2.9 / 2.4 ms at 1080p and 5.4 / 5.5 / 5.5 ms at 4K. The final standard `profile-families.mjs --types --families voxel --frames 60` runs measured **2.4 / 2.6 / 2.1 ms** at 1080p and **4.9 / 5.0 / 5.2 ms** at 4K. Every state stays within the old-final +5% cap; the paired check also stays within paired-baseline +5%. All satisfy 8 / 16 ms. This is throughput, not venue presentation-cadence qualification. Shared-machine timing varies; retain the raw standard-command and paired logs with the films.

Moving diffuse/specular/rim/fill lighting to the vertex stage offsets the much larger rasterized architecture. Assembled states skip exactly degenerate tail transforms; structural spans skip unused face-pad work. The background conservatively skips Gaussian evaluation only where its widest contribution is below 1e-6. No render-resolution cap, reduced-resolution visual pass or engine change is involved.

## Renderer compatibility

The existing optional `geometry.instances: { create(seed), attributes }` extension remains unchanged. Both buffers rebuild only on seed changes and are released with the slot. Ordinary meshes still use `drawArrays`. The tail uses the already-supported `geometry.additiveFrom` range with depth testing against solids and depth writes disabled. No new engine or shared-file edits were needed this round.

## Verification and visual review

- `node --test tests/voxel.test.mjs tests/time.test.mjs`: CA dense-reference step, cancellation, Frobenius scaling, generation-27 closed form, Morton order, persistent identity, reversible/periodic positions, monumental dimensions, camera clearance, structural bridges, additive-tail layout and instancing lifecycle.
- `PHOSPHOR_HEADLESS_RIG=1 node tests/voxel.test.mjs --rig --port 48510 --out artifacts/voxel-next/round2/native`: late-time reversals at 0, 3599.99, 3600.01, 4096 and 43,200 seconds; ordinary-mesh switches; actual context loss/recovery; full-resolution stills of all three states.
- Typecheck, build, DE/EN browser checks, full CPU suite. Only integration-owned missing preview/curation data fails.
- A newly filmed baseline, Liquid Chrome reference, four composition/material improvement films and a final optimization verification film. Reviewed contact strips, full-size stills, all eight looks at energy 0.1 / 0.5 / 0.9, Ember, Glacier and portrait Silver.
- Honest final rating: **8/10**, replacing the previous over-generous 9. Scale and depth now work, but the repeated outlined-cube material remains less rich than Liquid Chrome, and the top-state void/strut pattern is deliberately stark. Physical DOF and rough floor reflections remain out of scope for this cost-neutral mesh revision.
