# Aurora Veil / Polarlicht-Schleier

Family **106**, renderer `aurora`, world `aurora-veil`. Glow / Glühen → Curtains / Vorhänge → Corona / Korona. Eight saved look names, IDs, seeds, schema keys and preset values are unchanged. No engine changes.

## Round-two visual direction

The original low strip and contained flower-shaped corona failed the photographic composition target. The revised world places the viewer inside three enormous, receding auroral curtains above a frozen inlet. The opening already spans the full sky; development deepens the travelling folds and increases ray reach, then a continuous crane tilts overhead until the landscape leaves the frame. Corona is an environment crossing all four frame edges, not a framed object.

Liquid Chrome was filmed alongside the baseline and final aurora. The revision is substantially stronger, but **8/10**, not 9: its mathematically straight rays remain more graphic than photographic, particularly in pale palettes. The snow is shaded analytical relief rather than a full terrain mesh.

## Signature mathematics

Three persistent **384 × 12 quad** material grids are extruded along one magnetic field:

`P(u,v) = C(u,development,phase,seed) + v L(u,development,phase) B`,

with **B = (0.035, 1, −0.025)**. Every ray stays straight and parallel through all development values; no particle respawns, topology changes, simulation resets or image-state dissolves. `aurora-model.mjs` mirrors the shader's curve and camera in double precision.

- Material angle: `θ = (u−0.5)·6.18 + 0.24·sheet + seedOffset` throughout the arc.
- Nested travelling fold: `sin(w + 0.65 sin(2w−phase))`, where `w = 2.3θ + phase + 2.3·sheet`.
- Radial pleat amplitude grows from 3 to 9; a second angular bend `0.17·fold·sin(5θ−phase+sheet)` produces actual S-folds, not a rigidly moving texture.
- Lower-edge height combines asymmetric 1.6θ / 4.3θ waves and a small 23θ scallop. This avoids a regular bar-graph hem or symmetric flower.
- Base radii range from 32/52/72 to 26/44/62 world units; extrusion reach develops from 62 through 92 to 272, before local height modulation. Curtains retain their material identities while the camera enters their overhead perspective.

For camera basis R/U/F and focal length f, the parallel field lines have the exact common vanishing point `f·(B·R,B·U)/(B·F)`. Tests independently project finite ray endpoints and their infinite-height limit. This is genuine perspective convergence, not a radial screen-space overlay.

## Rendering, landscape and colour

The full-resolution mesh path draws **165,888 additive vertices**, including the exact y-reflected material population: about **2.53 MiB** per seed. No volume march, fragment loops, external assets or reduced-resolution visual passes.

Dense, irregular Gaussian filaments sit inside broad soft emission. Derivative footprints filter unresolved rays and nearly edge-on slivers. Higher rays fade upward with a variable reach envelope. Primary colours the low layer, secondary the upper layer; accent is confined to a thin lower-edge fringe and the sparse Polar hem gesture. Colour comes only from palette uniforms and black/white mixtures. Native Curtains HDR peaks are **1.118 / 1.130 / 1.128** in Phosphor / Glacier / Ember, with only 15–20 pixels above 1 at 960×540 in the probe.

The landscape includes two mountain ranges, snow-cap facets, winding snow banks, wind-cut drift normals, granular frost and three warped families of ice stress cracks. A multiscale, footprint-filtered star field and faint dust-modulated galactic band provide the sky's scale. All are stable in world coordinates.

The lake reflects the same curtain geometry. Frost perturbs the reflected material coordinates, attenuates patches and averages its fine filament cores; Fresnel, shore masking and distance loss further break up the image. This is a cheap rough-ice approximation, **not** physically integrated microfacet reflection. The snow's analytical height derivatives provide a soft key light and raised shore rim; the mountains provide atmospheric occlusion and snow-lit crests.

## Camera, states and looks

The roll-free camera has a slow closed x/z path (±1.4 / ±1.1). Its height grows from 2.2 to 3.0, plus ±0.16 drift. Pitch develops smoothly **0.30 → 0.38 → 1.50 radians**. The yaw-defined right vector stays continuous even when an extra look's tilt passes the zenith; a world-up cross product would flip there. Kick focal punch remains bounded at **1.8%**. Short-side projection works in portrait and landscape; the corona deliberately extends beyond the frame.

