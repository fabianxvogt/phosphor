# Aurora Veil / Polarlicht-Schleier

Family **106**, renderer `aurora`, world `aurora-veil`. One continuous polar-night world: a low auroral arc above a frozen lake grows into folded curtains, then the camera looks up into an overhead corona. Eight looks, no engine extensions, no simulation or volume march.

## Signature mathematics

Three persistent material grids, each **384 × 12 quads**, carry the whole arc. A material ray is

`P(u,v) = C(u,development,phase,seed) + v L(u,development,phase) B`,

with **B = (0.035, 1, −0.025)**. Every ray is straight and parallel to the same magnetic field; this remains true through every fold and intermediate development. The ray ends vary with material coordinate, never by respawning particles. `aurora-model.mjs` mirrors the actual shader position law and camera in double precision.

The base curve is an open, folded polar arc. Its material angle opens continuously from **2.6 to 5.95 radians** while its centre approaches from the horizon and its base rises overhead. Radius, vertical extent, bend and camera pitch develop geometrically, not through an image crossfade. The characteristic nested fold is

`kink = sin(w + 0.65 sin(2w − phase)), w = 5θ + phase + 2.3 sheet`.

A second angular bend `0.11 rise fold sin(8θ − phase + sheet)` creates genuine pleats rather than a rigidly translated sine ribbon. Folds are authored travelling geometry, not a magnetohydrodynamic solver or inextensible cloth simulation.

### Zenith convergence

For camera basis R/U/F and focal length f, perspective maps a point q relative to the eye to `f (q·R, q·U)/(q·F)`. All parallel B-lines therefore share the exact vanishing point

`z = f (B·R, B·U)/(B·F)`.

At Corona the camera points nearly along B. The same formerly upright rays now converge around the dark magnetic zenith in perspective. The CPU tests independently project finite ray endpoints, check that their supporting image lines contain z, and check their asymptotic limit. This is actual perspective convergence, not a screen-space radial-starburst overlay.

## Rendering, colour and depth

The existing mesh path draws **165,888 additive vertices**, including the mirrored population; four floats/vertex, about **2.53 MiB** per seed. All geometry remains full resolution. The background analytically draws stars, distant snow ridges, shaded wind-cut banks and sparse stress lines in the ice.

Field-aligned Gaussian filaments sit in a broader soft emission layer. Irregular phase warping and material gaps avoid uniform electric-wire spacing. Output derivatives broaden unresolved ray cores while conserving their approximate integrated power; unresolved edge-on sheet slivers fade instead of sparkling. Primary lights the lower layer, secondary tints the higher rays, and accent appears only on a small rhythmic subset of the hem. All colour comes from the palette and black/white mixtures. A native float-target probe measured **1.09–1.10 HDR peak** in Curtains across Phosphor, Glacier and Ember: rare hot rays feed bloom, not a full-frame flash.

Each sheet has depth falloff and view-dependent optical thickness, exposing its folds. Nearby/far sheets move differently under the camera's closed lateral/dolly/crane path. Perspective/parallax, atmospheric attenuation, folds, scale cues and the lake establish depth. There is no opaque curtain surface that needs a Lambertian key: these are emissive sheets; the snow has a soft directional key and rim.

The ice draws the **same material geometry with y reflected**, not a separate procedural approximation. Its floor intersection gates reflection against the winding snow banks; a Fresnel weight, faint frost modulation and distance loss soften the mirror. Stars are reflected faintly as well. The reflection is sharp and stylized, not rough microfacet integration.

## States and looks

The three world states share **seed 1061** and identical non-development parameters.

| EN | DE | Development / composition |
| --- | --- | --- |
| Glow | Glühen | 0: faint low arc, stars, snow banks and soft lake reflection |
| Curtains | Vorhänge | 1: tall pleated sheets and travelling field-aligned rays, fully mirrored |
| Corona | Korona | 2: overhead folded corona, parallel rays converging at the magnetic zenith |
| Icebound Arc | Eisbogen | 0.25: broad, low, slowly travelling arc |
| Silent Meridian | Stiller Meridian | 0.8: narrow composition, tall rays, restrained folds |
| Pleated Night | Gefaltete Nacht | 1.15: wide, densely rayed, strongly folded curtain |
| Zenith Bloom | Zenitblüte | 2: narrower high-reaching corona and a higher look angle |
| Magnetic Thaw | Magnetische Tauzeit | 1.65: wide low approach to the crown, strong lake mirror |

## Camera, energy and rhythm

