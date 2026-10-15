# Magma Rift · Magmariss

**EXPLORATORY / EMPIRICAL**, worlds wave 4, round 2 (2026-10-15). Family `magma`, number **104**, world `magma-rift`.

## Algorithm and signature

A continuous volcanic field: the same basalt plates split into rivers and sink into an erupting lake. The signature is the raised, individually tilted Voronoi crust, flowing skins between its plates, and a towering incandescent curtain throwing ballistic ejecta beneath underlit ash.

- **Plates:** seeded sites jitter within `[0.1, 0.9]²` of their lattice cell. A cached 3×3 search finds the nearest site, then the minimum bisector distance `dot((a+b)/2, b-a)/length(b-a)`. This is the seam distance, not the usual F2−F1 approximation. Tests compare 60,000 probes against a 7×7 search. Sites, tilt and plate height never depend on development.
- **Terrain:** a shield inside a layered caldera; a coarse Lipschitz march finds an upper surface, followed by bracketed Newton steps through the actual slab/lava field. Plate tops stay below the tested 0.18-unit bound. Seam widths grow preferentially along five meandering radial rivers with eight outer distributaries. Lake plates sink by site, as whole plates.
- **Flow:** two advected material-coordinate layers, periodic around the vent, reseed only at zero weight. Ropy cooling skins visibly stream outward; the hotter liquid shows between them. The lake carries larger domain-warped floes on a slow rigid turn, with travelling thermal undulations between them.
- **Curtain:** seven overlapping, smooth Gaussian jets, up to 9 units high at the world defaults, spread toward a 3.3-unit crown. Domain-warped billows travel upward; rare hotter patches carry the accent. Kernels taper smoothly to zero between 3.4 and 4 core widths. A conservative shared bound and per-jet width bounds skip invisible turbulence evaluations.
- **Ejecta:** 14 large bombs and 32 spray candidates follow exact `p(t)=p₀+v₀t−½gt²ŷ`, with `g=7`. Large launch speeds are 8.5–11 vertical and 0.9–2.1 horizontal, scaled by √force; the cycle is 4.6 physical seconds. Every supported flight lands before its next launch. Three trail chords retain the parabola's shape. Conservative trail spheres include the `g Δt²/8` chord deviation; group spheres reject whole populations.
- **Ash:** ten ray-cylinder/slab-bounded volume samples, with smooth billow density and palette light falling off upward from the lake/fountain. Integer phase harmonics replace two expensive reseeded noise layers. Limited spatial dither hides sampling bands without a temporal flicker.
- **Embers:** bounded near-camera cell traversal. Embers rise, fade at the ends of their lives, and drift outward toward the orbiting camera. At peak, the layer extends above camera height.
- **Heat shimmer:** a subtle, smooth refractive displacement over the hot field, not camera shake. Only a seeded subset of cracks receives an additional bounded kick flare.

Colour is a temperature ramp through secondary, primary, rare accent and a white mix; there are no fixed volcanic RGB colours. Float emission feeds shared bloom. Phosphor, Ember and Glacier films were inspected.

## Data pass and fallback

A **128×129 RGBA32F** pass runs each frame. Row 0 contains ejecta/group bounds. Rows 1–128 contain seed-only plate hashes for cells `[-64,63]²`, indexed as `(cell.x+64, cell.y+65)`. This contains the whole finite terrain field, including neighbours at minimum plate size. Material cells outside the tile retain the procedural hash path. This is data, not a reduced-resolution picture or an approximation of geometry.

Hosts without float targets retain the procedural sites and ejecta path. A native 320×180 cached-versus-fallback comparison at all three states and energies 0.1/0.9 found tiny aggregate differences (mean ≤0.0083 of a byte level), but **not bit identity**: 9–40 pixels changed per frame, maximum channel difference 101 on isolated seam pixels. Separate shader compilation can affect floating-point near-ties. Both paths had zero GL errors/non-finite uploads. This is a known precision limit, not a strict image-identity claim.

## States and looks

World states share seed **10401** and all non-development parameters.

| Development | State EN / DE | Look EN / DE | Form |
| --- | --- | --- | --- |
| 0 | Crust / Kruste | Breathing Crust / Atmende Kruste | Raised dark basalt slabs; thin breathing seams, heat shimmer and occasional kick flares |
| 1 | Rivers / Flüsse | Seam Rivers / Nahtflüsse | Wider channels carry liquid and drifting cooling skins between the same slabs |
| 2 | Eruption / Ausbruch | Lava Fountain / Lavafontäne | Plates sink into a 6.2-unit-radius seething lake; a tall curtain, ballistic trails, ash and foreground embers |

