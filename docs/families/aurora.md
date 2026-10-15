# Aurora Veil / Polarlicht-Schleier

Family **106**, renderer `aurora`, world **`aurora-veil`**. Glow / Glühen → Curtains / Vorhänge → Corona / Korona. All eight look names, IDs, seeds, schema keys and preset values remain unchanged. No engine or registration changes in this revision.

## Round-three direction and review

The previous overhead composition was a closed radial starburst with a dark centre. The approaching arcs now unfold into three **open, returning S-folded sheets**, including a near sheet passing overhead and two receding sheets. A wider, less vertical crane keeps the zenith in the upper frame and a thin mountain/lake strip at the bottom. Perspective convergence is still real, but it no longer needs a circular luminous base or contained ragged outer silhouette.

The lower edge has a sharply filtered, fragment-space travelling hem, backed by a narrow emission layer rather than an isolated bright outline. Two filament octaves and incoherent vertical excitation add fine structure. Upper ray tips and open material ends fade smoothly. Stars remain visible between the additive sheets.

The inlet has seeded cellular pressure cracks, dark crack troughs, granular frost, filtered ice needles and stronger broken specular reflections of the actual curtain mesh. Wind-packed snow gains fine crust albedo. It is no longer just a dark purple-grey fill, although the terrain is still analytical shading rather than displaced geometry.

**Honest rating: 8/10, not 9.** A fresh 30-second Liquid Chrome reference was compared with the baseline and final contact strips and matching full-size stills. Aurora's environment, hem and ice are better resolved, but its long straight rays can still read as a procedural fan, particularly in pale palettes. Chrome's material finish remains superior. This revision does not claim photographic atmospheric transport.

## Signature mathematics and continuity

Three persistent **384 × 12 quad** material grids follow

`P(u,v) = C(u,development,phase,seed) + v L(u,development,phase) B`,

where **B = (0.035, 1, −0.025)**. Every field line is straight and parallel at every development value. Material IDs, topology and seed identity never reset on development, energy changes or reversal. `aurora-model.mjs` mirrors the shader curve, hem and camera in double precision.

- Persistent material angle: `θ = (u−0.5)·6.18 + 0.24·sheet + seedOffset`.
- Nested travelling fold: `sin(w + 0.65 sin(2w−phase))`, with `w = 2.3θ + phase + 2.3·sheet`.
- Opening arcs retain radial pleats and angular bends; the corona smoothly unfolds them into `x = 35θ + 24 sin(w)`, `z = 7 + 33·sheet + 16 sin(1.3θ + 1.7·sheet) + 0.65·ripple`, scaled by spread. The x derivative actually reverses along the curve: these are folded sheets, not monotone fan bases.
- Base height combines asymmetric 1.6θ / 4.3θ waves and a small 23θ scallop. Ray reach grows from 62 through 92 to 512 world units, before the local height modulation.
- The sub-quad hem offset is `0.005 + (1−0.5·crown)·[0.0014 sin(61τu−3phase+sheet) + 0.0008 sin(137τu+2phase)]`. Its narrow Gaussian emission uses derivative-scaled width; fine kinks do not inherit the coarse vertical mesh rows.

For camera basis R/U/F and focal length f, the exact field-line vanishing point is `f·(B·R,B·U)/(B·F)`. Tests independently project finite endpoints and the infinite-height limit. Development uses C1 smoothstep morphs; no state switches, image dissolves or respawning.

## Rendering and landscape

The full-resolution mesh draws **165,888 additive vertices**, including exact y-reflected copies: approximately **2.53 MiB** per seed. No volume march, reduced-resolution visual pass or engine extension. A larger far plane includes the extended ray tips in all saved height settings.

Footprint-filtered Gaussian hair and a second filament octave retain structure when the finest rays become sub-pixel. Vertical excitation is decorrelated between rays, avoiding coherent horizontal shimmer bands. Corona concentrates broad emission near the hem instead of filling long spotlight wedges. Distance and sheet-index attenuation separate near/far layers. Primary colours the low emission, secondary the upper rays; accent remains confined to the hem and sparse rhythm gestures. All colour is palette-derived. Native 960×540 float-picture peaks are approximately **1.89 / 2.67 / 3.89** in Glow / Curtains / Corona; the corresponding above-one populations are **872 / 999 / 8042 pixels**, not full-frame flashes.

Two mountain ranges, snow caps, winding banks, drift normals, granular crust and a multiscale star field remain. A bounded 3×3 seeded nearest-two-cell query forms irregular pressure-crack bisectors beneath the ice. Derivative filtering and distance loss keep fine frost/needles from becoming unresolved sparkles.

The actual mirrored curtain geometry supplies the lake's specular image. Fresnel, shore masking, frost-dependent attenuation, perturbed material coordinates and averaged fine filaments break it up. This is an inexpensive rough-ice approximation, **not** a microfacet convolution. Snow and mountains have no true displaced silhouettes or cast shadows.