A slow periodic camera moves x ±0.8, z ±0.65 and y 1.25 ±0.12, without roll or cuts. Development tilts continuously from 0.12 through 0.22 to **1.51 radians**. A bounded FOV opening during the crane keeps intermediate sheets composed; the top hero normally occupies about **70–80% of the short side**. CPU checks bound its full phase-cycle framing. Portrait retains the same short-side projection. Kick focal punch is **1.8% maximum**.

Energy changes travel speed (×0.75–1.35) and filament detail, never multiplies exposure or changes development. Every energy works at every development. Three bounded family gestures act on the actual signature:

- **Ray packet / Strahlenpaket**, 4 beats: a local material cohort receives an excitation.
- **Upward fold / Aufsteigende Falte**, 8 beats: a soft excitation runs up the existing field lines.
- **Polar hem / Polarsaum**, 16 beats: only a few existing lower-edge folds receive accent.

## Continuity and endlessness

Material IDs `(sheet,u,v)` and mirror IDs are fixed. Geometry rebuilds only on seed change, as in the existing engine contract; development never changes topology or clocks. Two integrated clocks own travel (0.22 × travel radians/s) and camera (0.025 radians/s), both with **2π periods**. Every phase use is periodic; no `u_time` arithmetic, accumulating positions, resets or dying simulation. Changing energy/faders changes speed without a phase jump. Reversal retraces the same geometry.

Native float-picture comparison of paused development **0.7 → 1.83 → 0.7** is pixel-identical, with the exact same mesh object. Final output may have the compositor's ordinary ±1-level temporal dither; the scene's linear picture is identical.

## Measured cost

Headless Chrome / ANGLE Metal / Apple M3 Pro, 12 synchronous samples/state, energy 0.95, including post-processing. These are shared-machine throughput measurements, not external-display cadence qualification.

| State | 1080p p50 / p95 | 4K p50 / p95 |
| --- | --- | --- |
| Glow | 2.0 / 2.6 ms | 5.7 / 5.8 ms |
| Curtains | 2.1 / 2.9 ms | 6.1 / 6.6 ms |
| Corona | 2.0 / 2.7 ms | 5.5 / 6.1 ms |

Every state is comfortably below the new-world 8 / 16 ms median budgets. Zero GL errors and non-finite uploads in both profiles. There are no fragment loops or sampled volumes; mesh topology is fixed and bounded.

## Verification and visual review

- `node --test tests/aurora.test.mjs tests/time.test.mjs`: 19 passing tests. Exact field-line parallelism, finite-ray vanishing-point collinearity and asymptotic limit, periodic/non-rigid folds, seed/material identity, development continuity, reflected-ray law, camera clearance/framing, shader/model coefficients, preset/world validation, rhythm and late clock continuity.
- `PHOSPHOR_HEADLESS_RIG=1 node scripts/verify-aurora.mjs --port 48501`: 108 cases across nine developments, energy 0.1/0.9, three palettes and 3600/43200 seconds; exact paused reversal, portrait states, 4K still and three HDR probes. Zero GL/non-finite errors.
- `check-time-wrap --rig --families aurora --port 48501`: no seams/errors at 3600, 4096, 43200 seconds or late energy/fader changes.
- Reviewed the first working film, then **five** improvements: open arcs/framing, irregular multicolour rays/snow, brighter opening/true angular folds, footprint AA/intermediate crane framing, and soft plasma/edge-on coverage polish. Superseded rounds are deleted to save disk; initial and final evidence are retained.
- Full eight-look energy ladder reviewed, plus 30-second Glacier extra-look and Ember reverse films, three-palette stills and portrait/4K frames. Final evidence paths are recorded in the fleet worker's `output/report.md`.
- Typecheck, build, targeted CPU/dictionary tests and native German/English i18n smoke pass. Full CPU suite: **741 pass, 9 skip, 3 expected catalog preview/curation failures**. `npm test`: **747 pass, 15 skip, the same 3 failures**. The untouched preview/editorial files intentionally do not yet contain Aurora's eight new looks; integration owns their regeneration.

## Limits

A deliberately composed, stylized polar night, not photographic atmospheric transport. The opening is quiet and needs sensible projector black levels. The overhead crown can read as a luminous pleated sculpture in very pale palettes; the perspective and parallel rays are nevertheless exact. Snow is analytic shading, not a fully raymarched terrain; the lake has a sharp/frost-modulated mirror, not rough refraction. Extreme fold tangencies lose subpixel detail intentionally. No venue cadence or 12-hour physical endurance run is claimed.