Five additional looks (no names changed in round 2):

| Look EN / DE | Development | Composition |
| --- | --- | --- |
| Black Glass / Schwarzes Glas | 0.35 | Large plates, low camera, slow flow |
| Ember Delta / Glutdelta | 1.3 | Fine channels, high view, many embers |
| Night Fountain / Nachtfontäne | 2 | Stronger/taller curtain, low camera; force-aware crane-back keeps it framed |
| Ash Column / Aschesäule | 1.75 | Broad plates, high orbit, cooler partial eruption |
| Rift Lattice / Rissgitter | 0.9 | Small plates, high view, fast material flow |

Development changes widths, lava level, plate sinking, lake radius, curtain height and camera composition continuously. It neither changes seed nor resets any phase; reversal uses exactly the same field.

## Energy, music and camera

- Energy changes flow speed (×0.65–1.45), orbit speed (×0.75–1.4), ember population and ejecta population/rate. It is not a master-brightness control. State 0 remains a readable, dark breakdown at energy 0.1.
- **Seam pulse**, 4 beats: an outward heat ring in the existing seams.
- **Lava surge**, 8 beats: fresh liquid thins the cooling skins.
- **Ejecta volley**, 16 beats: a bounded curtain surge, hotter existing ejecta and more embers.
- Kick FOV punch is **2%**; roll is at most **0.03 rad**. Crack flares are local, never a full-screen flash.
- Camera: slow endless orbit and a smooth 16-bar phrase-scale crane. Default radius grows from 7.6/8.6 to 12.8 units as the lake erupts. Above force 1, the peak radius increases by 12 units per additional force unit and the aim rises accordingly. It remains above the terrain and outside the large ejecta landing zone. Perspective, atmospheric depth, seam/lake lighting, grazing glass sheen and small embers provide scale cues.

## Endlessness

Three integrated engine clocks: orbit (2π), material flow (16 cycles) and eruption (64 cycles). Rate changes alter speed, not phase. All shader uses respect those periods, including the half-frequency ash harmonics and ember cohorts. Early authored time products remain behind the `PHOSPHOR_LATE` guard; late/rate-changing operation uses clocks. No simulation can go stale.

Native seam checks passed 3600, 4096 and 43,200 seconds for Crust, Rivers, Eruption and Night Fountain. Source/CPU time tests also pass. This is a seam probe, not a 12-hour wall-clock soak.

## Cost

Native headless Chrome, ANGLE Metal, Apple M3 Pro; synchronous whole-frame throughput including post, 12 measured frames per state. Five workers shared the machine, so these are indicative, not venue cadence guarantees.

| Resolution | Crust p50 / p95 | Rivers p50 / p95 | Eruption p50 / p95 |
| --- | --- | --- | --- |
| 1920×1080 | 4.9 / 5.4 ms | 5.8 / 6.1 ms | 6.4 / 6.5 ms |
| 3840×2160 | 17.1 / 17.2 ms | 20.1 / 20.3 ms | 23.3 / 23.9 ms |

1080p meets the 8 ms family budget in the final probe. **4K remains over 16.67 ms**; no downscaling or reduced-resolution visual cache is used. Earlier concurrently loaded probes were slower, up to 11.4 ms / 40.3 ms for Eruption before the final per-jet kernel cull.

## Verification and review

- `tests/magma.test.mjs`: Voronoi nearest sites/seams against brute force, seam continuity, identity under development, slab upper bound, exact ballistic motion and landing/cycle bounds, trail spheres, camera clearance, hash-tile addressing, conservative compact-support curtain bounds, ash periodicity, force-aware framing, presets, world continuity, clocks, palette/kick/style limits and three gestures.
- `node --test tests/magma.test.mjs tests/time.test.mjs`, `npm run typecheck`, native `npm run test:i18n` pass.
- Full root test suite: 668 pass, 9 opt-in skips, three expected failures only: missing baked magma previews and missing editorial curation coverage/order. L0 owns those generated/shared files; they were not edited.
- Ladder: `artifacts/contact/magma-r2-ladder/index.html` (all eight looks × energies 0.1/0.5/0.9), zero GL/non-finite errors.
- Final films/strips: `artifacts/films/magma-r2-final/` — `magma-rift`, `magma-rift-ember`, `magma-rift-glacier`, `magma-night-fountain-ember` (`.mp4` and `.png`). Default films are 960×540, 30 seconds.
- Additional portrait/fallback/late-state evidence: `artifacts/checks/magma-r2/`.