## Camera, states and looks

A closed, roll-free x/z camera path provides parallax; eye height grows from 2.2 to 3.0 plus ±0.16 drift. Pitch develops **0.30 → 0.38 → 0.78 radians** and focal length **1.22 → 1.22 → 0.80**. In the default Corona framing the zenith is around short-side y=0.85 and the horizon around y=−0.79, retaining a landscape scale cue instead of removing the world below. The yaw-defined right vector is continuous. Kick focal punch stays bounded at **1.8%**. Projection uses the short side and was reviewed in portrait as well as landscape.

| Look | Development / composition |
| --- | --- |
| Glow | 0: full-sky distant hems over the frozen inlet |
| Curtains | 1: deep travelling folds and finely structured vertical rays |
| Corona | 2: near overhead sheet, layered receding curtains and upper-frame zenith |
| Icebound Arc | 0.25: wider, lower-reaching, slower curtains |
| Silent Meridian | 0.8: narrow composition, tall rays, restrained folds |
| Pleated Night | 1.15: wide, dense, strongly pleated curtain |
| Zenith Bloom | 2: narrow, high-reaching overhead perspective |
| Magnetic Thaw | 1.65: wide intermediate crane, strong frozen reflection |

The world states retain **seed 1061 and identical non-development parameters**. Energy changes travel speed (×0.75–1.35) and filament detail, never exposure or development. Three bounded 4/8/16-beat gestures remain: Ray packet, Upward fold, Polar hem.

Two integrated **2π-periodic** clocks own material travel (`0.22·travel`) and camera movement (`0.025`). Every phase use is periodic; no shader `u_time` or rate-change re-anchoring. Native paused reversal **0.7 → 1.83 → 0.7** has zero differing float-picture values and keeps the same mesh object. Native wrap/rate checks pass 3600, 4096 and 43200 seconds.

## Measured cost

Native headless Chrome 155 / ANGLE Metal / Apple M3 Pro; 12 synchronous samples per state, energy 0.95, including post. Baseline is **c161fd1**, measured before this revision. Shared-machine throughput, not external-display cadence qualification.

| State | 1080p p50 baseline → final | Final p95 | 4K p50 baseline → final | Final p95 |
| --- | --- | --- | --- | --- |
| Glow | 2.9 → **3.3 ms** | 3.6 ms | 6.8 → **8.8 ms** | 9.7 ms |
| Curtains | 2.5 → **3.2 ms** | 4.0 ms | 7.1 → **10.3 ms** | 11.3 ms |
| Corona | 3.1 → **3.8 ms** | 4.6 ms | 8.4 → **12.5 ms** | 13.6 ms |

Richer full-resolution frost/cracks and longer overlapping rays increase cost. All three states pass this new world's assigned **≤8 ms / ≤16 ms** p50 limits. Supplemental eight-look profiles also pass. No GL/GPU errors or non-finite uploads.

## Verification and visual rounds

- `node --test tests/aurora.test.mjs tests/time.test.mjs`: **24/24 pass**. Tests cover field-line parallelism/convergence, C1 periodic/reversible folds, actual returning S-folds, travelling hem bounds, shader/model coefficients, mirror law, full-width opening, open corona/horizon framing, camera continuity, landscape filtering, presets and rhythm. World lookup is explicitly `worlds.find((w) => w.id === "aurora-veil")`, never registry position.
- Native **108 late-time frames**: nine development values, two energies, three palettes and two late epochs; zero errors. Float-picture reversal and HDR probes, portrait states, three-palette Curtains and native 4K Corona inspected.
- Typecheck, build and native DE/EN i18n smoke pass. Full CPU suite: **746 pass, 9 skip, 3 expected baked-preview/editorial failures** in untouched catalog tests. Integration owns baking/curation.
- Baseline + reference + **eight filmed revisions**: open sheets/wide crane and hem; integrated lower emission/cellular ice; finer kinks/near-sheet placement; longer tips/depth attenuation; second filament octave/wider span; true returning folds/reduced upper broad fill; overhead near-sheet placement; final frost anti-aliasing. Superseded MP4s were deleted; all iteration strips remain.
- Final eight-look energy ladder, Glacier extra-look film and Ember reverse film reviewed.

Evidence is under the worker's absolute `output/round3/`; exact paths, branch and final commit are in `output/report.md`.

## Remaining limits

Still **8/10**: the long field-aligned rays retain a graphic fan-like read in some phases and palettes. Fine hem motion and ice detail are stronger, but natural aurora has richer volumetric excitation and irregular thickness. Mountains remain soft analytical silhouettes and snow/ice are shaded planes. Low projector contrast suppresses the terrain. No physical 12-hour endurance or venue-cadence acceptance is claimed.
