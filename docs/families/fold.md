# Polyhedral Folding

**INCREMENTAL / EMPIRICAL** (exact hinge closure is **FORMAL**-checked on the CPU), 2026-10-14. Family 91, the mesh world behind **Origami Storm**.

## Algorithm and signature detail

The five Platonic solids are built as convex hulls and unfolded once into flat nets: a spanning tree of faces (breadth- or depth-first from some root, choosing the shallowest tree whose flat polygons do not overlap). Every non-root face stores the edge it shares with its parent as a hinge (point, unit direction, fold angle) in the net's flat coordinates. A point on face *f* folds by applying the hinge rotations of *f*, its parent, its grandparent and so on up to the root, each by `angle × progress` (Rodrigues rotation). At progress 1 this composition equals the rigid map of the original solid, so every copy of a solid vertex meets exactly and the solid closes. Chains are at most 5 hinges deep (icosahedron); the 50 hinges are seed-independent and are emitted as GLSL constant arrays from [fold-geometry.mjs](../../fold-geometry.mjs).

The signature detail is the visibly exact fold: nets with glowing crease and outline edges close into watertight solids along their hinges, then the same faces leave as shards.

## States (world Origami Storm, seed 527)

| Development | State | Form |
| --- | --- | --- |
| 0 | Sheet | A dark, gently undulating paper floor with an origami crease grid; nets lie in it, creased by 3.5%, outlines glowing. High camera, narrow lens. Calm, but the net rims and creases carry readable edge light. |
| 1 | Fold | Nets fold in birth order (deeper faces slightly later), close, rise and tumble above the sheet; a light core rises in the centre. |
| 2 | Shards | Every fan triangle of every face leaves its solid for a vortex orbit: a funnel of streaking, rim-lit shards around a blazing core, reflected on the glossy floor. Low camera looking up. |

Fold progress, lift and shard release are pure functions of development (`foldProgress`, `liftProgress`, `shardProgress` mirror the shader), so reversal retraces the forward motion. Between Fold and Shards each shard blends position and orientation from its place on the tumbling solid to a velocity-aligned frame on its orbit; its trailing vertices stretch with `streak` and fade, which reads as a motion streak.

## Looks

Creased Sheet, Rising Solids and Shard Storm are the three states. Extra looks: **Blueprint Field** (high crane over the sheet, bright creases), **Tumbling Choir** (shattering begins, dense small solids), **Slow Comet Ring** (slow vortex, long streaks), **Paper Lanterns** (half-folded nets lit by a strong core) and **Glass Asteroids** (slow, short streaks, shards mid-flight). Eight looks.

## Camera, light and depth

The camera orbits outside the field (radius 12.0–13.2) on an integrated phase and cranes from a high view of the sheet (narrow lens) to a low, upward view into the vortex (wide lens). The light core is a point light whose height and intensity follow development; faces are lit by a raking key and the core (lit side bright, backlit side dim, so shards in front of the core become silhouettes with glowing rims). The background draws the core's halo with the same camera. Depth comes from parallax of the orbit, fog, the core's falloff on faces and floor, and many small solids against a few large ones.

## Energy and rhythm

Energy moves `drift` (orbit speed ×0.7–1.4), `swirl` (vortex and tumble speed ×0.6–1.5), `streak` (shard streak length ×0.5–1.6) and `density` (+0.45 small solids). Phases are integrated in a 2×1 state as exact 24-bit steps; every orbit and tumble uses whole turns per phase cycle, so the wrap is seamless. Kick: 2% lens punch. Gestures: **Edge flash** (4 beats), **Fold breath** (8 beats, all hinges open by 3.5% and close), **Core flare** (16 beats).

## Safety and endlessness

Placement keeps every net circle and every tumbling solid inside a 9.6-unit field; the vortex funnel stays within radius 7.35 plus its streaks; the camera never comes closer than 12.0 to the axis and never below the floor. `tests/fold.test.mjs` checks these bounds for four seeds.