| Look | Development / composition |
| --- | --- |
| Glow | 0: broad luminous lower hems above the snowy inlet, long fading rays |
| Curtains | 1: deeper S-folds, taller and more structured travelling sheets |
| Corona | 2: full overhead sky; field-aligned rays converge toward the zenith, ground gone |
| Icebound Arc | 0.25: wider, lower-reaching, slower curtains |
| Silent Meridian | 0.8: narrow composition, tall rays, restrained folds |
| Pleated Night | 1.15: wide, densely rayed, strongly pleated curtain |
| Zenith Bloom | 2: narrow, high-reaching overhead perspective |
| Magnetic Thaw | 1.65: wide intermediate crane, strong frozen reflection |

The three world states retain **seed 1061 and identical non-development parameters**. Energy changes travel speed (×0.75–1.35) and filament detail, never exposure or development. Three bounded signature gestures remain on 4/8/16 beats: Ray packet, Upward fold, Polar hem.

## Continuity and endlessness

Fixed material IDs `(sheet,u,v,mirror)`; geometry rebuilds only on seed change. Two integrated **2π-periodic** clocks own material travel (`0.22·travel`) and camera movement (`0.025`). Every clock use is periodic; no shader `u_time`, unbounded accumulation or rate-change phase jumps. Development reversal retraces the same geometry.

Native float-picture reversal **0.7 → 1.83 → 0.7** is exactly identical (zero differing values), with the same mesh object. Native wrap checks pass 3600, 4096 and 43200 seconds, including late energy/fader changes.

## Cost

Headless Chrome / ANGLE Metal / Apple M3 Pro, 12 synchronous samples/state, energy 0.95, including post. Baseline is commit `b28eafa`; figures are shared-machine throughput, not venue cadence qualification.

| State | 1080p p50 baseline → final | Final p95 | 4K p50 baseline → final | Final p95 |
| --- | --- | --- | --- | --- |
| Glow | 2.0 → 2.7 ms | 3.4 ms | 4.5 → 6.9 ms | 7.0 ms |
| Curtains | 1.8 → 2.2 ms | 3.5 ms | 4.9 → 7.0 ms | 7.2 ms |
| Corona | 1.6 → 3.3 ms | 5.1 ms | 4.2 → 8.5 ms | 9.0 ms |

The larger sky coverage and textured landscape increase cost over the small original. Every state remains below this lane's **8 ms / 16 ms** limits. Zero GL errors, GPU errors or non-finite uploads.

## Verification and review

- `node --test tests/aurora.test.mjs tests/time.test.mjs`: **22/22 pass**. Field-line parallelism/convergence, non-rigid periodic folds, exact shader/model coefficients, seed identity, Lipschitz development continuity, reflection law, camera clearance, all-edge corona coverage, tall/full-width opening, pole-safe camera basis, landscape/filtering guards, presets, world recognition, rhythm and 12-hour clocks.
- Native verification: 108 late-time frames across nine development values, two energies and three palettes; three HDR probes; exact reversal; portrait states and native 4K Corona. Zero GL/non-finite errors.
- Baseline plus **six** revised films: sky span/crane; landscape/palette/rough reflection; sweeping hems and variable reach; dense filaments/peripheral corona folds; asymmetric folds/longer zenith reach; final snow-cap and pole-safe-camera polish. Intermediate films were removed after preserving a strip montage.
- Final full eight-look energy ladder, Glacier extra-look film, Ember reverse film, portrait and three-palette stills reviewed.
- Typecheck, build and native DE/EN i18n smoke pass. Full CPU suite: **744 pass, 9 skip, 3 expected preview/editorial failures** in untouched catalog tests. Integration owns preview baking/curation.

Evidence lives in the worker's `output/round2/`; exact absolute paths and final commit are in `output/report.md`.

## Remaining limits

A stylized polar-night renderer, not atmospheric transport. The corona can still read as a graphic convergence of light rather than natural plasma, and the broad near-ice image is an approximation rather than a convolutional blur. Mountain silhouettes are analytical; snow shading has no true displaced silhouette. Low projector contrast weakens the land and faint galactic band. No claim of external-display cadence acceptance or a physical 12-hour endurance run.
