# Polyhedral Folding

**INCREMENTAL / EMPIRICAL** (exact hinge closure is **FORMAL**-checked on the CPU), 2026-10-14. Family 91, the mesh world behind **Origami Storm**.

## Algorithm and signature detail

The five Platonic solids are built as convex hulls and unfolded once into flat nets: a spanning tree of faces (breadth- or depth-first from some root, choosing the shallowest tree whose flat polygons do not overlap). Every non-root face stores the edge it shares with its parent as a hinge (point, unit direction, fold angle) in the net's flat coordinates. A point on face *f* folds by applying the hinge rotations of *f*, its parent, its grandparent and so on up to the root, each by `angle × progress` (Rodrigues rotation). At progress 1 this composition equals the rigid map of the original solid, so every copy of a solid vertex meets exactly and the solid closes. Chains are at most 5 hinges deep (icosahedron); the 50 hinges are seed-independent and are emitted as GLSL constant arrays from [fold-geometry.mjs](../../fold-geometry.mjs).

The signature detail is the visibly exact fold: nets with glowing crease and outline edges close into watertight solids along their hinges, then the same faces leave as shards.

## States (world Origami Storm, seed 527)

| Development | State | Form |
| --- | --- | --- |
| 0 | Sheet | Paper-white, palette-tinted nets with soft face shading, quiet creases, and directional cast shadows on a dark shallow-relief floor. High camera, narrow lens; outlines no longer dominate the faces. |
| 1 | Fold | Nets fold in birth order (deeper faces slightly later), close, rise and tumble above the sheet; a light core rises in the centre. |
| 2 | Shards | Every fan triangle leaves its solid for a vortex orbit: a towering funnel (1.7× height, 1.3× radius) of lit paper shards. The low camera approaches under the canopy; near shards pass the lens and the top extends beyond the frame. |

Fold progress, lift and shard release are pure functions of development (`foldProgress`, `liftProgress`, `shardProgress` mirror the shader), so reversal retraces the forward motion. Between Fold and Shards each shard blends position and orientation from its place on the tumbling solid to a velocity-aligned frame on its orbit; its trailing vertices stretch with `streak` and fade, which reads as a motion streak.

## Looks

Creased Sheet, Rising Solids and Shard Storm are the three states. Extra looks: **Blueprint Field** (high crane over the sheet, bright creases), **Tumbling Choir** (shattering begins, dense small solids), **Slow Comet Ring** (slow vortex, long streaks), **Paper Lanterns** (half-folded nets lit by a strong core) and **Glass Asteroids** (slow, short streaks, shards mid-flight). Eight looks.

## Camera, light and depth

The camera begins outside the field (radius 12.0–13.2), then at development 1.4–2 dollies under the expanding canopy to radius 5.7–6.9, height .72–1.08, aiming at height 5.5. A raised `crane` also backs the peak camera away, preserving clearance. The shared camera is mirrored on the CPU. The light core is a point light; a raking directional key, diffuse fill, front/back paper pigment and crease darkening keep faces readable rather than wireframe. Each hero net repeats its exact hinged triangles as a directional floor shadow; small paper has no duplicate shadow geometry. Shadows fade away before the storm. The background draws the core halo with the same camera. Parallax, distance fog, light falloff, cast shadows and small/large paper supply depth.

## Energy and rhythm

Energy moves `drift` (orbit speed ×0.7–1.4), `swirl` (vortex and tumble speed ×0.6–1.5), `streak` (shard streak length ×0.5–1.6) and `density` (+0.45 small solids). Phases are integrated in a 2×1 state as exact 24-bit steps; every orbit and tumble uses whole turns per phase cycle, so the wrap is seamless. Kick: 2% lens punch. Gestures: **Edge flash** (4 beats), **Fold breath** (8 beats, all hinges open by 3.5% and close), **Core flare** (16 beats).

## Safety and endlessness

Placement keeps every net circle and tumbling solid inside a 9.6-unit field. The camera remains outside this field until late in the release, then moves beneath the enlarged cone. At the peak, tests conservatively bound each actual triangle's tangential streak, radial bank and vertical extent, independently maximizing camera sway, shard bob and phase: every shard is either radially inside the camera or vertically above it, including raised-crane looks. The peak check covers six authored seeds; it is not a formal proof of every intermediate mixed shard pose. All orbit/tumble harmonics are whole turns, and CPU camera/shard references verify seamless phase wraps.

## Cost

90–120 solids per seed (1,600–2,000 fan triangles, each a shard), hero-net shadow triangles and a 24×64 floor disc: seed 527 has 16,200 vertices of 28 floats. Vertex work is the hinge loop (≤5 rotations); shadow vertices return early after development 1.2. No shadow map, extra pass or engine change. Final native paired whole-frame p50 versus the previous wave-5 final, states 0/1/2: 1080p 2.550/2.350/2.250 → 2.575/2.300/2.225 ms; 4K 6.150/5.750/5.675 → 6.175/5.800/5.450 ms. Values are block-mean medians, not 0.025 ms precision guarantees; raw standard probes and shared-GPU contention are reported separately.