## Cost

90–120 solids per seed (1,600–2,000 fan triangles, each a shard) plus a 32×96 floor disc: ≈24k vertices of 28 floats. Vertex work is the hinge loop (≤5 rotations). Geometry creation takes 20–70 ms of CPU. Indicative throughput on the shared M3 Pro: see the wave-2 report (1080p and 4K).

## Verification

- `node --test tests/fold.test.mjs`: registration and continuous-world detection; nets flat, unit-edged, non-overlapping; exact closure of all five solids (error < 1e-9) and coincidence of all vertex copies; rigidity at intermediate development; staging and continuity of fold/lift/shard progress; field/vortex/camera clearance; seamless integer-turn phase wrap; deterministic finite geometry.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family fold --rig`. Films: `node scripts/world-film.mjs --world origami --rig`, `--look "fold:Slow Comet Ring"`.

## Sheet edge light (polish 2026-10-15)

The Sheet was too dim (64×36 peak 71/255 at 320×180, 103 at 480×270): the rim glow started at 0.55 of its Fold value and the crease lines faded out between 6 and 16 units, while the high Sheet camera sits about 14–16 units from the nets. Now face rims start at 1.15 (Fold total 1.25 unchanged), and in the calm states the crease lines fade between 12 and 28 units and gain +0.04. Energy 0.1 at 480×270 (mean / 64×36 peak / max / pixels above 25): Creased Sheet 9.2 / 103 / 122 / 4.2 % → 19.1 / 192 / 220 / 29.3 %; at 320×180 the peak is 206. Brightness stays flat across energy (L.9/L.1 0.93). Fold and Shards are unchanged apart from the rim term at development < 1.

## Wave 5 (2026-10-15): paper, not wire

Three filmed rounds plus a framing correction: (1) exact analytic paper-wave derivatives replace four displaced wave evaluations per floor pixel, and lift the paper pigment; (2) distinct front/back palette-tinted paper bodies, less over-hot core/halo and quieter peak rims; (3) give every shard a persistent bank (orthonormal tangent/across frame), raise the peak target to 3.5 and keep a 1.45 peak lens. Full-size review caught near-side cap cropping, so a continuous 2.6-unit peak camera backoff now contains the funnel. It remains outside the original safety bound. Final cost polish reduces the floor grid 56×128 → 32×96: analytic normals retain the fine relief, without spending most vertices on a nearly flat dark floor. All exact hinge mathematics, net topology, instances, seeds, looks, schemas and world definitions remain intact.

Standard native p50 (states 0/1/2): 1080p **2.4/2.2/2.2 → 2.2/2.3/2.1 ms**; 4K **6.2/7.0/6.5 → 6.1/5.8/6.1 ms**. Sub-millisecond drift and occasional fleet contention are visible in the raw runs. The final same-context, alternating-frame comparison loads original scene AND geometry from `deaaae1`, takes 64 paired complete-frame samples per state, and measures 1080p **2.5/2.2/2.3 → 2.3/2.1/2.1 ms**, 4K **6.7/6.3/5.9 → 6.2/6.0/5.7 ms**. Every state is faster. Raw samples, including the earlier context-separated noisy run, are retained; this is throughput, not venue cadence.

Tests compare analytic normals with independent central differences, and check banked-frame orthogonality, unit normals and exact phase periodicity, alongside exact closure, intermediate rigidity and clearance. Evidence: fleet worker `rework-geometry/output/evidence/fold/` (baseline/final films and full-size stills, Slow Comet Ring, all-look energy ladder, ember/glacier portrait). Honest rating **8.5/10**: the arc reads and the paper survives the storm; the middle state's solids could still be more monumental.

## Limits

Shards are fan triangles of the faces, not a fracture simulation; shards may interpenetrate in the vortex. Faces have no thickness. Multi-hour Stage endurance and external 4K cadence are unmeasured.