Review rounds: (1) replace the tiny central jet with a much taller multi-jet curtain and higher/longer ballistic trails; (2) widen the crown and lake, enlarge/warp the floes, reduce accent saturation and add conservative bounds; (3) remove hard chord/height seams, smooth the plume, lift the aim and frame high-force looks; (4) cache plate hashes and simplify/locally cull billows to recover the 1080p budget. Films and individual stills were opened after each main visual round.

## Wave 5 rework · 15 October 2026

All world/look IDs, names, seeds, schema keys and preset values are preserved. No world-definition/HISTORY or engine edits.

Filmed rounds: (1) replaced the lake's second Voronoi web with advected pahoehoe material and reserved accent for hotter matter; (2) separated dense tapered liquid jets from darker billowing ash, tightened the jet support bound to 0.50 and broadened liquid tears; (3) refined lake fold scale/temperature and basalt key, and skipped nearest-site searches in the provably fully molten centre; (4) rejected the overly graphic zebra-like intermediate lake by breaking its folds with periodic advected scum and reducing thermal contrast. Final optimization skips plate data outside the finite basalt field (valid inert Plate, zero rock gradient), not geometry or visual resolution.

The molten-centre proof uses maximum slab height `0.175 − 0.32 < 0.075`, maximum nearest-site offset `< 0.9√2 < 1.6` cells and a radius margin through the entire sinking transition. It applies **only when lake amount = 1**, never at a shore or during partial sinking. Shading still obtains real plate data when needed; it cannot reuse an unfilled record. CPU regression covers this proof and the new tapered width bound. Lake turn/flow remains 16-cycle-periodic; all original Voronoi/ballistic/identity tests remain.

### Performance qualification

The shared machine varied substantially (the known wave-4 ~23 ms Eruption became 36–46 ms during this lane). Standard required 30-frame probes were run before edits: 1080p **6.2/10.1/10.8**, 4K **30.4/33.3/45.6** ms. Sequential later probes were noisy enough to make unchanged Crust arithmetic vary by >20%; all raw reports are retained rather than claiming those differences as shader gains.

An additional optional `scripts/profile-rework-pair.mjs` alternates baseline `deaaae1` and final in ABBA blocks, 64 measured frames/candidate, same Chrome/GPU, to control fleet contention. Final qualification:

| State | Interleaved 1080p baseline → final p50 | Interleaved 4K baseline → final p50 |
| --- | --- | --- |
| Crust | 8.1 → 8.5 ms | 27.7 → 27.1 ms |
| Rivers | 9.3 → 9.3 ms | 32.3 → 32.2 ms |
| Eruption | 10.1 → 9.5 ms | 41.9 → 39.5 ms |

Every median is within +5%; Eruption is cheaper at both resolutions, not raised. This is a **relative throughput result, not a claim of ≤23 ms or venue cadence under current contention**. Final 4K p95 33.0/33.7/53.6 ms. No downsampling, extra loop populations or higher march caps.

Evidence root: `/Users/fabian/Development/phosphor/.fleet/phosphor-worlds-wave5-20261015162322/workers/rework-wave4/output/magma/`. Baseline `baseline/magma-rift.{mp4,png}`, final `final/magma-rift.{mp4,png}`; Ember Night Fountain, Glacier reverse world, all-look ladder, full-size Eruption still, three-palette/portrait states and 4K still. The native verification script passes 60 intermediate-development/low/high-energy/12-hour cases, zero errors. Superseded films removed. Honest rating: **8/10** — improved material separation and performance, but the seven analytic jets and marbled lake still read stylised rather than physically convincing enough for 9.

## Remaining limits

This is stylised volcanism, not a fluid/thermal simulation. The lake still exposes its cellular construction, and the curtain can read as palette-coloured fire rather than dense falling liquid. The broad ash deck may extend beyond the frame naturally. Volume dither remains visible in close stills; faint distant terrain can show small seam sparkles. 4K is not within a 60 Hz single-family budget. No venue or human art sign-off is claimed.
