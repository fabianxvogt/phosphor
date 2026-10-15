# Data Monolith · Datenmonolith

Family **115**, renderer `voxel`, world `data-monolith`. Eight looks. One persistent population of **1,296 addressed cubes** becomes Rain → Assembly → Unfold. A glossy grid hall, twelve analytic light columns and depth-correct mirrored instances supply scale and atmosphere. The cube material has a shaded solid face, a key, a secondary fill, rim light, antialiased emissive edges and rare memory pads. All colour derives from the current palette.

## Signature mathematics

`voxel-model.mjs` is the CPU reference and the actual source of instance data. The infinite-lattice, synchronous, additive cellular automaton is

```
s[g+1](x,y,z) = s[g](x−1,y,z) XOR s[g](x+1,y,z)
             XOR s[g](x,y−1,z) XOR s[g](x,y+1,z)
             XOR s[g](x,y,z−1) XOR s[g](x,y,z+1).
```

The seed cell is `(0,0,0)` and all other cells are dead. Duplicate parents **cancel**; this is not a union/dilation. Over GF(2), Frobenius gives `A^(2^k)` as six translated cells at distance `2^k`. Generation **27 = 16+8+2+1** has exactly 1,296 live addresses. Its recursive voids, not a noise field or a decorative fractal approximation, determine the unfolded architecture. Generation 27 is baked deterministically on the CPU; development plays the continuous geometric construction, not a frame-dependent CA simulation.

The compact monolith has dimensions **8 × 27 × 6**. Its deterministic assembly permutation sorts bottom-up, then by interleaved **Morton xyz bits** inside each layer. This keeps neighbouring writes local. Rank maps each persistent cube to a sorted live CA address. Seed controls its rain address and fall phase, not the CA rule or population. Development never rebuilds these attributes.

**225 sparse structural bridges** join nearest same-axis live-cell pairs across gaps of 10 or 12 lattice units, without crossing an intervening live cell. They grow geometrically during Unfold. They are explicit architecture/scaffolding, not additional claimed live CA cells. Cube nodes and bridges have floor-mirror instances: 3,042 instances total, one shared 36-vertex cube.

## Continuous arc

| State               | Geometry                                                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Rain · Regen        | Sparse descending voxel matter in the grid hall, with independent phases and identities.                                    |
| Assembly · Aufbau   | A 4.2-unit monolith assembles bottom-up in Morton order; a scan plane and travelling kick bit-flips cross its faces.        |
| Unfold · Entfaltung | The same matter unfolds into the six-direction, recursive CA architecture, with sparse struts spanning the recursive voids. |

Every fractional value is a staggered smoothstep position law, not a dissolve. Reversal retraces the same path. Rain uses a cosine descent with a shrunken, hidden return; importantly its **position is continuous even during partial assembly**, unlike a blended sawtooth with an exposed wrap. A single camera makes a slow, closed orbit outside all hero geometry. The top-state hero occupies about 70% of the short side in the reviewed films. Perspective, distance fog, contact darkening, key/fill/rim shading and mirror instances establish depth.

## Looks

The three world states share seed **1151** and identical non-development parameters.

| Look             | Composition                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| Rain             | Sparse digital rain, full hall.                                            |
| Assembly         | Compact scanned monolith.                                                  |
| Unfold           | Full recursive architecture.                                               |
| Quiet Addresses  | Slow, larger rain addresses beginning their assembly.                      |
| Memory Vault     | Close, denser monolith with restrained glitch.                             |
| Parity Cathedral | Wide, fine-celled architecture seen farther out.                           |
| Broken Register  | Compressed, partially unfolded tower with stronger addressed displacement. |
| Cold Archive     | Narrow, dense, nearly unfolded archive with a slow camera.                 |

## Energy and rhythm

Energy affects rain population, fall speed, camera speed and bounded glitch displacement, never a global brightness multiplier. Low energy already has readable cubes, light columns and a grounded hall.

- **Address flip**, every 4 beats: a persistent modulo-16 address cohort gets a rare accent edge.
- **Scan plane**, every 8 beats: a narrow, bounded plane of light traverses the matter.
- **Register shift**, every 16 beats: one persistent modulo-8 monolith row shifts by at most 0.15 world units (schema maximum).
- Kick: a small travelling bit-front brightens memory pads/edges and rotates affected cubes; camera lens punch is limited to 1.8%.

All gestures work in every state and respect managed rhythm muting. There are no full-screen flashes or local changes to the shared limiter.

## Renderer extension (optional, backwards compatible)

`engine.mjs` accepts `geometry.instances: { create(seed), attributes }`. Instance attributes follow ordinary vertex attributes, use divisor 1, and infer their count from the interleaved stride. Both vertex and instance buffers rebuild only on seed change and are released with the slot. Instanced opaque/additive ranges retain the ordinary depth contract. Scenes without `instances` still call `drawArrays` unchanged. No simulation, post-processing, UI or control changes.

Tests exercise uploads, attribute divisors, seed-only rebuild, reversal, two-buffer cleanup, ordinary draws, and the actual native GPU path including switches to Kinetic/Fold and context loss/recovery.

## Cost and endlessness

Native M3 Pro / Chrome ANGLE Metal, synchronous whole-frame throughput including post-processing, 12 measured frames per state at energy 0.95:

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Rain | 2.4 / 2.5 ms | 5.4 / 5.7 ms |
| Assembly | 2.9 / 3.0 ms | 5.5 / 6.0 ms |
| Unfold | 2.4 / 2.5 ms | 5.5 / 5.6 ms |

Every state is below the 8 ms / 16 ms p50 budgets. The background uses 12 analytic line-distance evaluations, not raymarching. No feedback textures, runtime CA stepping or unbounded loops.

Three integrated periodic clocks drive fall (period 1), camera orbit (2π) and edge modulation (2π). Energy/rate changes integrate without moving phase. No raw `u_time`, hourly wrap, stochastic frame-state or stale simulation exists. The native test renders reversals at 0, 3599.99, 3600.01, 4096 and 43,200 seconds.

## Verification / visual review

- `node --test tests/voxel.test.mjs tests/time.test.mjs`
- `PHOSPHOR_HEADLESS_RIG=1 node tests/voxel.test.mjs --rig --port 48510 --out artifacts/voxel-evidence/native`
- Typecheck, DE/EN browser i18n test, full CPU suite; missing preview/curation data is intentionally left to integration.
- Baseline plus five improvement rounds: independent rain phase; stronger solid-face lighting; sparse population independent of fall phase; generation-27 recursive voids and memory pads; real-cell bridges, continuous orbit and smooth partial-assembly return.
- Final 30-second films reviewed in Phosphor, Ember and Silver (portrait); Parity Cathedral extra-look film reviewed in Glacier. All eight looks have a low/mid/high energy ladder.
- Honest visual rating: **9/10**. Remaining limits: mirror is geometrically sharp rather than roughness-convolved; this is authored CA topology, not a live evolving simulation; far scaffolding is deliberately subordinate to the voxel clusters.
