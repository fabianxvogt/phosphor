# Phosphor evidence log

Append-only, newest first. Each entry records what was executed and observed, labelled `FORMAL`, `EMPIRICAL`, `REPORTED` or `SPECULATIVE`. Entries are bounded observations, not certifications. Reference and limits: [docs](README.md).

## Worlds wave 1 2026-10-14

**INCREMENTAL / EMPIRICAL.** Owner direction: grow Worlds to ten excellent continuous worlds with a stronger 3D direction, consistent with a new [style guide](worlds/STYLE.md) and [world contract](worlds/CONTRACT.md). Five parallel lanes delivered `nebula` (#87, particles, 512×256 state), `crystal` (#90, instanced mesh), `descent` (#93, raymarched, Flight untouched), `fibration` (#96, exact Hopf fibres as tube mesh) and `mycelium` (#99, Gray–Scott terrain sharing acid's step; acid's shaders byte-identical, 36 pixel comparisons at max difference 0). No engine changes. Hopf and Fourspace now integrate rotation phase so energy changes no longer jump the picture (identical at constant parameters). Show: Autopilot develops continuous worlds (build → next state over 8 bars, drop → top state from the next beat within one bar, breakdown → first state, otherwise neighbour walk; drops/breakdowns may redirect a running morph; world start hands development to Autopilot after the entry transition). `validateWorlds` upgrades untouched authored prefixes and earlier authored definitions (HISTORY). Review films: `scripts/world-film.mjs`; headless real-GPU harness: `PHOSPHOR_HEADLESS_RIG=1`.

**Verification:** 591 tests pass (new: per-family CPU references such as Gauss linking number 1 for sampled fibre pairs, camera clearance for cavern/descent paths, Gray–Scott field survival on sudden state jumps, auto-development drop/build/breakdown/walk); typecheck, format, build, `check:dist` and `test:stage-output` pass. Serial native-GPU throughput (M3 Pro, whole frame incl. post, p50, 30 frames; machine otherwise idle of lanes): 1080p nebula 2.3–2.5, crystal 3.1–3.5, fibration 3.0–4.3, mycelium 3.8–3.9, descent 7.6–9.8 (flight 6.4–9.9) ms; 4K nebula 9.5–10.3, fibration 9.1–10.8, crystal 12.9–13.2, mycelium 16.4–17.2, descent 31.9–42.6 (flight 25.3–43.9) ms. Throughput, not venue cadence. Owner reviewed the 30-second films and accepted the wave. Known weaknesses per family are listed in each `docs/families/<id>.md`.

## Look/Performance grip alignment 2026-10-12

**INCREMENTAL / EMPIRICAL.** The upper desktop grip used the resize anchor instead of the centre of the authored rail, placing it 7.55px too high at 1440×1800. Its position now comes from the midpoint between the mapped Look bottom and Performance top. Frame artwork, resize anchors and saved preferences are unchanged.

**Verification:** the geometry probe failed before the fix and passed afterward across 48 viewport/split/height combinations. All seven panel-layout tests pass. Browser inspection confirmed a centre error below 0.02px before and after keyboard resizing, and the focused grip is visually centred. Independent review found no issues with drag scaling or persistence.

## Fresh-window updates and rhythm track names 2026-10-14

**INCREMENTAL / EMPIRICAL.** Owner report: a regularly used browser kept showing an old release. The service worker serves its pinned generation cache-first. A new release installs in the background but waits until the hidden updater activates it, or until every Phosphor window closes, so a tab left open never advanced. The control window now registers with `updateViaCache: "none"`, checks immediately and, if it is untouched within 20s, sends the existing `activate-release` message (which refuses while any other Phosphor window or stage is open). On `ready` it reloads once into the new generation. A first install, a touched window or a refused activation keeps the release and shows an **Update available ↗** top-bar link to `update.html`. Rhythm track names were `<button>`s with `overflow: hidden` and the 17px pill radius, which clipped their first letter; their radius is now 0.

**Verification:** a headless Chrome harness served a built `dist`, installed release A and then published B and C by changing the worker revision and an index marker. A fresh sole window first painted A, then reloaded once into B (2 navigations, no loop). With a stage window open, the release stayed pinned and the link appeared. A window in use stayed on B when C arrived and showed the link without navigating. Full suite 548/548; typecheck, build, dist verification and `test:i18n` (DE/EN) passed. A screenshot confirmed complete track names at 1920×1080.

## Consistent panel density and movable right seams 2026-10-14

**INCREMENTAL / EMPIRICAL.** Owner report: at about 1250×900 the Look panel was stretched with labels above its sliders while Performance placed labels beside them, and the Look/Performance/Rhythm seams could not move. Causes: the label form depended on each panel's own height (`min-height: 311px` container query), and the chassis grew to exactly the sum of oversized right-column minimums (Look 560/640px), leaving every seam at min = max. Now the label form depends only on column width (stacked below a 500px content box). Comfortable heights come from headless Chrome measurements of uncompacted contents at several viewports in English and German, scaled by `--ui-scale`. The window fits these heights; layout version 2 keeps null right seams that split the column proportionally, so every panel stretches by the same factor. Dragging may reduce a right-hand panel to 70% of its comfortable height. Height-based compact rules now follow layout-set `--panel-compact`/`--panel-tight` flags, so only squeezed panels compact. Version 1 right seams, which were fitted to the old minimums, return to the proportional split. The split ratio, left seam and portrait weights remain.

**Verification:** nine geometry/storage tests, including a regression test that requires more than 80px of travel on both right seams across six desktop sizes and an equal default stretch. Headless Chrome at 1100×800, 1250×900, 1440×900, 1920×1080, 2560×1440, 390×844 and 768×1024 (EN), plus 1250×900, 1100×800 and 390×844 (DE), showed contents fitting their panels without compact flags. At 1250×900 the frame fits the viewport with no page scroll; the old layout required 1456px. In the in-app browser, dragging both right seams worked, and double-clicking restored the proportional split.

**Follow-up (owner review, same day).** (1) Performance faders moved as one block (`#shared` grid) while Look's spread out. `#shared` is now `display: contents`, so both panels distribute free height between individual faders with the same row-gap formula. Measured fader pitch at +0/+150/+300px panel height: Look 49/78/106px and Performance 46/84/121px at 1250×900. Both use identical fader boxes. A first attempt applied `--ui-scale` zoom twice because zoom still inherits through `display: contents`; this was caught by measurement and removed. (2) The frame art scaled x by width and y by height, so outer bars and corners distorted whenever the window aspect differed from the art. Desktop fixed x bands now use the vertical scale, capped at 1.5× width/3072 so every stretch stays open at split extremes. The one-column layout first used width/1024 for every fixed band, which the owner found too zoomed-in at about 1000px. It now caps the frame scale at 0.55, which is about desktop bar thickness. Fixed x bands are [0, 180] and [690, 1024], where the corners and the organic right-hand sweeps sit. Only the straight middle of every horizontal bar stretches, along with the side stretches between panels and the flat header plate. One-column panel insets scale with the corners, including the long bottom-right sweep, and comfort heights include them. A new test asserts one fixed-band scale in both directions at seven sizes. Full suite 544/544; typecheck, formatting, build, dist verification and `test:i18n` (DE/EN) passed. Headless screenshots at 2560×1080, 1920×1080, 1250×900, 938×1000 and 390×844 confirmed undistorted bars and uncovered controls.

## Readable panel minimums and scroll chaining 2026-10-12

**INCREMENTAL / EMPIRICAL.** Supersedes the earlier always-fit-page rule at the owner's request. Both chassis mappings now reserve readable minimum heights, with extra space for narrow wrapping controls. The page grows only when the viewport cannot contain these minimums; larger viewports are filled. Saved seam preferences remain separate from temporary viewport constraints. Native vertical scroll chaining lets panel/catalog content scroll first, then the page at either end.

**Verification:** seven geometry/storage tests cover short and tall viewports, every authored seam extreme, per-panel minima, rigid corner bands, redistribution, corrupt preferences and geometry-aware edits preserving the other column. Independent review found and corrected cross-column preference overwriting and ineffective panel-self container rules. Exact-size browser fixtures verified a scrollable 390×746 page and full-height filling at 1440×1800 and 950×2800. Wheel input moved the catalog to its 260px limit while leaving the page in place; the next gesture advanced the page. Reversing direction first returned the catalog to its start, then moved the page upward. Regular controls fit their panels; additional world controls and longer libraries keep normal panel scrolling. No renderer changes are involved. Build, typecheck, formatting and distribution verification passed; the full local suite passed 541 tests with 12 optional probes skipped. External-device/touch momentum remains a separate check.

## Worlds beta and fresh-session defaults 2026-10-12

**INCREMENTAL / EMPIRICAL.** The catalog's Worlds button now includes a theme-aware Beta badge. Fresh control sessions enable catalog Autopilot even when the previous session saved it Off. The existing Stage status handshake remains authoritative on reconnection; later set imports keep their settings.

**Verification:** the saved-Off reload failed in the browser before the fix and passed afterward, returning from Worlds to Looks with no active world. A live Stage reconnect kept Autopilot Off and reattached its preview. Both themes display the badge without document overflow. All 539 active tests passed (12 optional probes skipped), alongside typecheck, formatting, build and distribution checks. The browser regression now covers saved-Off startup and waits for actual video-track reconnection before checking Stage ownership. Independent review found no production blockers and corrected that test's readiness gate.

**Browser-suite limit:** the preceding `abd33ea` GitHub run passed all 334 looks, family energy/aspect/fade/preparation checks and the control/Stage workflow, then timed out waiting for a variation thumbnail on software rendering. Native browser checks produced all six images during playback and pause without console errors. The functional CI variation check now holds the large live preview while generating thumbnails, then resumes after selection. This isolates generation from competing GPU work; it does not prove the earlier timeout's root cause or concurrent throughput on SwiftShader. Full remote rerun remains separate from these local results.

## Continuous world development 2026-10-12

**INCREMENTAL / EMPIRICAL.** Integrated the owner-approved transformation study as Unfolding Garden / Living Forms: connected filaments fill into membranes and open into blossoms. One deterministic mesh, seed and branch ancestry persist through a reversible Development slider and 4/8/16-bar state cues. Existing simulation-field worlds remain available. Six real 512×288 catalog previews bring the authored library to 334 looks, 39 catalog families and 40 renderers.

**Verification:** 539 tests pass, 12 optional probes skipped; typecheck, formatting, build and distribution checks pass. Eight new model tests cover durations, fractional pause, Freeze, manual takeover, set migration, deterministic geometry and exact handoff trajectory. The native browser GPU harness verifies visible deformation with the same slot/VAO, no intra-world crossfade or reseed, exact pixel pause, flash-limited paused editing, portrait resize and bounded textures with no GPU errors. The previous worlds harness still passes actual field transfer, reverse carry, half-speed beat timing and pause. Full-app testing covers preparing/starting, state cues, taking over a moving slider and paused seeking.

**Review corrections:** preserve the range DOM during transport changes; retain the original easing phase on Stage handoff. The full-app test exposed asynchronous flash approval leaving a paused edit one frame behind. Paused output now settles the latest requested frame without advancing simulation; revision tracking keeps rapid edits from starving approval and allows protected brightness to recover. The flash limiter remains enabled.

**Limits / next check:** authored parametric deformation, not biological growth or collision-free topology proof. New-family 4K venue cadence, external-display rehearsal and multi-hour endurance remain unmeasured. Next is the owner's integrated play-through before expanding the world library. Source and bounded model: [Living Forms](families/metamorphosis.md).

## Fourth 4K performance pass with strict visual gates 2026-10-12

**INCREMENTAL / EMPIRICAL.** Remeasured all **39 renderers / 178 declared variants** at 4K and 1080p. Cathedral caches its crystal transforms once per draw; Flight stops only when no finer cross can change its minimum or first material winner; Fourspace caches projected geometry and evaluates every original edge in a compact ordered loop. Full output resolution, ray budgets, geometry and simulation sizes are retained. Baseline shaders are `074d8b4`; both versions use the same fixed runtime at `675d977`.

**Measurements:** alternating 40-sample 4K comparisons measured Twenty-four Cell at **53.9 → 31.6 ms**, Duoprism Torus at **50.8 → 25.3 ms**, Flight's corkscrew at **46.3 → 40.2 ms**, and Cathedral's Opal Reliquary at **52.7 → 49.6 ms**. These measure draw plus post, including data caches but excluding simulation advancement. Dense Fourspace saved 41–50%, Flight's paths 3–13%, and the crystal look 6%. The separate completed-frame sweep leaves 27/178 medians above 16.67 ms at 4K (baseline 29), and 5 above 33.34 ms (baseline 6); all 178 optimized 1080p medians are below 16.67 ms. Unchanged families vary with GPU/system load. The [full family table and methods](families/PERFORMANCE.md) separate whole-frame and paired measurements.

**Quality findings:** the proposed spatial tiling cache failed a review-driven phason-degeneracy case and, after a guard fixed that case, a late Phason Storm frame still differed by 75/255 at four post-processed pixels. Rejecting every cached candidate retained the late failure, implicating compiler changes in the original fallback near an edge. Larger margins, helper separation and an experimental resolve pass did not establish equivalence. A Wallpaper coefficient cache also failed strict images. Both optimizations and all experimental engine changes were discarded; the shipped tiling, Wallpaper and engine sources match the baseline/runtime.

**Verification:** all **199 final image comparisons passed** (181 changed-renderer captures and 18 preserved-tiling controls), including all changed looks, three energy levels, advancing ray scenes, late-time Fourspace, rhythm impulses and six 4K images. Maximum channel difference was 2/255 in 4K Opal Reliquary; every other comparison was at most 1/255. The gate was not relaxed. The native Flight probe tested **25,165,824 points / 384 cases**, preserving the full search's minimum and material winner. The native cache test covered five cached families, 62,770 exact map cells, 2,560 orbit components, pause refresh, fallback, context recovery and texture cleanup. All 328 authored looks, all-family energy/aspect/fade checks and 24 simulation preparation contracts passed. All timing runs reported zero GPU/non-finite/page errors. **530 tests passed, 12 optional tests skipped**; native cache checks ran separately. Typecheck, formatting, build and distribution verification passed. Independent final review found no actionable issues.

**Limits / next check:** sampled equivalence is not a proof across all inputs/drivers. Cathedral, Flight and slow tilings remain above the 60 Hz throughput budget at 4K. Asynchronous flash approval is disabled only in the throughput probes; real external-display cadence, transitions and full-night acceptance remain open. Future tiling work must preserve first-hit ordering and compiler-sensitive fallback arithmetic at both phason flips and late-time boundaries. Raw evidence and rejected prototypes remain local under `artifacts/performance/round4-*`.

## Living worlds and panel refinement 2026-10-12

**INCREMENTAL / EMPIRICAL.** Two authored worlds, three developments each, sit above the unchanged look catalog. Prepare is silent; explicit Start queues the next bar, with four/eight-bar beat-based fades. Autopilot stays inside the world, manual catalog playback leaves it. Acid and Evolution inherit the packed UV chemical field into both incoming simulation buffers, skip reseeding/warm-up and keep simulation time. Other families crossfade. Shared clock/palette and Space pause remain intact; Freeze holds the visual fade while its clock continues and rebases the fade on release. World definitions and curated parameter overrides validate and roundtrip with the set.

Executed checks:

- Model tests cover silent preparation, quantization, four/eight bars, palette retention, pause/Freeze, pending cancellation, bounded autopilot, free play, recovery, schema bounds, authored-copy localization and in-place UI deletion of referenced own looks. Independent review found and drove fixes for Freeze timing, stale queued definitions and referenced-look deletion; regression cases are included in `tests/worlds.test.mjs`.
- Native browser GPU fixture `tests/browser/worlds.html`: exact normalized-nearest transfer from Acid 320×192 to Evolution 384×384 (zero invalid texels), evolved field after transfer, no reset, same-family/reverse carry, half-speed beat timing, exact paused field/phase, at most two slots and no GPU errors. Nearest sampling preserves the packed 16-bit concentrations; interpolating encoded bytes would corrupt them.
- A 96-second accelerated fixed-step world cycle passed occupancy checks every simulated second after warm-up: Mycelium occupied 89–92% at 20–40s, Garden 82–91% at 50–90s. This drove stable curated chemistry overrides; it is a bounded local check, not multi-hour/venue certification.
- Final checks after integrating the latest renderer optimizations: 530 tests passed, 12 optional browser-runner tests skipped; typecheck, build and distribution verification passed. Independent targeted re-review found no remaining blockers.
- Browser visual checks exercised Prepare/Start and a running world in the organic two-column chassis, including enlarged Look and reduced Performance panels. In a one-column 950×1492 CSS-pixel viewport the document height equalled the viewport and a 191px Performance panel had no internal overflow; the temporary viewport override was reset. A queued world stayed at exactly two beats while Space-paused and resumed on release. Height-based density compacts faders when a panel is short; larger panels distribute controls and grow rhythm cells. The continuous SVG slider thumb has a rounded taper and its fill ends beneath the bulb instead of exposing a vertical seam. Themes/frame artwork are retained.

Limits: two worlds, not arbitrary cross-family continuity. Different simulation grids resample normalized coordinates; topology preservation is not claimed. A new window, GPU context loss or restored runtime starts a fresh field while retaining the logical world; textures are never serialized. Optional graphical browser-suite runners remain separately gated. Next: owner aesthetic review, German/English layout follow-up as the library grows, and the existing external-display/full-night rehearsal.

## Exact GPU data caches and third performance sweep 2026-10-12

**INCREMENTAL / EMPIRICAL.** Remeasured all **39 renderers / 178 declared variants** at 4K and 1080p on the native M3 Pro. Mandelbrot decodes its original reference orbit once per draw; Space-filling Curves caches exact integer maps; Voronoi caches power-diagram radii. Full output resolution, geometry, simulation sizes, iteration budgets and picture arithmetic are retained. The optional RGBA32F data pass refreshes on paused edits, recovers after context loss and falls back to the original shader when float targets are unavailable.

**Measurements:** a 40-frame completed-frame repeat measured Moore Loop at **35.5 → 14.4 ms** and Seahorse Valley at **56.2 → 36.2 ms** at 4K. Sequential sweeps showed substantial load drift, including for unchanged families. A final alternating-order probe with identical simulation state, uniforms and input picture history measured Moore at **47.8 → 18.7 ms**, Tricorn at **68.2 → 50.7 ms** and Power Bubbles at **40.2 → 26.7 ms**. These latter numbers measure draw plus post-processing, including the cache pass but excluding simulation; they are not whole-frame times. The [complete family table, repeats and methods](families/PERFORMANCE.md) distinguish those measurements. Fourspace, Cathedral and Flight experiments without repeatable gains were discarded.

**Verification:** all **329 strict image comparisons** passed with maximum channel difference **1/255**; curves and Mandelbrot were pixel-identical. Coverage includes every changed authored look at three energies and three times, refinement transitions, advancing deep zooms and full 4K images. Native GPU checks matched **62,770 cached curve cells** to independent CPU maps and **2,560 orbit components** to original byte decoding; pause refresh, fallback, context recovery and texture cleanup passed. The exhaustive curve probe passed 110,113 cells. All 328 authored looks, family energy/aspect checks, fade cleanup and 24 simulation preparation contracts passed. **510 tests passed, 12 optional tests skipped**; the new native GPU test ran separately. Typecheck, formatting, build and distribution verification passed. Independent code review found no actionable issues.

**Limits / next check:** 176/178 medians were below 16.67 ms at 1080p in this sweep. At 4K, 53 exceeded 16.67 ms and 13 exceeded 33.34 ms, versus 73/33 in the fresh baseline. Load variation means those count changes cannot all be attributed to the edits. Timings exclude asynchronous flash approval and do not certify external-display cadence, transitions or full-night operation. Visual equivalence is sampled, not a proof across every input/driver. Remaining 4K priorities are Cathedral, Flight, dense Fourspace, deeper Mandelbrot and heptagonal tilings. Raw evidence remains local under `artifacts/performance/round3-*`; baseline scenes are `65b5a67`, with the shared runtime based on `e918a18`.

## Further family performance improvements 2026-10-12

**INCREMENTAL / EMPIRICAL.** Remeasured all 39 renderers / 178 variants at 1080p and 4K on the native M3 Pro. Melt skips conservative bounds around eight-segment groups; Peano uses exact constant-divisor integer mappings. A targeted 40-frame repeat measured Melt's woven ribbons at 55.0 → 7.8 ms and Peano at 44.9 → 16.8 ms at 4K. No resolution, segment, simulation or iteration reductions. The complete sweep and remaining bottlenecks are in the [family performance report](families/PERFORMANCE.md).

**Quality correction:** auditing the first pass found that its aggregate visual gate had tolerated one Penrose Rhombs pixel differing by 154/255 (look 0, energy 0.1, time 0.5, 640×360). The old statement that no pixel differed by more than two steps was incorrect. The strict per-pixel gate now fails such cases. Quasicrystal uses the original search for missed/near-boundary pixels and computes pixel derivatives outside divergent branches; 72 comparisons across all eight looks, three energies and three times now differ by at most one channel step. This fix adds some rendering cost, reported explicitly in the table.

**Verification:** all 45 low/mid/high-energy Melt/curve comparisons, 18 late-time Melt frames and two 1080p frames are pixel-identical; 137 comparisons total including tilings. Exhaustive actual-GPU curve maps match the CPU reference at 110,113 cells in both directions. All 328 authored looks, energy extremes, aspect checks, transitions/resource lifetimes and 24 simulation preparation contracts pass the native browser lab. 505 active tests pass (11 skipped); type checking, formatting, build and distribution checks pass. Independent review found no actionable findings. The complete timing sweeps and final browser/pixel checks used an ignored snapshot of stable runtime `8558cd0` plus the scoped changes, avoiding concurrent UI/localization edits.

**Limits:** 178/178 measured variant medians are under 16.67 ms at 1080p. At 4K, 36 still exceed 16.67 ms and 10 exceed 33.34 ms. The fresh baseline had 49/13 respectively; unchanged-family timings also vary with system/GPU load, so the entire count difference cannot be attributed to these edits. Completed-frame throughput excludes asynchronous flash approval and is not external-display cadence or venue acceptance. Raw evidence is local under `artifacts/performance/round2-*`.

## Resizable panels, Live rhythm and pause 2026-10-12

**INCREMENTAL / EMPIRICAL.** Implemented the owner-approved organic resize study in the real controls. Desktop column width and three horizontal seams, plus four portrait seams, use one bounded geometry model with independent browser-local saved arrangements. Original frame images are unchanged. Rigid junction bands, device-pixel-snapped patches and complementary spine blending remove doubled borders. Footer filters form one compact group; portrait filters remain inside Catalog. The viewport contains the whole page, while panel contents retain internal scrolling.

**Observed:** in-app browser checks covered desktop root/viewport equality at 1910×1075, 1794×1391, 1373×1092 and 1248×570 CSS pixels, and portrait at 529×1145, 582×1260 and 430×928. These are measured DOM dimensions (browser zoom changes requested viewport sizes). Pointer/keyboard resizing, reload persistence, independent layout resets, top-layer filter menus and broad Rhythm expansion were exercised. Moving the portrait fourth seam to its lower limit gave Rhythm about 594 px at a 1260 px viewport; desktop Rhythm reached about 600 px at 1092 px. These are bounded local checks, not all-device certification.

**Rhythm:** a deterministic three-track reproduction at beat 5.5 previously placed playheads at `[6,10,-1]`; the common Live-bar projection yields `[6,6,6]` while preserving 4-, 3- and 32-beat loop phases. Labels wrap within the longest track’s bar count rather than increasing forever. Regression tests cover late absolute bars, fixed editing, return to Live and polymetric hits across the display wrap.

**Pause:** Space captures on focused buttons/sliders, pauses the Show clock at a fractional beat, holds renderer updates and suspends existing app audio; the next press resumes. Text entry stays normal and Shift+Space remains Next. Clock tests hold beat 2.75 across a long pause and runtime handoff. Audio tests preserve context/media positions and pending demo notes, fence asynchronous resume/stale output timestamps and retain files when pause interrupts initial play. A paused output command presents once, keeping emergency Blackout responsive. Local browser checks confirmed fresh-page Space→Space starts the demo, focused Freeze is not accidentally toggled, audio reports Paused/playing, and paused screenshot bytes remain identical across separate observations, including after Blackout/unblack. Stage startup and keyboard pause were exercised; the complete two-window browser regression was not rerun in this pass.

**Verification:** `npm test` passed 504 tests with 11 optional browser tests skipped (515 total); typecheck, build and distribution verification passed (98 built / 97 reachable verified assets). The final focused pause suite passed 44/44 after replacing exact floating-point timestamp comparisons with microsecond rounding. Required independent review found a grip-transform defect and four pause edge cases (Blackout, first-gesture audio, stale resume timestamps and interrupted file playback); all were corrected and re-reviewed. Existing browser regression expectations now use Enter for focused-button activation and explicitly check Space pause/resume. Other concurrent renderer optimization work was excluded from this change.

**Limits / next check:** user visual acceptance on the actual screen and external-display/full-night rehearsal remain open. Pause controls Phosphor’s audio, not an external DJ player. The static chassis fallback remains available if frame artwork cannot load.

## Family performance without quality reduction 2026-10-12

**INCREMENTAL / EMPIRICAL.** Measured all **39 renderers / 178 declared variants** on Apple M3 Pro, native Metal through Chrome 155.0.8059.39, at energy 0.95. Fourspace repeatedly searched every vertex pair at every pixel; its exact ordered edge list is now generated once and supplied as constant-index shader calls. Quasicrystal now exposes each tiling's constant direction count and ordered grid-pair search to the shader compiler. Projection, edge/halo shading, all search candidates, first-hit order, iteration/detail budgets, simulations and full output resolution are retained.

All 178 variants have median completed-frame time below 16.67 ms at 1920×1080 in the final short probe. The eight changed variants improve by roughly 4–8×. At 3840×2160, **37/178** variants remain above 16.67 ms and **11/178** remain above 33.34 ms; full-resolution 4K is not a universal 60 fps result. Cathedral, Melt, Space-filling Curves, Mandelbrot and the denser Fourspace shapes remain the main 4K targets.

### Changed variants

Times are median completed-frame milliseconds; lower is better.

| Renderer / variant | 1080p before | 1080p after | 4K before | 4K after |
| --- | ---: | ---: | ---: | ---: |
| fourspace / 0 | 33.2 | 5.2 | 111.2 | 19.0 |
| fourspace / 1 | 30.4 | 6.6 | 83.7 | 22.6 |
| fourspace / 2 | 55.5 | 12.7 | 185.0 | 42.9 |
| fourspace / 3 | 89.0 | 11.4 | 330.2 | 42.4 |
| quasicrystal / 0 | 23.7 | 3.6 | 73.5 | 14.9 |
| quasicrystal / 1 | 10.6 | 2.7 | 36.9 | 9.6 |
| quasicrystal / 2 | 47.9 | 7.5 | 165.0 | 27.9 |
| quasicrystal / 3 | 33.7 | 5.4 | 106.3 | 19.7 |

### Every family

Each value is the **slowest variant's median** in that family, rather than a family average. The JSON reports retain per-variant medians, p95, CPU submission times, dimensions and error counts.

| Renderer | Variants | 1080p before (ms) | 1080p after (ms) | 4K after (ms) |
| --- | ---: | ---: | ---: | ---: |
| Acid Mycelium (acid) | 6 | 3.8 | 3.0 | 6.8 |
| Magnetic Choir (magnetic) | 3 | 3.5 | 3.3 | 6.4 |
| Cathedrals of Error (cathedral) | 4 | 18.1 | 16.3 | 53.5 |
| Alien Aquarium (aquarium) | 3 | 2.4 | 2.6 | 7.0 |
| Causal Tapestry (tapestry) | 4 | 2.9 | 3.1 | 7.8 |
| Feedback Chapel (feedback) | 4 | 1.9 | 2.7 | 5.5 |
| Interference Rituals (interference) | 6 | 3.2 | 4.1 | 9.2 |
| Topological Melt (melt) | 4 | 13.9 | 15.6 | 46.4 |
| Phase Transition Theatre (phase) | 3 | 3.8 | 3.1 | 8.0 |
| Evolution Garden (evolution) | 4 | 2.6 | 2.1 | 6.1 |
| Pulse Geometry (pulse) | 4 | 2.1 | 2.0 | 5.5 |
| Fractal Flight (flight) | 4 | 12.4 | 11.7 | 38.5 |
| Light Beams (beams) | 4 | 4.8 | 4.9 | 13.2 |
| Julia Observatory (julia) | 4 | 5.1 | 3.7 | 14.5 |
| Fourth Dimension (fourspace) | 4 | 89.0 | 12.7 | 42.9 |
| Hyperbolic Loom (hyperbolic) | 4 | 2.1 | 2.3 | 6.0 |
| Particle Swarm (swarm) | 4 | 7.1 | 8.1 | 10.0 |
| Game of Life (life) | 6 | 4.6 | 4.1 | 11.5 |
| Strange Attractors (attractor) | 6 | 2.9 | 2.5 | 6.5 |
| Mandelbrot Dive (mandelbrot) | 5 | 16.0 | 12.7 | 42.7 |
| Abelian Sandpile (sandpile) | 4 | 3.2 | 2.9 | 6.4 |
| Newton Basins (newton) | 5 | 6.1 | 4.4 | 16.3 |
| Fractal Flames (flame) | 6 | 3.2 | 2.2 | 7.0 |
| Aperiodic Tilings (quasicrystal) | 4 | 47.9 | 7.5 | 27.9 |
| Voronoi Cells (voronoi) | 4 | 10.7 | 10.0 | 29.6 |
| Ripple Tank (ripple) | 4 | 2.7 | 3.0 | 6.0 |
| Langton's Ant (turmite) | 6 | 8.6 | 5.7 | 9.2 |
| Indra's Pearls (kleinian) | 4 | 2.3 | 2.0 | 5.0 |
| Harmonograph (harmonograph) | 4 | 3.2 | 2.2 | 6.2 |
| Wallpaper Groups (wallpaper) | 17 | 8.2 | 6.3 | 24.4 |
| Truchet Tiles (truchet) | 4 | 3.4 | 2.8 | 9.8 |
| Space-filling Curves (hilbert) | 4 | 14.8 | 12.8 | 44.6 |
| Phyllotaxis (phyllotaxis) | 4 | 2.7 | 2.5 | 7.0 |
| Hopf Fibration (hopf) | 4 | 2.2 | 2.2 | 6.8 |
| Chladni Figures (chladni) | 4 | 2.9 | 2.6 | 8.4 |
| Domain Colouring (domain) | 4 | 3.4 | 2.7 | 11.6 |
| Physarum Networks (physarum) | 4 | 2.2 | 2.8 | 6.8 |
| Geometric Caustics (caustics) | 3 | 2.2 | 2.6 | 6.9 |
| Space Colonization (colonization) | 3 | 2.3 | 2.3 | 7.2 |

### Reproduction and limits

- Reference scene shaders: `2b6398e06247057fd8bd23024952079c2fef7065`. Run `node scripts/profile-families.mjs --reference 2b6398e --types --frames 20 --out artifacts/performance/baseline`, then omit `--reference` and change `--out` for the current code. Add `--width 3840 --height 2160` for 4K. All shaders are compiled before sampling; each look is seeded and warmed, then three extra frames precede 20 measured frames. Runs are sequential.
- The synchronous probe drives the real Engine, waits for final canvas readback and includes post-processing. It disables asynchronous flash approval for throughput measurement; production flash limiting is unchanged. It is neither rAF/display cadence nor a crossfade/endurance/venue gate. Short p95 samples include scheduling noise; median figures do not establish sustained 60 fps.
- All timing rows recorded zero page, GL and non-finite input errors. Local raw reports: `artifacts/performance/{baseline-1080-final,optimized-1080-final,baseline-4k-final,optimized-4k-final}/profile.json`. The 4K baseline repeats the eight changed variants; the final 4K sweep covers all 178. Generated images/logs remain outside Git.
- A CPU projection experiment failed a late-show pixel comparison and was discarded. The final implementation keeps the original GPU projection. The retained stress case is Hypercube Close-up at time 25994.68 s, energy 0.95 and rotation impulse 0.45.

### Verification

- The initial aggregate pixel check covered **42 frames** (all 14 changed authored looks at energy 0.1/0.5/0.95, 640×360). Maximum channel difference was 154/255; the largest frame-average channel difference was 0.003387/255. **Correction, second pass:** one Penrose pixel exceeded two channel steps; the earlier claim that none did was incorrect. The stricter gate and fix are recorded [above](#further-family-performance-improvements-2026-10-12). Representative before/after Fourspace and heptagonal images were visually inspected. These are sampled observations, not proof over every parameter, driver and moment.
- All 12 late-time Fourspace comparisons passed (every authored look at 25994.68 and 28800 seconds, energy 0.95 and rotation impulse 0.45). Eleven were pixel-identical; the remaining frame differed by one channel step at one pixel. Run `node scripts/compare-family-pixels.mjs --reference 2b6398e --families fourspace --levels 0.95 --times 25994.68,28800 --impulse .45`.
- Topology regression checks retain the exact original edge order, edge counts and vertex degrees for all four polytopes. Existing mathematical tiling and full-resolution tests pass. Independent code review found no remaining actionable issues.
- Native-GPU browser lab passed all 328 authored looks, energy extremes, 32:9/square/portrait rendering, per-family fades without texture leaks, and all 24 simulation families’ preparation/held-transition contracts (`npm run test:browser -- --only lab --native-gpu --port 48144`).
- Full unit suite: 501 passed, 11 optional probes skipped, zero failures. Typecheck, formatting, build and offline distribution verification passed.


## Responsive panel contents 2026-10-12

**INCREMENTAL / EMPIRICAL.** Tall two-column windows previously distributed spare height between horizontal faders and centred the rhythm grid, leaving truncated labels and large gaps. Look/Performance now stack labels above full-width sliders in square/portrait desktop windows, with bounded spacing. A size container makes rhythm rows respond to available panel height. Family/Global switches move into the heading to preserve room for all four Global tracks in short landscape panels. The owner-provided chassis images and panel openings are unchanged.

- Independent browser probes passed at 320×640, 390×844, 768×1024, 1099×850, 1100×850, 1100×1100, 1280×1440, 1870×2044, 1440×900, 1920×1080 and 2560×1080. No horizontal overflow, heading overlap, clipped faders or runtime errors; all 16 cells of each visible Family/Global track were visible and hit-testable. Review caught and resolved the fourth Global row overlapping the footer before the final matrix passed.
- The main control/Stage browser regression (`npm run test:browser -- --only show --native-gpu`) passed, including live rhythm editing, handoff/reload, palette controls and no page/GPU/non-finite errors. Build and offline-distribution checks passed.
- The tall two-column result was visually inspected in the in-app browser; local proof is `artifacts/ui/responsive-panels.png` (not a published asset). Independent review reported no remaining actionable findings.

Limits: these are representative Chromium viewport and interaction checks, not a claim to cover every device, browser or accessibility zoom combination. Physical venue-display and endurance checks remain separate.


## Shared tempo and selectable output 2026-10-11

**INCREMENTAL / EMPIRICAL.** The original browser reproduction entered 145 BPM: the Stage visual clock reached 145 while its demo engine stayed at 120. The demo had its own free-running scheduler. It now reads the owning ShowClock and maps that beat timeline to audible AudioContext time. The synthetic source does not feed estimated tempo back into its master clock. Existing input/file analysis remains unchanged.

The preview BPM readout opens a compact numeric/±/Tap popover. It and Audio settings update the same transport; numeric edits persist with the set. Preview and Stage resolution are selectable again: native is the default, with explicit lower long-edge caps. Selection preserves aspect ratio, respects native/GPU limits, survives export/reload, and applies to the active renderer and subsequent handoffs. Legacy pixel budgets still do not silently reduce output.

- Regression coverage in `scripts/test-output-controls.mjs`: Audio settings and quick BPM input control demo sound and visual clock; rapid Stage ± clicks accumulate; both tempo readouts agree; Stage and local output resize; preferences survive reload. Added to CI.
- New unit checks cover scheduled note timing/phase, tempo changes, missed-timer skipping, downbeat changes, resolution bounds/aspect ratio, and set validation/round-trip. Full suite: 484 passed, 11 optional probes skipped, zero failures; build, typecheck, formatting and offline-distribution checks passed.
- `npm run test:output-controls -- --native-gpu`, `npm run test:autopilot-ui -- --native-gpu --port 48131`, `npm run test:stage-output -- --native-gpu` and the main control/Stage browser suite all passed on the final code. The dark UI popovers were visually inspected; the independent review also checked a 390 px viewport.
- Independent review found and resolved two edge cases: a shifted bar origin could skip demo subdivisions, and rapid ± clicks could reuse stale Stage BPM. The scheduler now counts absolute beats; pending tempo requests update the control immediately.

Limits: already scheduled demo notes may retain their timing for the bounded 120 ms lookahead after an edit. External-display/audio-device latency and endurance remain rig checks.

## Autopilot look synchronization 2026-10-11

**INCREMENTAL / EMPIRICAL.** The timed Stage reproduction twice reached `acid:Mycelial City` while the editor, parameter schema and selected catalog card remained on `physarum:Honeycomb Transport`. Status already carried the actual live clip; the control only updated the playing indicator and never synchronized the editor selection. `control.mjs` now observes playing-look identity changes, copies the live clip into the editor, updates its preview and marks the corresponding catalog card. It does not audition the look, restart playback or take over Autopilot. Repeated status updates refresh existing parameter controls while manually edited drafts remain untouched until the next playing-look change.

- `npm run test:autopilot-ui -- --native-gpu --port 48131`: passed real timed changes on Stage and the local clock, all editor parameters, actual selected-card marking, retained Autopilot control, stable fader nodes, remote parameter updates and preservation of an unsaved edit after later status. Independent review also caught a local selection/name-edit race; the added regression now retains the new name before the next status tick. Added to CI.
- `npm test`: 480 passed, 11 optional probes skipped, zero failures. Main control/Stage browser regression, typecheck, formatting, build and distribution verification passed.

Limits: focused synchronization and existing interaction checks; external-rig endurance is unchanged.

## Biomechanical controls and shared colour 2026-10-11

**INCREMENTAL / EMPIRICAL.** Implemented the owner-approved biomechanical direction with one whole-page chassis, separate wide/portrait compositions, teardrop faders, compact family/global rhythm and a setup dialog. The final frames are the owner's upscaled PNG files copied unchanged: 3072×1924 wide and 1024×3072 portrait, with genuine alpha openings for the five panels. Dimensions, source names and hashes are recorded in `public/ui/assets.json`. Desktop and 390 px-width portrait layouts were visually inspected. Short desktop windows scroll an 850 px composition; at 1200×500, independent review verified no panel overlap and a reachable confirmation banner.

The follow-up spacing pass insets the logo, Open Stage and headings away from the sculpted edges, centres compact rhythm content, adapts portrait canvas height and embeds Forum locally for headings/logo. Native preview sizing supersedes the old manual resolution preference; Stage remains native. ScreenDetailed metadata is reused only with an existing permission. The fallback limitation for already zoomed Retina browsers is recorded in [docs](README.md#architecture).

Follow-up interaction fixes: dark mode is the default while explicit saved appearance choices are retained. Light mode uses stronger ink and distinct status/button surfaces directly over the original top-bar metal, with no extra white overlay. Only open menus rise above the chassis; panel backgrounds remain behind it. The preview caption has no rectangular gradient surface. The 16-cell rhythm grid now edits directly; a stable bar selector reaches longer loops, finer clicks preserve existing hits/duration, and track-name popovers expose timing and strength without expanding the panel. The Stage gate matches the new style and starts synchronously; fullscreen, keyboard-lock and wake-lock requests cannot block it. Browser regression first reproduced the stalled fullscreen request, then passed pending/rejected/missing API cases and Enter, Space and icon activation.

The three shared colours now use a 2D saturation/value field, hue strip, hex/numeric input and 25 preset palettes. Set validation/export, manual/autopilot triggers, runtime restore, local/stage output, catalog, variations and rhythm retain the selected palette. Authored palettes remain preserved in their saved look data. The opening catalog emphasises networks, cells, caustics, particle rings, spirals and interference.

The slow palette-edit path previously invalidated and re-simulated every thumbnail. A failing regression reproduced that invalidation. Palette edits now update a single SVG matrix while retaining images and pending render work. All 328 authored previews are bundled as 512×288 WebP basis images (about 7.5 MiB of source data); ID/signature tests cover every look. Startup and repeated colour edits were verified to create no thumbnail renderer. Own looks/variations render at 512×288 after warm-up plus 24 frames, then reuse their images. The catalog colour transform is an approximation of the live shader's palette response, not a pixel-identical substitute for live rendering.

Executed checks:

- `npm test`: **480 passed, 11 optional probes skipped, zero failures** (491 total). Includes shared-palette restore/trigger/update regressions, HSV round trips, compact rhythm placement, cache retention and all 328 baked-preview signatures.
- `npm run typecheck`, `npm run format:check`, build and distribution/offline-asset verification passed. Appearance probes passed dark default under a light system preference, saved light/dark choices, unavailable storage, toggling and cross-tab reset.
- `npm run test:browser -- --only show --native-gpu`: passed actual 2D dragging, keyboard/hex/preset changes, no thumbnail renderer at startup or palette edits, setup/navigation, rating/favourites, stage handoff/reload, rhythm edits, variations, confirmation and own-look export. Zero page/GPU/non-finite errors.
- `PHOSPHOR_RHYTHM_UI=1 node --test tests/browser/control-rhythm.test.mjs`: passed. `npm run test:stage-output -- --native-gpu`: passed Retina/native output, Escape, animated nonblack preview after stage closure and native preview buffers, page-zoom independence with granted screen metadata, and monitor changes.
- `node scripts/test-stage-start.mjs --native-gpu`: all eight cases passed; the new Stage button also dismissed the gate in the in-app browser.
- Preview bake rendered all 328 authored looks with zero reported GL/non-finite failures. Independent review caught and verified fixes for preview ID lookup and short-window overflow; final narrow review reported no remaining defects.

Limits/next gate: owner visual acceptance of the implemented UI remains open. These checks establish functional behavior and local layout, not external-display rehearsal or endurance. Local screenshots remain under `artifacts/ui/` and are not published as assets.


## Visual rhythms and catalog expansion 2026-10-11

**INCREMENTAL / EMPIRICAL.** Implements the owner's [Q1–Q22 direction](research/family-rhythm-audit-2026-10-11.md) in the existing control style. Thirty-nine renderer modules expose 110 named family gestures; the grid adds independent global brightness/zoom/echo/colour tracks. Quarter/eighth/sixteenth steps, independent 1–64-beat loops, protected edits, optional own-look overrides, musical quantization and phrase automation share the music clock while visual Speed remains independent. Set v5 gains optional rhythm data without changing old IDs or losing favourites. Catalog metadata groups two Gray–Scott renderers into Reaction–Diffusion and adds visual filters; 38 catalog families / 328 authored looks.

### Executed visual and model review

- All 36 original families: four motion checkpoints at each of energy .1/.5/.9, native Chrome/Metal, fixed seed, isolated family effects. Source models and saved identities were retained. Local review: `artifacts/rhythm-review/index.html` and `results.json`.
- Six reference families: selective Penrose ribbons, Newton root basins, actual Sandpile fronts, Chladni nodes, linked Hopf fibres and architectural Cathedral bays. Follow-up review strengthened Penrose/Newton/Hopf/Chladni accents. Sandpile and Turmite originally occupied a tiny area; real occupied-cell reductions now guide a smooth display camera. Sandpile height classes no longer disappear in white additive glow; its Identity construction correctly starts from six grains. Independent review found no remaining framing or state-layout defect. The six refined moving ladders are in `artifacts/refined-family-review/`.
- New families: Physarum senses/deposits a separate diffusing trail field; caustics refracts actual rays through wave/lens normals; Space Colonization constructs real parent-child branches by nearby-point attraction/removal. All 24 new looks have moving low/mid/high-energy review, zero GL/non-finite errors and readable captures (`artifacts/new-family-review/`). Initial caustics exposure was too dim and was raised with resolution-normalized photon flux. Colonization's 26-second sequences show growth and six-second overlapping renewal; finite coral graphs can reach their node cap before filling the attraction volume. See [model limits](families/studies-physarum-caustics.md) and [growth evidence](families/colonization.md).
- Differentiation: Physarum's agents write the field they subsequently follow, unlike Swarm's prescribed flows or Magnetic Choir's dye advection. Caustics pictures light concentration on a receiver, whereas Ripple pictures the wave surface itself. Colonization retains explicit growing ancestry and unoccupied-space points, unlike a fixed mathematical attractor or reaction–diffusion density field. These are implementation distinctions, not scientific novelty claims.

### Verification and review

- The isolated grid fixture runs separately with `PHOSPHOR_RHYTHM_UI=1 node --test tests/browser/control-rhythm.test.mjs` (passed); CI installs Chromium and runs it explicitly. The deployment build remains browser-independent.
- `npm test`: **466 passed, 11 optional browser/render probes skipped**, zero failures. Typecheck, format check, build and distribution verification passed. Pattern tests cover independent 3-/4-beat loops, speed-independent transport, delayed edits, downbeat changes, saved-set round trips and draft/own-look handoff.
- `npm run test:browser -- --native-gpu` passed all 328 looks, energy extremes, 32:9/square/portrait output, all-family fade cleanup and 24 simulation preparation contracts. The actual control/stage test additionally sets a protected three-beat Penrose loop, mutes a global track, changes to Caustics and back, and verifies both states; keyboard, source ownership, reload and own-look export checks also pass.
- `npm run test:stage-output -- --native-gpu` passed Retina/native stage sizing, inert Escape, stage closure with a nonblack animated preview and Full HD preview buffers.
- Native regression `PHOSPHOR_RHYTHM_GPU=1 node --test tests/browser/rhythm-engine.test.mjs` passed: one Feedback stamp per event, six consecutive Life steps each creating exactly one object, CPU texture not overwritten by a GPU placeholder, field/CPU allocations accounted for, and a muted own-look override preserved through context loss including a load received while lost.
- Independent code review exposed and verified fixes for pending Feedback stamps, draft handoff, stale own-look copies, look identity on graphics recovery, preactivation envelopes, deterministic Life interventions, stage-to-editor clock interpolation and family/own activation isolation. A separate last-point removal case now uploads reached-only Colonization changes. Final review reported no remaining actionable finding in the reviewed changes.
- `scripts/rhythm-native-smoke.mjs`: installed Chrome 155.0.8059.39, ANGLE Metal / Apple M3 Pro, 1920×1080 canvas. Three new-family runs and three overlapping pairs (Physarum/Caustics, Colonization/Cathedral, Sandpile/Turmite), 180 measured RAF intervals after preparation each: p99 **16.8 ms**, zero GL/non-finite errors and exact live-texture accounting. Output and full timing rows: `artifacts/rhythm-native/results.json`. These short headless runs establish neither isolated GPU time nor external-display thermal/endurance performance.

Reproduce motion review with `node scripts/rhythm-audit.mjs`; use `--families physarum,caustics,colonization --all-looks` for the additions. Generated contact sheets, captures and logs stay ignored under `artifacts/`. Full-night endurance, physical audio/MIDI checks, external-display timing and final owner art acceptance remain open; automatic beat-tracking limitations are unchanged.

## 2026-10-11 — Control workflow bug fixes and release checks

- `INCREMENTAL / EMPIRICAL`: fixed live-stage mute and its persistence across source changes; opening a stage now transfers local Demo/Off and Mute choices. Delayed microphone permission cannot override a newer source or settings lock, and source status ignores stale async completions. Input/file controls explain that a stage is required; the same rehearsal file can be selected again.
- Variations use the independent idle thumbnail renderer instead of replacing the playing preview. Changing look, family, authored preset or palette clears old variations. Invalidated compilation/encoding jobs cannot publish stale thumbnails, and queued work keeps running after cancellation. Saved family/preset changes retain valid authored base IDs.
- Set-option faders, Pre-show checkboxes and keyboard favourites retain their DOM/focus through updates. Family faders follow remote parameter changes. Held Flash releases on window blur, modifier-key release and while a confirmation is open. Locked settings disable Variations consistently; a pending import cannot bypass the lock.
- Reproduced the former mute failure with a new browser assertion before the fix. `npm test`: 388 passed, 8 opt-in probes skipped, no failures. Typecheck, formatting, build and distribution verification passed. Targeted review findings about thumbnail cancellation, mute/source changes, pending microphone permission and Flash release were fixed and re-reviewed without remaining blockers.
- `npm run test:browser -- --native-gpu`: all 24 checks passed on installed Chrome 155, including all 304 looks, energy extremes, 32:9/square/portrait output, transition cleanup and 21 simulation-family warmups. The 19 control/stage checks include source/lock races, mute, keyboard focus, variations, own-look export, stage recovery and zero GPU/non-finite/page errors. `npm run test:stage-output -- --native-gpu` passed native Retina sizing, inert Escape, stage closure with a nonblack animated preview, Full HD preview buffers and Off/Mute handoff. Generated outputs remain local under `artifacts/`.
- Limits: these are browser correctness checks, not the outstanding eight-hour external-display endurance, physical audio/MIDI line check, output-measured blackout latency or owner art acceptance. No open GitHub issues were listed during this pass.

## 2026-10-11 — Two-column workspace follow-up

- `INCREMENTAL / EMPIRICAL`: Preview and Catalog now share an independent left column. The right column stacks Look, Performance and Setup in that order, without stretching the preview to match the controls. Narrow screens retain that section order in one column.
- Browser inspection in light and dark mode confirmed the arrangement, with no horizontal overflow at 2207, 1014 and 373 CSS pixels. Build, distribution verification and whitespace checks passed. Read-only code review found no issues; existing control IDs and attributes are preserved. This is a layout-only change; playback logic was not modified.

## 2026-10-11 — Light/dark control interface

- `INCREMENTAL / EMPIRICAL`: rebuilt the control surface around the owner's supplied light/dark reference images: warm neutral surfaces, gold controls, teal activity indicators, preview captions, compact catalog cards and responsive panel layouts. System appearance is the initial default; an explicit choice is stored per browser, synchronized across tabs and applied before first paint.
- Audio/MIDI/Set/Pre-show tabs support arrow/Home/End navigation. Look and performance details remain available through native disclosures. Ratings, favourites, own-look editing, import/export and settings locking retain their existing data paths. Keyboard activation of buttons, card thumbnails and disclosures no longer also invokes timing shortcuts; focused sliders retain native arrow adjustment. Review caught and fixed preservation of Shift+Space on focused buttons and thumbnails.
- `npm test`: 380 passed, 8 opt-in probes skipped, zero failures. Typecheck, formatting, build and reachable-distribution verification passed (75 copied application/cache assets). The new theme script and navigation module are included in the offline asset graph.
- In-app Chromium inspection confirmed light/dark switching and persistence after reload, keyboard tab/disclosure activation, empty-search recovery, all 304 catalog entries and responsive desktop/mobile layouts without horizontal overflow at the inspected widths (about 358–1762 CSS pixels). Screenshots saved locally under `artifacts/ui/`; generated captures are not published source assets. The look animations are the real existing renderer output, not reference-image replacements.
- `npm run test:browser -- --only show --native-gpu`: all 15 control/stage checks passed on installed Chrome 155, including rating/favourite sorting, focused-thumbnail Shift+Space, theme persistence through control reload, stage reload and missed-status recovery, framing pattern, blackout and local hand-back. Pointer-opening a card disclosure was corrected to avoid retaining focus and blocking rating re-sorts. Zero page errors, GPU errors or non-finite uploads. Repeated software-renderer attempts timed out on UI actions; the explicit native-GPU option keeps the same assertions and headless execution, without timing gates. This interface work does not establish external-display endurance, rig frame-time or new aesthetic acceptance for scene families.

## 2026-10-10 — Git-triggered production release verified (D70)

- `INCREMENTAL / EMPIRICAL`: pushing `7e7c831d3e998b6ab487c02c67b010ede673ef40` to `main` automatically created Vercel production deployment `dpl_HApeVSpG3x2NKGJkTXG8BRoqSYhg`, with API source `git` and the exact commit/branch. It reached READY and acquired [the public alias](https://phosphor-performance.vercel.app/). No manual application upload was used.
- Vercel build logs: 376 tests passed, 8 opt-in probes skipped, zero failures; typecheck, build and distribution verification passed. Build revision `c59123912a9760bc`; 74 application assets. All 75 public URLs (including both `/` and `/index.html`) matched the local distribution byte-for-byte. `/.openai/hosting.json` and `/.vercelignore` returned 404.
- Fresh installed-Chrome smoke on the production alias: catalog populated with 304 looks and all 36 families, local preview rendered non-black pixels, catalog search worked, zero page errors. Screenshot inspected. This is a hosted release smoke, not a new rig-performance or all-family aesthetic acceptance claim. Existing cached shows must use **Update app** to activate the new offline generation.

## 2026-10-10 — Automatic main releases configured (D70)

- `INCREMENTAL / EMPIRICAL`: production was still serving revision `6981791fa1e6262e`, with the page grid and no `catalog.mjs` (HTTP 404). Vercel's latest deployment was READY but dated 2026-10-09 01:21 Berlin time; later catalog/family commits had been pushed without a release. The project had no Git connection, and GitHub CI only verified builds.
- Connected the existing `phosphor-performance` project to `fabianxvogt/phosphor`; confirmed `productionBranch: main`, repository-root build, Node 24, `npm ci`, tests → typecheck → build → distribution verification, and output `dist`. `vercel.json` versions those build settings and permits automatic deployments only from `main`.
- Bounded independent release review found provider metadata copied into `dist` could become public under Git builds. Removed both copies. The real-build regression fails against the old builder (extra `.openai` and `.vercelignore` entries) and passes against the fixed builder. No credentials were changed or added.
- Verification: 375 existing tests passed, 8 opt-in probes skipped; both pipeline asset tests passed with the added metadata regression. Typecheck, build and distribution verification passed: 74 app assets, revision `c59123912a9760bc`. Existing full browser/contact CI for the unchanged app passed in run `38005326602`. Next integration check: push this configuration to `main`, observe a Git-triggered READY production deployment, compare its public bytes and check metadata URLs return 404. Show/rig acceptance is unchanged.

## 2026-10-09 — Catalog, rated autopilot, Next, resolution (D65–D67)

- `INCREMENTAL / EMPIRICAL`: `catalog.mjs` lists all 104 authored looks of the 17 families (ids `<sceneId>:<preset>`, variants from the type labels, e.g. `pulse:Square Tunnel` → "tunnel"; labels without a list fall back to head and value, e.g. "Composition 2"). Unit tests cover sorting (rated desc, unrated, 0 last; ties by family number and preset index), weighted picks (16 000 draws within 2 % of 10:5:1, never a 0, exclusions fall back), rating validation (malformed entries dropped, unknown looks kept), the initial set (all looks on eight pages, types first, every page mixed, no Lab), the one-time Lab → Page 8 and 2.1 MP → native normalisation (stored once, a later deliberate choice kept), random durations (8/12/16 each ≈ 1/3 over 4 000 bars), catalog source playback (page/slot −1, show palette and energy kept, 16/24/32 s gaps at 120 BPM, drift on catalog clips), crossfade/dissolve/melt shares 60/20/20 ± 7 %, the last 24 looks never repeated, Next (next beat, 6 s fade, not a takeover, works with autopilot off, re-arms the duration), Shift+Space and MIDI `next`, crash restore of a catalog look by id, control↔stage handoff of history and duration, and the governor ladder 8.3 → 2.1 → 1 → 0.5 MP. 237 unit tests pass; typecheck, build and `check:dist` pass.
- Warm-up probe (headless SwiftShader, lab page, 160×90): for all nine simulation families a crossfade's elapsed time stayed exactly 0 for the 19 warm-up frames and then advanced one tick per frame; every fade finished. With smootherstep the first frame after warm-up mixes ≈ 6·10⁻⁶ of the new picture (2 s fade; ≈ 2·10⁻⁷ for a regular 6 s autopilot fade).
- Thumbnails in the lab page with the real `Thumbnails` class: Pulse 9.6 s (incl. compile), Acid 63 s (simulation warm-up), Flight 6 s, Julia 2 s on a machine at load average ≈ 9 (2 cores shared with four other workers); in the control window (preview frozen) 25–100 s each. Images checked by eye. Real-GPU timing is still to be measured on the rig.
- Fixed on the way: any set message from the control reset the stage governor to the set's pixel budget, undoing a slow-frame downgrade (D45); with ratings now sent in bursts this would have happened often. Only a changed budget setting resets it now.
- Control screenshots at 1280×800, 1440×900 and 1920×1080 (with and without a stage) inspected: the catalog sits under the grid in the main column, 4 cards per row at 1280, 7 at 1920, no horizontal scroll.

## 2026-10-09 — Transitions (D58), audio feature bus (D61), Tapestry energy (D60)

- `INCREMENTAL / EMPIRICAL`: clips carry an optional v4 `transition`. Manual `auto` = smoothstep crossfade; `cut` waits for the downbeat; `dissolve` is an animated soft noise threshold; `melt` warps the captured outgoing picture (zoom/rotation/displacement, own history pair, not echo's) while the incoming fades in. Autopilot turns any `cut` into a crossfade (D50), uses seeded melt/dissolve in breakdowns and a one-bar melt on drops. Both RGBA16F and RGBA8 paths passed easing, dissolve, melt, interruption and texture-accounting probes on the rig; transition p99 crossfade 18.4 / dissolve 17.8 / melt 17.6 ms (Flight, 1920×1080, energy 0.95, 7 s each); Flight family gate 17.6 ms all paths. Mid-transition frames: `artifacts/browser/transitions/`. Review: no findings.
- Audio bus: attack/release low/mid/high envelopes, onset, positive spectral flux, adaptive-threshold hits (120 ms refractory). Each gated family declares three heroes capped at ±0.18 of the parameter range (40 ms attack / 180 ms release), applied after energy curves; bloom follows the low band within its ceiling. Audio counts only with signal and tracker lock; otherwise weights smoothstep to the clock kick over 2 s. Real-audio check on the rig (`songs/DJOKO, Kolter - Ventura.mp3` via Rehearse with file, seek 65 s): lock after 7.2 s at 126.0 BPM, 6–7 hits per 3 s per family (≈ kicks), low 0.08–0.87, flux 0.09–0.54, all 18 heroes moved (e.g. Flight glow 0.63–0.74, Pulse thickness 0.18–0.20); source off → audio weight 0.5 at 1 s, clock-only at 2.02 s, kick delta 0. Zero GPU/non-finite/page errors. Dead `engine.mappings` loop removed.
- Tapestry: seed shape 3 energy score 0.108 → 0.411 (others 0.21 / 0.16 / 0.22, unchanged character), no within-family near pairs (min 0.351), mean luminance across 24 palettes +26 %; rig p99 17.6 ms. Pulse (reworked) energy scores 0.87 / 0.69 / 0.40 / 0.69.
- Verification: 210 unit tests passed; `npm run test:browser` passed (transitions lane); typecheck clean.

## 2026-10-09 — Float picture path and energy-driven post (D56); Flight, Cathedral, Pulse, Interference reworks (D60, D62)

- `INCREMENTAL / EMPIRICAL`: slot pictures, mix, bloom and echo are RGBA16F when `EXT_color_buffer_float` exists (RGBA8 fallback); simulation state and the limiter's mean codec stay RGBA8; previous-frame readers keep 8-bit emission so feedback stays bounded. Float emit is capped at 64 and a non-finite limiter mean counts as worst case (review hardening). Bloom/echo/chroma/grain/vignette = set ceiling × energy curve; grain and vignette start at energy 0.3 (defaults 0.12 / 0.15, optional v4 fields); blackout and master 0 stay exactly black.
- Rig timing (M3 Pro, ANGLE Metal, 1920×1080, energy 0.95, lock-isolated, load checks empty): Flight and Cathedral p99 17.6–17.7 ms before and after the float path; after the headliner rework Flight 17.6–17.7, Cathedral 17.6–17.7 (max 25.6 ms); Interference 17.6–17.7; Pulse 17.6 every form. Zero GPU errors, non-finite inputs, step reductions or downgrades. One unexplained 101 ms max frame in Flight path 0 during the float run (p99 unaffected).
- Energy metric (SwiftShader 160×90 compact): Cathedral 0.34 / 0.28 / 0.26 / 0.20 (was 0.23 / 0.11 / 0.12 / 0.20), Flight 0.35–0.48, Interference 0.32–0.57 with motion deltas 0.019–0.046 (was ≤ 0.001); Pulse reworked to dense kick-cut strobe geometry, rig-timed but its final metric/packet numbers were cut short when the lane was stopped to ship — re-run `npm run contact -- --sheet energy --family pulse` before sign-off. No within-family near pairs for the headliners; Interference 0 near pairs; Cathedral palette weight 0.32 → 0.78.
- Verification: 183 unit tests passed; `npm run test:browser` passed all 16 checks on the merged Step 3 + headliners + Interference build. Production deploy `dpl_2DscmiHhVodK3osgGZ7u93jhJNTn` (Step 3 + headliners + Interference): float path active on the stage, zero GPU errors/non-finite across Cathedral/Flight/Interference triggers at energy 1.0, Cathedral steady over 15 s at defaults (no haze build-up). Observation for sign-off: the new Interference wave floor reads greyish/hazy at energy 1.0.

## 2026-10-08 — Structural energy metric (D60) and output blackout runner (D63)

- `EXPLORATORY / EMPIRICAL`: `npm run contact -- --sheet energy` renders each declared type at energy 0.1 and 0.9 (clip base 0.5, fixed seed) and scores `hypot(S, |M(0.9) − M(0.1)|)`: S is the structure-signature distance of time-averaged grayscale frames normalised per frame to zero mean / fixed spread (brightness, contrast and uniform tint cancel; frames with spread below 2/255 count as flat), M is mean frame-to-frame change. Synthetic checks: exposure/tint only < 1e-6, added detail 0.85, faster motion 0.20.
- Compact run (SwiftShader, 160×90, seed 17, 12 samples at 30 Hz; 480×270 software runs exceeded an hour): gated families score Feedback 0.39–0.54, Tapestry 0.11–0.22, Cathedral 0.11–0.23, Interference 0.33–0.39, Pulse 0.32–0.52, Flight 0.35–0.48; references Acid 0.21–0.53, Swarm 0.07–0.71. **Provisional threshold 0.15** (gap between 0.108–0.123 and 0.166) flags Cathedral geometry 1 and 2, Tapestry seed shape 3 and Swarm form 3. Pulse passes on structure, but its motion barely changes with energy (motion delta ≤ 0.0004; per-frame motion ~0.001 at both levels), as does Interference's (≤ 0.001) — consistent with the live observation that their peaks don't feel faster. The metric measures change, not excitement; the reworks (D60) target motion explicitly.
- `npm run blackout -- [--rig] [--trials 20] [--screen N]`: installed Chrome, control + fullscreen stage on the chosen display, independent `getDisplayMedia` capture of that screen, real stage Escape keypresses timed against the first captured frame below 1/255 mean luminance; ten white→black DOM calibrations report the capture pipeline separately; PASS iff max trial ≤ two display frames + calibration median. On this Mac both the built-in display and the Odyssey G85SB stopped at `getDisplayMedia` → `NotReadableError` (macOS Screen Recording permission for Chrome not granted). **Owner action:** enable Chrome under System Settings › Privacy & Security › Screen & System Audio Recording, relaunch Chrome, rerun. No latency numbers yet.
- Reviews: metric gain floor and blackout single-display source name / median allowance fixed before merge. Verification: 173 unit tests passed, four skipped; typecheck and format clean; both contact sheets smoke-rendered after the merge.
- Deployed source `bdcd1b5` / distribution `80debabd85b4482c` to [production](https://phosphor-performance.vercel.app/) as `dpl_C8xd5fxcdSFJKmGVNHhscrxXuZ6a` (READY). A first deploy attempt ran after the rebuild had dropped the `dist/.vercel` link and created a stray Vercel project `dist`; it was removed within a minute and production re-deployed after re-linking (always link immediately before deploying). Fresh-Chrome public smoke: stage palette Phosphor → Copper on manual triggers, control Escape blacked out the stage and recovered, pill "Stage live", GPU errors 0, zero page errors.

## 2026-10-08 — Set v4, palette library and palette autopilot (D57, D59); stage ownership (D64)

- `INCREMENTAL / EMPIRICAL`: `palettes.mjs` holds 24 mood-tagged palettes (the former lime/blue/pink is `phosphor`). Sets are `phosphor-set-v4`: a clip names a library palette or `custom`, a page may carry a mood. v3 migrates losslessly (all clips `custom`, colours kept, moods null); the v3 storage entry is kept. Manual triggers adopt the clip's palette; autopilot triggers keep the show palette; palette changes glide over four beats. Palette autopilot steps every 64–128 bars from the page mood (never the last three) and jumps to a contrasting palette on drops; manual input pauses it; master/hue/zoom/mirror do not. Default page 1: 30 gated clips on 22 palettes.
- Browser smoke on the built `dist` (fresh installed Chrome): stage trigger from Phosphor to Ember glided over ~2.5 s (mean RGB 81/62/67 → 25/19/14 in ten monotone samples), status showed the palette name, GPU errors and non-finite 0. A real v3 set written by the previous release (`1c9810d` modules, 62 clips, custom colours `#123456/#abcdef/#fedcba` on slot 1) loaded with its name, 30 page-1 clips, colours and a `Custom` selector intact, and the v3 entry retained. The lane's own headless run reported 115 distinct interpolated palettes over 137 frames, max channel step 3/255.
- Owner curation sheet: `npm run contact -- --sheet palettes --width 320 --height 180 --frames 60` rendered 24 palettes × six gated families (144 PNGs, `artifacts/contact/palettes/index.html`, local only); no near-black renders (min mean linear luminance 0.0095, min peak 126/255). Cathedral's glass keeps its material hues (palette weight 0.32), so palettes change it least; Tapestry stays dark on every palette. Keep/reject is the owner's call (D57).
- Independent review: no blockers. Fixed: palette-glide params could rewrite a still-playing clip after a failed load (stage and preview now resolve the live snapshot when applying); shared mixer moves no longer pause autopilot; an unreadable-save report no longer points at an older backup; the glide preparses endpoints and emits only when an 8-bit colour changes.
- **Ownership bug (D64):** `npm run test:browser` failed intermittently because the control treated a 2 s gap in stage status as "stage gone" and routed performer keys to its local preview. Instrumented repro: Escape on the control with status age 4.7 s went to the preview, never to the stage; stage `Engine.advance` peaked at 3.3 s under SwiftShader, `Show.tick` at 0.2 ms. The control now keeps ownership while the known stage window is open (recovered after a control reload via the stage's preview attachment). A regression pausing status reports beyond 2.5 s failed before and passes after. This was a real show risk, not a harness artefact: a GPU stall would have sent blackout to the preview.
- Verification: 167 unit tests passed, four opt-in probes skipped; typecheck, build and distribution check passed; `npm run test:browser` passed twice consecutively (16 checks, 104 looks; software GPU).

## 2026-10-08 — Review bug batch (D53–D55) and CC-mix beat evaluation (D63)

- `INCREMENTAL / EMPIRICAL`: live test of production in fresh installed Chrome found every default clip on one palette, one linear transition, peak energy barely distinct from mid, and these show bugs: firing a clip reset energy to the clip's 0.5 (undoing autopilot build/breakdown/drop; auto-flash never reached), opening the control window paused autopilot for 32 bars, drafts in the autopilot pool, older saved sets (the owner's migrated "Living systems" set) lacking Pulse Geometry and Fractal Flight, and Escape on the fullscreen stage both blacking out and exiting fullscreen, after which the stage showed its start overlay.
- Fixes: energy is show state; load actions carry `energy` (show level) and `baseEnergy` (the clip's authored level, the engine's curve origin). Autopilot anchors each breakdown/build/drop chain and settles back 32 bars after the drop (8 simulated cycles: max 0.8, back to 0.5 before each breakdown; without the anchor it ratcheted to 1.0). The safe look's 0.15 resumes the prior level on the next clip. Page 1 holds every type of the six gated families; drafts sit on **Lab** with autopilot off; **Add missing families** fills empty Lab slots. Opening/importing no longer pauses autopilot. The stage locks Escape (`navigator.keyboard.lock`) and never re-shows UI after starting; the control pill reports **Stage not fullscreen** and a click on the stage returns.
- `scripts/family-timing.mjs` previously reached its `--level` only because a trigger reset show energy, with base = level, so energy curves never moved parameters during timing. It now sets show energy and auditions at the authored energy, so curves apply at peak. **The six gated families' rig timings predate this and must be re-run on the rig.**
- Local Chrome smoke on the built `dist`: control start showed "random · next in 31 bars"; Lab page and 24 gated clips on page 1; energy 1.0 survived six consecutive triggers; Escape → blackout with fullscreen kept; `exitFullscreen()` → overlay stayed hidden, pill "Stage not fullscreen · click the stage", one click → fullscreen and "Stage live"; an injected 10-family set listed the 7 missing families and the action placed them (Pulse/Flight autopilot-on). The suspected dropped Tapestry trigger did not reproduce (seven triggers at energy 1.0 all landed). Synthetic CDP Escape exercises the page path, not Chrome's own exit without the lock.
- Independent review: no blockers; its findings (timing runner, energy ratchet, safe-look leak, gated types missing from page 1, restored energy overwritten by `begin`, vacuous failed-family tests) were fixed with regression tests.
- **Beat tracking on CC DJ mixes (D63):** five Toucan Music netlabel mixes from Internet Archive (`metadata.licenseurl` CC BY-NC / BY-NC-ND / BY-NC-SA; 624 MB, MD5-verified, kept outside the repo in `~/Music/phosphor-cc-mixes/`), first 30 min each with `npm run beat:eval`. Scored beats: 5,947 / 5,951 within 20 ms, but only 33 % of emitted beats are scorable, and tou2017 07:00–07:30 has four scored beats at 115–116 ms (the printed "100 %" is rounded). Lock stays asserted through tracker tempo excursions to ~101–105 and 148–150 BPM; eight-beat relock and 32-bar landing are not measurable without annotations (tou2019 coasted 129 beats at constant tempo). Verdict: targets **not met / not measurable**; per D63, selecting the line input now switches the clock to manual tempo, while demo and files keep following. Single-label, software-assembled corpus. Tuning leads: rounding hides misses, lock is sticky, repeated ~101.7 BPM false-period attractor, long unscored windows (tou2016 19:00–23:30, tou2017 20:30–27:30).
- Verification: 149 unit tests passed, four opt-in probes skipped; `npm run test:browser` passed all 14 checks (software GPU, no timing gates); typecheck, build and distribution check passed.
- Deployed source `ed717fb` / distribution `bfa8d0b3120dec11` to [production](https://phosphor-performance.vercel.app/) as `dpl_3ye5gNSuSJ34TxnvM36iK8Qk9Rdy` (READY); `/.env.local` returns 404. Fresh-Chrome public smoke: control start "random · next in 31 bars", Lab page present, stage Escape → blackout with fullscreen kept, energy 0.8 kept across a trigger to Pulse, zero page errors.

## 2026-10-08 — Cached release blocked local controls and live grid clicks

- `INCREMENTAL / EMPIRICAL`: the reported screenshots showed the older Show/Prep UI. Browser inspection found active cache `d68a4c606536af15`, whose `control.mjs` lacks the local-performance handler, alongside a newer waiting worker. Prior fresh-context smoke checks did not cover upgrading an existing offline client.
- The exact historical release (`d9fb1de`) reproduced both failures after deploying new assets at the same origin: no-stage Blackout left preview peak RGB 223 instead of zero; clicking Cathedral left the stage on Pulse. No page errors, so exception-only checks could not catch the delivery failure.
- The standalone updater is reachable through that legacy cache as a new path. It precaches the complete release, requests activation, then navigates only after activation and client claim. It does not clear saved sets or reload another window. The stage-blocking repro kept its original clip rendering. Independent reviews found that other legacy control tabs must also block activation: otherwise their unload handler could overwrite edits made in the new generation. The final guard admits only the requesting updater window.
- Installed-Chrome checks on current controls measured actual pixels: Hue, Zoom, Mirror and Energy each changed the output; Master zero and Blackout were exact black; Freeze held pixels within one RGB level of temporal grain. Actual simulation speed measured approximately 1.01 / 0.50 / 1.97 for normal / half / double. Held Flash reached a rendered flash envelope of 0.986 and released; Safe look restored a non-black Interference render. Random off kept the renderer's authored snapshot; Random on glided it; Autopilot changed the rendered family to Pulse.
- The multi-legacy-tab fixture exposed a pre-existing `renderDevices` exception when one old control received another old control's device request. This occurred before cutover in historical `control.mjs`; it is retained in the diagnostic output, not counted as an error of the updated client. New-generation page errors are checked separately.
- Production revision `6ba2c1aae39213b6` is live at [Phosphor](https://phosphor-performance.vercel.app/), with the [standalone updater](https://phosphor-performance.vercel.app/update.html). The cached-release repro fetched the new generation's actual production bytes: both multi-window guards passed, old saved clips survived, a newly saved edit survived reload, Blackout measured exact black and a grid click rendered Cathedral on the stage. A separate anonymous fresh-profile install and the complete pictured-control pixel/clock probe passed against the public URL with zero updated-client page errors. Actual stage and no-stage screenshots were inspected.
- Verification: 144 tests passed, four opt-in probes skipped; typecheck, build, distribution verification and formatting passed. These checks do not close the external-display endurance or real-DJ-mix gates.

## 2026-10-08 — Unified local/live controls and optional settings lock

- `INCREMENTAL / EMPIRICAL`: local performance reuses `Show` and the existing editor renderer; all performer controls act without a stage. Opening the stage transfers the current performed snapshot, including unsaved parameter tweaks. Configuration remains visible and editable with a stage; **Lock settings** is optional, stage-only, and disables configuration without blocking grid triggers, performer controls, audition or export.
- Installed-Chrome smoke exercised actual rendered output: local blackout and master zero produced exact black; safe look and recovery produced non-black output; freeze held geometry with at most one RGB level of temporal-grain difference. Stage handoff retained energy 0.83, speed 0.5, master 0.73, hue 0.27, zoom 1.3, mirror 3, the live family parameter, manual 126 BPM, freeze and disabled autopilot/Random.
- Live grid clicks triggered clips; clip and set edits reached the stage. Locking disabled clip/set/audio/MIDI configuration while leaving grid and performance usable; unlocking restored editing. Control reload left the stage playing. Stage closure cleared the lock and resumed the last reported live state locally, including blackout/recovery. Zero page errors. Local and locked screenshots inspected.
- The smoke exposed a disconnect race: local rendering could resume before the one-second fallback timer restored the last stage state. Restoration now precedes fallback ticks, actions and status reads; the previously failing acknowledged-blackout handoff passed on the packaged build.
- Independent Standards and Spec reviews found three additional boundaries. The Chrome repro failed before fixes: changing the stage page redirected an editor save and raised `Duplicate clip id`; editing Acid after closing a Magnetic-playing stage left Magnetic as the actual renderer; Space on the lock switch did not toggle it. After fixes, the original page received the edit, the other page's slot was unchanged, the actual renderer was Acid, and Space enabled the lock; zero repro failures. The editor now owns a stable save target and snapshot-only edits require a matching live clip and renderer scene.
- Verification: 144 tests passed, four opt-in probes skipped; typecheck, distribution/offline verification and formatting passed. These are functional checks, not external-display endurance or real-DJ-mix acceptance.
- Both independent reviews accepted the settled fixes with no remaining actionable findings. Deployed source `317c37a` / distribution `838254288d3f2312` to [production](https://phosphor-performance.vercel.app/) as Vercel deployment `dpl_J8aRh6p3jvcmtJX1xWUuto8bMnzY` (`READY`). Installed-Chrome checks against the public URL passed the complete local/live workflow and all three review-boundary repros, with zero page errors; deployed local-control screenshot inspected.

## 2026-10-08 — Demo sound without opening the stage

- `INCREMENTAL / EMPIRICAL`: the control window reuses `AudioEngine` for the 120 BPM demo, activated by the first click or key press. No audio context is created before interaction and no microphone is requested. Stage opening/status stops local sources, including an in-flight startup; the demo resumes after stage closure if still selected. Off persists across further gestures and the heartbeat; Demo beat re-enables it; local mute uses the existing monitor gain.
- Installed-Chrome smoke measured the real signal at nodes connected to `AudioContext.destination`, not just UI flags: local demo RMS 0.0713 with only the control window open; Off yielded exact zero and stayed silent after another grid click; mute reduced destination RMS below 0.00001; unmute restored signal. Repeated activation reused one local context.
- Stage handoff: local destination signal was zero while the stage produced RMS 0.0106; after closing the stage, the local demo resumed. Zero page errors. Measurement confirms a live speaker-output signal, not physical speaker volume or a human listening assessment.
- Verification: 144 tests passed, four opt-in browser probes skipped; typecheck, build, distribution/offline verification and format check passed. Distribution revision `d68a4c606536af15`.
- Deployed source `d9fb1de` to [production](https://phosphor-performance.vercel.app/) as `dpl_YEGG67up52aGtdpcdvhpdoPSMo3h` (READY). Fresh-Chrome public-URL smoke passed the same activation, Off, mute, stage-handoff and resume checks: local RMS 0.1513, stage RMS 0.0936, local silence during stage ownership, zero page errors.

## 2026-10-08 — Selected visual preview without a stage

- `INCREMENTAL / EMPIRICAL`: the main preview reuses the editor's rendered canvas at 480×270 / 30 Hz while no live stage stream is available. No extra WebGL engine or audio context is created. A connected stage takes over the monitor; closing it restores the selected clip.
- Installed-Chrome smoke against the source: initial visual visible with only the control window open; selecting Prismatic Nave changed the main preview; opening the stage switched to live video; closing it restored the local preview with no empty overlay. Zero page errors; screenshot inspected.
- Verification: 144 tests passed, four opt-in browser probes skipped; typecheck, build, distribution/offline verification and format check passed. Distribution revision `f53a4b9398c064a5`.
- Deployed source `4812543` to [production](https://phosphor-performance.vercel.app/) as Vercel deployment `dpl_28pSHnyVyZE9bUXomugKFvQWWK6m` (READY). The same fresh-Chrome smoke passed against the public URL: initial preview without a stage, selection change, live-stream handoff and local-preview restoration; zero page errors.

## 2026-10-08 — Current VJ instrument deployed to production

- Owner requested deployment of everything; published the complete verified application distribution, not local music or generated research artifacts. `INCREMENTAL / EMPIRICAL`.
- Source `166ffbe`; distribution revision `5bf07cc48a03e25f`. `npm run build` generated 47 reachable assets; `npm run check:dist` verified 46 distribution assets and the revisioned offline cache. [CI](https://github.com/fabianxvogt/phosphor/actions/runs/37778081169) passed tests, build, distribution verification, typecheck, browser smoke, contact renders and formatting.
- Vercel production deployment `dpl_9Ai7xFKeWRKkxbLWpsXDMYsvhFCj` is READY at [phosphor-performance.vercel.app](https://phosphor-performance.vercel.app/). Uploaded only `dist`, with `.env*`, `.vercel`, `.openai` and upload metadata excluded.
- Live production smoke in fresh installed Chrome: control opened the stage; demo audio locked at 120.06 BPM; keyboard `3` selected Prismatic Nave (slot 2); Escape enabled blackout and a second Escape restored it; control preview displayed the stage; zero page errors. The deployed tracker module returned HTTP 200 and contained the new kick-body and comb-phase implementation.
- Existing offline sessions may retain the previous build until all Phosphor windows close. Deployment does not certify real DJ-mix transitions, line input or external-display eight-hour endurance; those acceptance checks remain open.

## 2026-10-08 — Beat tracker follows the kick, not the bassline

- `EMPIRICAL` Diagnosis on the owner's tracks: once the bassline enters, beat-synchronous flux per band (against a fitted constant-tempo grid) peaks on the beat only between 150 Hz and 2 kHz; below 150 Hz it peaks on the off-beat (Track C) or a sixteenth before the beat (Track A), above 2 kHz on the off-beat (open hats). The old tracker listened mostly below 150 Hz and slid half a beat (Track C after a re-acquisition at 95 s) or wandered (Track A).
- Change (`beat-tracker.mjs`): onsets weighted toward a 150–2000 Hz kick-body band (sub 0.5, hats 0.15); phase corrections from a comb over the last eight beats instead of the single strongest onset; tempo from a straight line through the last 32 observed beats; acquisition searches tempo ±1 % jointly with phase (the autocorrelation estimate is coarse at 10 ms frames: 130.45 for a 131 BPM click track).
- `EMPIRICAL` Same evaluator before → after (`npm run beat:eval -- songs/*.mp3 --constant-tempo`; one-grid fit to the agreeing kick attacks, ≥ 497 anchors per track after the change):

  | Track | Tempo jumps > 1 BPM | Phase vs constant grid: median | ≤ 20 ms |
  | --- | --- | --- | --- |
  | Track A (126 BPM) | 29 → 0 | 120 → 1.1 ms | 27 % → 100 % |
  | Track B (124 BPM) | 8 → 0 | 13 → 2.9 ms | 71 % → 94 % |
  | Track C (129 BPM) | 14 → 0 | 226 → 1.5 ms | 15 % → 99 % |

  Tempo p10/p50/p90 is now exactly 126.0 / 124.0 / 129.0; first lock ~7 s unchanged. Synthetic suite 12/12 (tempo changes relock within 8 beats, 32-bar breakdown coasts within ±6 ms, 44.1 kHz, noise never locks). The demo beat rendered offline locks at 120.00 BPM with 0 ms phase error; in installed Chrome the stage locked the demo at 120.0 BPM within 8 s. In headless SwiftShader under heavy machine load the demo did not lock (timer-driven demo scheduling starves); not a tracker result.
- Still untested: DJ mixes (tempo changes between tracks, long breakdowns on real music, line input). Auto tracking meets its phase target on three produced tracks only.

## 2026-10-08 — Owner sign-off and first real-music beat check

- Owner approved all six group 1–2 packets (D51); with rig timing passed, Feedback, Tapestry, Cathedral, Interference, Pulse Geometry and Fractal Flight pass the family gate.
- `EMPIRICAL` `npm run beat:eval` on the owner's three produced tracks (MP3 via ffmpeg, local only, `songs/` ignored by Git). Tempos are steady and right; phase is not yet good enough:

  | Track | Length | First lock | Locked | Tempo p10/p50/p90 | Phase vs kick: median / p90 | ≤ 20 ms |
  | --- | --- | --- | --- | --- | --- | --- |
  | Track A (house) | 5.9 min | 6.8 s | 98.1 % | 125.4 / 126.0 / 126.8 | 53 / 107 ms | 26 % |
  | Track B (deep house) | 7.3 min | 6.9 s | 98.4 % | 123.8 / 124.0 / 124.2 | 10 / 74 ms | 68 % |
  | Track C (house) | 6.3 min | 7.1 s | 98.1 % | 128.7 / 129.0 / 129.4 | 27 / 99 ms | 41 % |
  | Synthetic kicks, 126 BPM (control) | 1.9 min | 6.7 s | 94.2 % | 126.0 | 8 / 11 ms | 99 % |

  Phase is measured against the strongest low-band attack within ±120 ms of each predicted beat, a heuristic reference (busy basslines can pull it off the kick); the synthetic control shows its own offset is ~8 ms. Tempo jumps above 1 BPM: 29, 8 and 14. Against the < 20 ms target, automatic tracking does not yet qualify (D24); listening files: `artifacts/beat/*.clicks.wav`. These are produced tracks, not DJ mixes: relock after tempo changes and holding through a 32-bar breakdown are not tested by them.

## 2026-10-08 — Groups 1 and 2: family-gate packets

- `EMPIRICAL` Six parallel lanes (Codex Sol 6.1 xhigh, one branch and worktree per family, headless SwiftShader, own ports) rebuilt failing types and wrote packets in `docs/families/`. Within-family grayscale distinctness at 480×270 (threshold 0.25), before → after: Feedback all six pairs 0.031–0.099 → min 0.288; Tapestry 3 near pairs → min 0.454; Cathedral 5 → min 0.262; Interference 2 → three types, min 0.331 (six compositions consolidated); Pulse 1 (0.238) → min 0.334; Flight 6 → min 0.377.
- `EMPIRICAL` Cross-family flags below 0.25 in each lane's all-family sheet: none for Feedback, Interference, Flight; Tapestry's Cascade (nearest Melt 0.138), Cathedral's Crystals and Roses (0.224–0.245), Pulse's tunnel (Hyperbolic 0.168–0.210). Each of these families keeps at least three unflagged types; the flags are listed for owner judgement.
- `EMPIRICAL` Every lane: `npm test` green, headless lab render of every look (non-blank, WebGL 0, non-finite 0, textures accounted), ladders at 0.1/0.5/0.9 inspected, 640×360 / 1280×360 / 480×480 renders inspected, shared kick response measured at energy 0.9.
- `EMPIRICAL` Real GPU, parent, one family at a time (`npm run timing -- --rig`, Chrome on the M3 Pro, built-in display, 1920×1080, energy 0.95, 30 s per type, with other CPU load on the machine): every type of all six families p50 16.7 ms and p99 17.6–19.7 ms, max ≤ 34.2 ms, GPU errors 0, non-finite 0, no ray-step reduction or downgrade.
- `EMPIRICAL` Interference narrowed its composition range (0–5 → 0–2): a saved show holding a removed value no longer validates. The loader now keeps such a save under `phosphor-set-v3-unreadable` instead of letting the next edit overwrite it (unit-tested).
- Not done: owner art sign-off for any family; external-display and 8-hour show-gate runs.

## 2026-10-08 — Default mode: demo beat, Random autopilot

- `EMPIRICAL` Installed Chrome 154 on the M3 Pro, no autoplay flag, fresh profile: clicking only **Open stage** in the control left the stage's audio context running with the demo beat playing (input level 0.054); four seconds after the stage click the tracker reported 120.0 BPM, locked, confidence 1. Chrome needs that one click: no page can start sound on load alone.
- `EMPIRICAL` Headless smoke (SwiftShader, 124 s, fresh profile): demo source and 120 BPM clock before any stage click; autopilot Random on; a regular change crossfaded over 4 s (8 beats at 120 BPM); within one 40 s Acid run seven continuous parameters drifted (e.g. feed 0.0285 → 0.0268, injection 0.345 → 0.253) while the type parameter stayed fixed; page errors 0.
- `EMPIRICAL` 137/137 unit tests, including: random changes are not page order and crossfade at least 8 beats, drift starts after the fade and repeats every 8 bars, no drift during a manual take-over, in-order mode walks slots 0–7 without drift, drift stays within ±12 % of each range and never moves stepped or type fields, largest per-frame step < 1 % of the widest range, a stage fader stops a glide, a fresh stage begins on a random clip and waits a full period before the next change.

## 2026-10-08 — Platform integration for the first show

- `EMPIRICAL` Merged `lane/image-pipeline` review fixes R1–R6 (flash tracking, black frames, context-loss fence, readback order); dead frame-sequence/offline export path removed (D35). 130/130 unit tests, typecheck, build and `check:dist` (46 assets) pass.
- `EMPIRICAL` Headless Chrome 156 (SwiftShader) `test:browser`: every look renders non-blank with WebGL error 0, non-finite 0 and textures accounted; every family fade returns to one slot; all 10 show checks pass. Two defects found and fixed on the way: Light Beams "Crossfire" aimed both banks off-screen (peak 6/255 before, 211 after; also failing at `aef4269`), and the control rebuilt the shared faders on every status message, so a slider could vanish under focus or pointer (the Esc-under-slider check timed out at `aef4269` too).
- `EMPIRICAL` Throwaway stage smoke (SwiftShader): a forced link failure of the on-screen Acid clip disabled Acid, cut the stage to a Magnetic clip on the same page, struck Acid's three cells through in the grid, and a later press on an Acid key scheduled nothing; page errors 0. Shader introspection marks only Cathedral and Fractal Flight as raymarched; a per-family step budget of 40 reached the engine on load. The stage reported fullscreen, wake lock and framing-pattern facts; the Show-mode confirmation listed every check not ok.
- `EMPIRICAL` Real GPU (Chrome, ANGLE Metal, M3 Pro, built-in display, other apps running): `npm run timing -- --rig --family cathedral --seconds 10` at 1920×1080, energy 0.95: all four geometry types p50 16.7 ms, p99 17.6 ms, GPU errors 0, no step reduction or downgrade. A 10 s smoke of the runner, not the 30 s gate run; Cathedral's types may still change in its lane.
- `EMPIRICAL` The stage/control soak runner (`6ab5c33` onward) judged GPU errors, non-finite inputs and downgrades after its crash-drill reload, i.e. on a fresh page; it now reads them before the reload. Soaks from that runner before this fix verified those counters only for the post-reload seconds.
- `EMPIRICAL` On the real GPU the control reported "stage already running" for the first two seconds after load (its status clock started at 0), so a quick Open stage click did nothing; fixed. Chrome logs repeated "READ-usage buffer was written, then fenced, but written again before being read back" performance warnings from the control window's preview engine; not yet investigated.

## 2026-10-08 — Milestone 1 start

- `EMPIRICAL` Critical review in four independent lanes (fork comparison, app code review, engine/shader review, live browser audit): 12/12 unit tests, build and `check:dist` pass; 24 presets inspected live on Chrome 154 / ANGLE Metal / M3 Pro with no console errors and WebGL error 0. Artist scores: Cathedral 4/5, Magnetic and Phase 2/5, the rest 3/5; no look is a finished hero look.
- `EMPIRICAL` Balanced 1280×720 on a 120 Hz panel, Adaptive off, 10 s per look: Opal Reliquary presentation median/p95 16.7/24.6 ms, Foil Ribbon Eclipse 16.7/17.4 ms. With Adaptive on, idle playback dropped Balanced → Low: the 16 ms render gate misreads 120 Hz callbacks (fix in Milestone 1).
- `EMPIRICAL` Confirmed in source: panic keys ignored while a slider has focus; repeated MIDI connect duplicates message delivery; unclamped keyframe offset can produce NaN snapshots; float seed upload erases seed variation above ~4.85e7; `pow()` on negative bases in Aquarium/Evolution/Magnetic. All scheduled in Milestone 1.
- Release topology: `codex/performance-v2-rebuild` renamed to `main` and made the GitHub default branch; the GitHub Pages mirror and its workflow are retired (Vercel is canonical); the Canvas2D v6 source (`apps/phosphor`) is frozen and tagged `archive/v6-canvas`.

## 2026-09-07 — v2 rebuild release

Recorded at the original release; Pages references are historical.

### Executed evidence

Reference browser: headless Chromium 150, ANGLE Metal on Apple M3 Pro, macOS arm64. Tests used real WebGL2 and readback, not a mocked renderer. Headless timings are not a physical-display/projector guarantee.

- Twelve Node contract/regression tests pass: all 62 authored scene snapshots survive portable-set roundtrip; full-capacity 256-cue/32-keyframe files reopen beyond the old 2 MB limit; imported ancestry drops unsupported properties so compact imports cannot expand into self-rejecting exports; invalid nested values reject before application; keyframe boundaries and palette interpolation; exact elementary-CA fixtures/wrap; deterministic bounded mutation with exact locks; ancestry/select/undo/cap128 and portable default-generated seeds; v1 migration without changing the backup; MIDI clock and Start/Stop/Continue parser behavior.
- Static build and recursive distribution check: 20 distribution assets, local imports, complete versioned offline asset list and substituted cache stamp.
- Actual browser rendering of all 62 looks at 1920×1080 output: no GPU errors, no blank output at the sampled checkpoint. This is not a proof that every parameter combination remains aesthetically useful forever.
- All 18 Acid/Aquarium/Evolution presets ran 300 seconds of accelerated fixed model time each. Endpoint images remained structured/nonblank/nonflat, GPU error zero. This is 90 minutes of aggregate model trajectories, **not** 90 minutes of real-time app endurance, thermal load, or recording.
- Six stateful families produced identical GPU state hashes after equivalent two-second trajectories presented at 60 and 120 Hz on the same GPU. Feedback intentionally depends on presentation history and is not included in that equality claim.
- Actual CA90 GPU history matched its CPU reference at all 512 cells, including seeds 97, 16,777,217 and 2,147,483,647. The maximum seed previously produced 16 incorrect cells because float transport rounded it; a dedicated unsigned uniform now preserves the full integer. Reverse playback increased history offset by 17 while leaving the generated head/count unchanged.
- Melt periodic endpoint images differed at zero pixels on the tested GPU with fixed options/palette; static mode and analytic model do not imply portable bit-exact video.
- Twenty-five cross-scene changes returned to one slot/five textures after completed fades; transitions are bounded to two slots/nine textures. Texture counts are engine-owned targets, not all browser/encoder allocations.
- Thirty rapid interrupted fades followed by completion returned to one slot/five textures with GPU error zero. Interruptions now freeze the current ungraded mix in an existing back buffer instead of snapping to the previous incoming scene; global effects still apply once. Mixed 960/1280 shading budgets introduce small localized resampling differences, not pixel-exact continuity.
- Pause held the output; quality resize preserved it. Blackout reached black and recovered. Source parameters stayed unchanged while demo audio modulated live features. Audio recorded through a separate branch remained live after recording stopped.
- Actual portable import of an HTML-like cue name remained literal text, produced no injected image/handler, and stayed inert after reload. Locked CA rule survived sibling breeding, save and reload with ancestry.
- A synthetic two-hour wall-clock jump in sequential playback landed at the correct cue and remaining duration, rather than restarting the next cue. It tests clock catch-up, **not** a two-hour live set.
- Context-loss extension: latest cue loaded while lost, then restoration rebuilt it with structured output and GPU error zero. Restoration restarts the seed; lost evolving state is not recovered.
- Actual clean-output window received 1280×720 muted video from the control canvas. Simulated hidden-parent visibility produced 116 output-driven callbacks in two seconds. The headless browser did not naturally hide the opener, so OS/window/projector throttling still needs rehearsal.
- Actual file-system writes through an OPFS directory/file handle: 120 PNG frames plus a frozen manifest, PNG dimensions 1280×720; real WebM approximately 2.88 MB decoded 1280×720 and left the main audio context/record track live. Cancellation retained one PNG and a one-frame manifest in a unique directory; its brightness stayed .92 while live brightness changed to .24. **Native chooser UI was bypassed**; user selection, external-disk behavior and permission persistence remain unobserved.
- All four editor tabs are fully visible in a two-column grid at 390 px, without horizontal document overflow. Cue labels/inputs wrap as associated groups rather than splitting “Energy” from its value. Desktop canvas aspect ratio remained 16:9 without stretching.
- Desktop workstation layout keeps preview/transport visible beside controls while scrolling. Built offline reload loaded all ten families from 21 cached URLs with GPU error zero; clean-output fullscreen hid its controls and continued 1280×720 video.
- Rejected-save loss was reproduced before correction. After correction, malformed raw data survived edits in a downloadable recovery key; a synthetic quota failure blocked autosave and retained the original. Paused cue duration editing preserved elapsed time: 7.7 bars remaining became 11.7 after adding four bars, then resumed at 11.6. Injected MIDI protocol messages exercised the app transport and shared-control edge path; this is not physical MIDI verification.
- Shortening an already-paused cue past its elapsed time then resuming advanced immediately to the next cue; a legitimate zero remaining duration no longer restarts that cue.
- At external 200 BPM versus manual 92, a four-beat fade now lasts 1.2 seconds and both demo scheduling/readout follow 200; clock loss returns to 92. With the demo interval deliberately disabled, frame-driven scheduling maintained real analyser energy/onsets rather than decaying to silence. These are runtime clock/scheduler probes, not physical MIDI or hidden-window certification.
- A valid 5,135,572-byte exported score was rejected by the old 2 MB import limit. The shared file reader now accepts the bounded schema up to 32 MB; actual import preserved all 256 cues/32 keyframes, including the last snapshot and offset. Filling native local storage until `QuotaExceededError`, then editing a cue, produced a clear export-required status and prevented a cancelable unload event. Native closing-dialog presentation was not exercised.

### Endurance and preparation limits

An actual two-hour offline/demo/clean-output run was started against cache generation `7096c69c59d0a941`, with a 92 BPM looping score and monitoring muted. After the elapsed-time barrier, CDP evaluation failed, diagnostics hung and killed the managed tab, and a fresh tab initially also timed out. Its in-page minute samples were not recoverable. **This is an inconclusive/failed verification attempt, not a passed two-hour soak.** Browser/tooling/shared-host failure versus application failure is unresolved; no frame, memory or scene-coverage totals are claimed.

After restarting the owned automation browser, a real 65-second rapid-score run covered all ten families: zero sampled GPU errors, at most two slots/nine textures, final Low quality, 33.4 ms frame median and 358.4 ms p95. Those timings do not clear the smooth-show gate. Native UI/browser/build operations also became substantially slower on the shared host; resource contention does not excuse an unverified show.

Inspection and synchronized GPU measurement identified a bounded preparation concern: `load` submitted 120 simulation ticks synchronously (Acid measured 149.8 ms in that probe). Preparation now submits at most six ticks per callback and holds automatic fading until ready; actual GPU checks exercised 114 remaining ticks → 19 paused callbacks → ready, then fade advancement on the next live tick. All 62 looks compile/render without GPU errors; feedback starts dim and evolves rather than being prewarmed as a field. Thirty rapid interruptions plus completion returned to one slot/five textures. Later host timings were incomparable, so no numerical latency improvement is claimed.
Focused engine review caught the export consumer capturing preparation as movie frames. The exporter now completes preparation with cancellable, yielded `advance(0, true)` calls before counted frame zero. Actual Phase export wrote 120 PNGs plus its manifest; the last frame decoded at 1280×720, GPU error was zero, and the first PNG's SHA-256 exactly matched a separately prepared reset renderer. The reviewer accepted the consumer correction. Native directory-picker UI remained bypassed with a real OPFS handle.

### Public deployment

The owner-requested rebuild is live on [Vercel](https://phosphor-performance.vercel.app/), with a [GitHub Pages mirror](https://fabianxvogt.github.io/phosphor/), from [`codex/performance-v2-rebuild`](https://github.com/fabianxvogt/phosphor/tree/codex/performance-v2-rebuild). The Vercel production project is `fabianxvogts-projects/phosphor-performance`, deployed from the reviewed static `dist` directory without a server or Git integration. No paid plan was enabled. The [Pages release workflow](https://github.com/fabianxvogt/phosphor/actions/runs/37693181313) passed tests/build/distribution/upload/deploy using Node24 and supported actions. The older ChatGPT Site and `codex/v1` source remain unchanged.

Actual public-site verification: all ten families rendered with GPU error zero and no browser errors; offline reload loaded ten families from 21 cached URLs in revision `b704c71109ee6927`; the 390 px surface had no horizontal overflow and all four tabs were visible. Clean output received muted, playing 1280×720 video, entered fullscreen and hid its controls.

A real 65.8-second public rapid-score run at 120 BPM, one-bar cues, original demo analysis and muted monitoring covered all ten families through normal animation callbacks: 3,923 rendered callbacks, final Balanced quality, frame median 16.7 ms and p95 16.8 ms, no sampled GPU errors, at most two slots/nine textures. These are actual callback timings, not synthetic `advance(1/60)` timings. This is a short hosted smoke, **not** a two-hour soak, a controlled performance comparison, or physical audio/MIDI/projector certification.

Vercel-specific checks passed against the unauthenticated production alias: all ten families rendered with GPU error zero and no browser errors, offline reload used 21 URLs in revision `b704c71109ee6927`, the 390 px surface had no horizontal overflow, and fullscreen output played muted 1280×720 video with its controls hidden. The 65.8-second timed run above was on the identical GitHub Pages build, not repeated on Vercel.

### Interrupted-transition refinement

Actual Acid → Interference half-fade interrupted by Cathedral, 320×180, brightness .72, bloom .2 and kaleidoscope 3. Differences compare the displayed frame immediately before and after interruption.

| Metric, channel range 0–255  | Before | After |
| ---------------------------- | -----: | ----: |
| Mean absolute channel change | 18.192 | 0.132 |
| Maximum channel change       |     80 |     1 |

### Measured ribbon refinement

Synchronized render-plus-readback cost, 1920×1080 output. Before: 12 samples per look. After: 60 samples after warmup; ribbons shade at 960×540 and upscale through the shared compositor. Different sample sizes and transient scheduling limit comparison; these are not sustained FPS claims.

| Look                | Before median ms | After median ms | After p95 ms |
| ------------------- | ---------------: | --------------: | -----------: |
| Velvet Woven Orbit  |             38.2 |             8.2 |         10.7 |
| Foil Ribbon Eclipse |             29.7 |             8.4 |         10.9 |

Other measured default looks had lower median synchronized costs than the uncapped ribbons; preset warmup and competing GPU work produced transient spikes. Keep Balanced as the default, retain the adaptive governor, and rehearse the actual cue sequence rather than extrapolating a microbenchmark into a guarantee.

The isolated live Foil Ribbon Eclipse run at 1920×1080 output delivered 888 rendered callbacks over 15 seconds: median interval 16.7 ms, p95 16.8 ms, no adaptive downgrade or GPU error. This short real-time run is not a thermal or multi-hour endurance result. Quality changes now reset timing history rather than inheriting measurements from the old budget.

### Independent review

Ten owner-requested Sol 6.1 medium workers implemented one scene each against a shared contract. Separate engine/offline/output and workflow reviews identified integration defects; fixes cover cue identity, manual override, clock/edge semantics, source ownership, recording bounds, export snapshots, cache generations, context recovery, hidden output and responsive layout. Focused final reviews reported no additional findings in interrupted-transition buffer ownership/global grading, shading budgets, source-worker cache behavior, effective tempo, demo scheduling/teardown and recording setup. Workflow review also exposed transport edges; runtime verification and fixes followed. Review is bounded evidence, not proof that the entire application contains no defects.

Final persistence review found retained, unsupported lineage properties could inflate pretty-printed exports beyond the import bound. Canonical field whitelisting fixes it; the regression failed before and passed after. Actual browser File/DOM ingestion of an 8 MB synthetic extension produced an 8,454-byte canonical set that reopened successfully, with structured output and GPU error zero. A separate security review reported no evidence-backed finding in its bounded import/DOM/audio/output/cache read set; this is not a security certification.


## Languages (2026-10-12)

**INCREMENTAL / EMPIRICAL.** German and English now cover the control window,
all 328 built-in looks, family/variant descriptions, parameters, rhythm gestures,
palettes, setup, accessibility labels, status/error messages, Stage, framing pattern
and updater. `i18n/en.mjs` and `i18n/de.mjs` contain 1,728 matching messages.
Browser language preference order selects `de` or `en`, including regional tags;
unsupported preferences fall back to English. Numbers follow the chosen locale.
Saved IDs and protocol values stay canonical; own look and set names stay as written.
The catalog searches both original and translated metadata.

- `npm test`: 510 passed, 11 existing skips, no failures (521 total).
- `node --test tests/i18n.test.mjs`: all five checks passed, including language
  fallback, dictionary/placeholder parity, every catalog/parameter/effect label,
  preserved custom names and all declared message references.
- `npm run typecheck`, `npm run format:check`, `npm run build`,
  `npm run check:dist`: passed; both dictionaries belong to the revisioned offline
  asset graph (101 build assets / 100 reachable assets).
- `npm run test:i18n -- --native-gpu`: passed in German and English on local
  Chrome, at 1440×1000 and 390×844. Checked search in either language, theme labels,
  tempo including German decimals, pointer ratings, palette/rhythm/setup popovers,
  deliberately named own looks, saved set names, malformed import, reload, Stage
  gate and updater. No page errors. Screenshots and copy snapshots are under
  ignored `artifacts/i18n/`; both layouts were visually inspected.
- `npm run test:browser -- --only show --native-gpu`: passed through stage start,
  palette changes, ratings/favourites, keys, blackout, safe look, reload/reconnect,
  rhythm, framing pattern and own-look variations. No GPU or page errors.
- `npm run test:output-controls -- --native-gpu`: passed local/Stage BPM controls,
  demo synchronization, selectable resolution and saved preferences.

Narrow preview controls now wrap so the resolution button cannot cover beat
indicators. Open catalog cards keep all ten stars and translated action buttons
inside their bounds. These checks cover local UI/translation behavior, not venue
endurance or external-display timing.