## Verification

- `node --test tests/fold.test.mjs`: registration and continuous-world detection; nets flat, unit-edged, non-overlapping; exact closure of all five solids (error < 1e-9) and coincidence of all vertex copies; rigidity at intermediate development; staging and continuity of fold/lift/shard progress; field/vortex/camera clearance; seamless integer-turn phase wrap; deterministic finite geometry.
- Energy ladder: `node scripts/contact.mjs --dist . --sheet ladder --family fold --rig`. Films: `node scripts/world-film.mjs --world origami --rig`, `--look "fold:Slow Comet Ring"`.

## Sheet edge light (polish 2026-10-15)

The Sheet was too dim (64×36 peak 71/255 at 320×180, 103 at 480×270): the rim glow started at 0.55 of its Fold value and the crease lines faded out between 6 and 16 units, while the high Sheet camera sits about 14–16 units from the nets. Now face rims start at 1.15 (Fold total 1.25 unchanged), and in the calm states the crease lines fade between 12 and 28 units and gain +0.04. Energy 0.1 at 480×270 (mean / 64×36 peak / max / pixels above 25): Creased Sheet 9.2 / 103 / 122 / 4.2 % → 19.1 / 192 / 220 / 29.3 %; at 320×180 the peak is 206. Brightness stays flat across energy (L.9/L.1 0.93). Fold and Shards are unchanged apart from the rim term at development < 1.

## Wave 5 (2026-10-15): paper, not wire

Three filmed rounds plus a framing correction: (1) exact analytic paper-wave derivatives replace four displaced wave evaluations per floor pixel, and lift the paper pigment; (2) distinct front/back palette-tinted paper bodies, less over-hot core/halo and quieter peak rims; (3) give every shard a persistent bank (orthonormal tangent/across frame), raise the peak target to 3.5 and keep a 1.45 peak lens. Full-size review caught near-side cap cropping, so a continuous 2.6-unit peak camera backoff now contains the funnel. It remains outside the original safety bound. Final cost polish reduces the floor grid 56×128 → 32×96: analytic normals retain the fine relief, without spending most vertices on a nearly flat dark floor. All exact hinge mathematics, net topology, instances, seeds, looks, schemas and world definitions remain intact.

Standard native p50 (states 0/1/2): 1080p **2.4/2.2/2.2 → 2.2/2.3/2.1 ms**; 4K **6.2/7.0/6.5 → 6.1/5.8/6.1 ms**. Sub-millisecond drift and occasional fleet contention are visible in the raw runs. The final same-context, alternating-frame comparison loads original scene AND geometry from `deaaae1`, takes 64 paired complete-frame samples per state, and measures 1080p **2.5/2.2/2.3 → 2.3/2.1/2.1 ms**, 4K **6.7/6.3/5.9 → 6.2/6.0/5.7 ms**. Every state is faster. Raw samples, including the earlier context-separated noisy run, are retained; this is throughput, not venue cadence.

Tests compare analytic normals with independent central differences, and check banked-frame orthogonality, unit normals and exact phase periodicity, alongside exact closure, intermediate rigidity and clearance. Evidence: fleet worker `rework-geometry/output/evidence/fold/` (baseline/final films and full-size stills, Slow Comet Ring, all-look energy ladder, ember/glacier portrait). Honest rating **8.5/10**: the arc reads and the paper survives the storm; the middle state's solids could still be more monumental.

## Final round (2026-10-15): paper and a towering storm

L0 rated the previous final around 7/10: opening nets still looked like a diagram and the storm was a small cone. Two filmed revisions: (1) lit off-white paper with palette tint, diffuse fill, soft crease shading and actual projected hero-net triangle shadows; enlarge the cone and dolly low underneath it; (2) lift the paper pigment further, reduce floor relief, separate the shadow/floor surfaces to avoid depth fighting and remove false fan-triangulation shadow seams. A filmed safety/cost correction delays the close dolly until the release is advanced, backs raised-crane looks away, reduces streak stretch 3.2 → 1.8, and reduces the floor 32×96 → 24×64 to pay for hero-net shadows. Exact hinge chains, rigid faces, identity, presets, seeds and schemas are unchanged.

Evidence: fleet worker `rework-geometry/output/final-round/fold/` (before/final films, revision strips, glacier portrait, three-palette native 1080p and native 4K stills). CPU tests cover shadow/face attribute correspondence, the directional projection, camera periodicity and peak clearance. Native paused reversal is exact and retains the same mesh buffer. **Honest revised rating: 8/10**: materially stronger opening and immersive climax, though the middle-state composition remains modest and shadows are an inexpensive approximation.

## Limits

Shadows do not darken other paper; they reproduce the floor material on projected triangles, with a barycentric penumbra and a small lift above the floor, not a physical shadow map. Shards are fan triangles of the faces, not a fracture simulation; shards may interpenetrate in the vortex. Faces have no thickness. Multi-hour Stage endurance and external 4K cadence are unmeasured.
