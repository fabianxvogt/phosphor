# Space Colonization (83)

Implementation: [scene-colonization.mjs](../../scene-colonization.mjs), [CPU graph](../../colonization.mjs), [exact-rule tests](../../tests/colonization.test.mjs). Classification: **INCREMENTAL implementation; EXPLORATORY visual study**, 2026-10-11. Catalog registration and a first-show family gate are separate decisions.

## Algorithm and identity

**REPORTED:** Runions, Lane and Prusinkiewicz's [space-colonization procedure](https://algorithmicbotany.org/papers/colonization.egwnp2007.html) grows a branching skeleton into available space. It is spatial competition, rather than an L-system grammar or a texture labeled as growth.

**EMPIRICAL implementation:** each attraction point finds its nearest existing node inside an influence radius. Reached points inside a smaller kill radius disappear. Assigned unit directions are summed; their normalized average determines one fixed-length new segment per receiving node. Children are added simultaneously, so they first compete for points on the next iteration. Exact nearest queries use bounded integer-grid bins with a stable oldest-node tie break. All nodes retain real parent indices, root distance and descendant counts. A short explicit seed stem and 15 initial growth iterations provide an immediately visible starting graph; subsequent branching uses only local attraction, with no force toward unreachable points.

The rendered skeleton uses sixteen soft point samples per edge, with descendant-count taper. Remaining attraction points are displayed as dim dots and vanish when reached. Color comes exclusively from the shared palette. The light wave measures actual distance along parent-child edges; it is not a ring applied to the screen.

## Three structural models and eight looks

| Model        | Geometry of available space                                                | Looks                                       |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------- |
| Canopy       | Shallow elliptical crown above an upright seed stem                        | Branching Crown, Broad Canopy, Winter Crown |
| Root fan     | Downward tapered fan, broadening with depth, almost planar                 | Root Veins, Deep Root Fan, Fine Root Lace   |
| Coral volume | Filled 3D ellipsoid; z participates in nearest queries and averaged growth | Coral Arbor, Coral Thicket                  |

The looks vary point density, influence radius, segment length, growth pace, branch width and camera motion. They do not rely on palette changes for their differences. Coral is a shallow spatial growth study; it does not model coral biology.

## Independent rhythm and energy

| Slot | Gesture                                                       | Default          |
| ---- | ------------------------------------------------------------- | ---------------- |
| 0    | Branch ancestry pulse, traveling along measured root distance | Every beat       |
| 1    | Accent actual terminal growth tips                            | Every four beats |
| 2    | Open another finite local attraction region                   | Every 32 beats   |

The first two tracks highlight graph properties without altering topology. The third introduces genuinely new attraction space and a new growing graph. Rapid region requests coalesce during the six-second overlap, maintaining the allocation cap. Muted or zero-strength tracks emit no intervention because the CPU consumes actual event hits rather than accumulated selector counts.

Energy changes growth pace, available-point density and sway/orbit. Density takes effect when a new region opens; it does not teleport the points of a region already growing. Fine details and baseline branch light remain visible at low energy. Movement-speed trim affects growth/camera time, while the shared music-clock sampler owns rhythm scheduling.

## Finite growth and renewal

Each finite region may stop because its points are consumed or unreachable, repeated directions add no new edge, or the node budget is reached. There is no claim of endless growth of a single tree. A fresh local region opens on a scheduled region event, on a structural-model change, or after a 20-second unattended fallback interval. The old graph fades for six seconds while its successor grows. At most two graphs coexist, and the outgoing graph does not keep allocating nodes.

The bounded coral study can reach its node cap before filling the entire attraction volume. Those unreached space points remain visible until that finite region retires. This is an explicit preview limit, rather than a simulation of a completed botanical specimen.

## Runtime contract and cost

The scene uses `simulation.cpu.create/step`, uploads an RGBA8 128×256 texture only when graph/point visibility changes, and requests zero hidden warm-up ticks. The initial stem/iterations already make the first picture useful. No worker, offscreen GPU deposit pass or external dependency is required.

Hard caps: 384 nodes and 400 attraction points per region; 768 nodes and 800 points across an overlap; at most two iterations per CPU tick. Sample positions use packed16 x/y in the first 128 texture rows and packed16 z plus taper/opacity/tip flags in the second half. Spare first-layer texels carry edge ancestry metadata and remaining attraction points. Zero-position sentinels and all metadata rows are hidden by the vertex shader.

**EMPIRICAL CPU probe:** a deterministic 30-second path for each of the eight looks, including a region cue, produced per-step p99 of 0.33–2.32 ms in local Node after replacing string bin keys and per-sample arrays. Cold first creation was 18 ms; later creations were normally 1–4 ms. Host scheduling/collection caused isolated longer samples, including 25 ms. These numbers include texture packing but exclude GPU submission; they are not a real-show cost guarantee.

**EMPIRICAL native-browser study:** installed Chrome 155.0.8059.39, ANGLE Metal / Apple M3 Pro, headless native GPU. Twenty-four 640×360 energy-ladder renders and seven motion checkpoints through 26 seconds for each structural model compiled and rendered with zero reported GL errors, zero engine non-finite values and no blank capture. Review improved initially faint branches by increasing baseline light and the minimum stroke width. Final image mean luminance was 1.28–2.87 / 255, with 1.2–2.3% of pixels above luminance 12: intentionally sparse open skeletons, with large areas of negative space.

Two separate 180-frame, RAF-paced 1920×1080 native runs had RAF interval p99 of 16.8 ms; the coral run had one 66.6 ms interval. Submission timers were quantized and do not establish GPU render cost. This short, single-family headless result does **not** verify external-display timing, a two-family crossfade, a long show or a family-gate acceptance.

Local review outputs: `artifacts/colonization-study/summary.json`, `ladder.png`, `filmsheet.png` and numbered PNG checkpoints. These are generated evidence, not distributed media. Reproduce with the temporary artifact runner or the normal family harness after explicit catalog registration.

## Evidence and remaining checks

Ten tests cover local reach/kill behavior, normalized-direction averaging, nearest-node competition, stable ties, integer-bin agreement with an exhaustive 3D reference, exact cancellation, domain/node bounds, duplicate prevention, deterministic ancestry, simultaneous updates, bounded overlap/coalescing, packed-state sentinels, reached-only point removal uploads, descriptor validity and all eight presets.

These are **EMPIRICAL regression checks**, not a proof of botanical realism or a theorem about every parameter/seed. The hard allocation limits follow directly from explicit caps. Next: compare moving canopy/root/coral studies with the nearest existing family, including grayscale and different palettes; inspect the ancestry pulse at sub-beat phases; measure native two-family crossfades and a long unattended renewal path before declaring show acceptance.
