# Roadmap

State: production candidate; canonical branch `main`; [Vercel](https://phosphor-performance.vercel.app/) automatically builds and publishes `main` after tests, typecheck and distribution verification (connected 2026-10-10). Direction set 2026-10-08 in an owner interview, recorded in the [decision log](docs/DECISIONS.md):

**Phosphor is the owner's VJ instrument for other people's DJ sets.** One MacBook Pro M3 Pro, Chrome, HDMI straight to whatever screen the venue has, 4–8-hour nights, generative visuals only. Reference: [docs](docs/README.md), [evidence log](docs/EVIDENCE.md).

First show: **2026-12-17** (planning placeholder until a real date exists). Feature freeze two weeks before. The date is fixed; scope flexes.

## Product shape

- **Play:** one catalog of every look — authored and own — with favourites and 0–10 ratings; the first 32 cards of the current view are on the keyboard (physical key positions, so QWERTZ works) (D65, D68). Configuration stays accessible; an optional stage-only settings lock protects it without disabling performance (D52). Local preview plays at 120 BPM with autopilot and Random on; opening the stage transfers the current performance. Autopilot plays rated catalog looks (optionally favourites only) for 8, 12 or 16 bars with smooth three-bar changes; **Next** skips ahead (D66). Any manual trigger takes over and hands back after 32 idle bars.
- **Controls:** shared master, energy, speed trim (½×/1×/2×), hue, zoom, mirror and flash (through the limiter); three live family faders and all parameters in the editor. Performance controls work on the local preview without a stage and on live output with one. Energy is show state and survives clip changes (D54). A clip stores its look, the energy it was authored at, fade, quantize and autopilot flag.
- **Timing:** line feed from the DJ mixer. Automatic tempo and beat phase, downbeat by key, builds/drops/breakdowns from loudness. Tap, downbeat and nudge always work alone. Techno/house, 100–150 BPM.
- **Output:** the output window defaults to the screen's native size and shape (physical pixels within GPU limits), with optional lower output sizes and owns show state, audio, beat tracking and autopilot; the control window is a remote with a preview. Full restore after a crash in ≤ 10 s.
- **Visuals:** 38 catalog families / 39 renderers (17 originals, 19 algorithm families added 2026-10-09/10, [catalog](docs/CATALOG.md)), 3–4 structurally distinct types each (Wallpaper Groups: all 17 groups), every type spanning very low to very high energy (Aquarium is the only calm-only family). 110 family-specific rhythm gestures plus four global tracks; preserved algorithm identity.

## Now (2026-10-08)

German and English (2026-10-12): browser language detection, complete interface/catalog/rhythm dictionaries, bilingual catalog search, preserved user names and set compatibility. Copy is direct and informal with subtle atmosphere in visual names. [Verification](docs/EVIDENCE.md#languages-2026-10-12).

Resizable organic layout and transport pause (2026-10-12, INCREMENTAL): both layouts fit the viewport, preserve independent saved splits and allow broad panel resizing. Catalog/footer controls are grouped, Rhythm follows one aligned Live bar with a bounded counter, and Space pauses/resumes the exact visual/audio position. Original frame artwork is retained. [Verification and limits](docs/EVIDENCE.md#resizable-panels-live-rhythm-and-pause-2026-10-12).

Further family performance (2026-10-12, INCREMENTAL): full 39-renderer / 178-variant sweep repeated. Melt is roughly 3–7× faster and Peano about 2.7× faster in the targeted 4K repeat, with exact sampled images. Quasicrystal's first-pass edge discrepancy is fixed; its correctness fallback adds cost. All measured 1080p variant medians are below 16.67 ms; 36 remain above it at 4K. [Complete measurements and quality checks](docs/families/PERFORMANCE.md).

Family performance (2026-10-12, INCREMENTAL): all 39 renderers / 178 variants measured at 1080p and 4K on the M3 Pro. Exact topology and constant shader indexing make Fourspace and Quasicrystal roughly 4–8× faster with full resolution, detail and GPU projection retained. All tested variant medians are below 16.67 ms at 1080p; 37 variants still exceed it at 4K, leaving Cathedral, Melt, Space-filling Curves, Mandelbrot and dense Fourspace shapes as the next targets. This is local synchronous throughput, not venue cadence. [Full family table and quality evidence](docs/EVIDENCE.md#family-performance-without-quality-reduction-2026-10-12).

Responsive panel contents (2026-10-12, INCREMENTAL): tall two-column layouts stack slider labels, keep control spacing bounded and adapt rhythm labels/cell height to available space. Family/Global switches share the heading, preserving all four Global rows on shorter panels. Eleven representative viewport sizes and the main control/Stage regression passed; [evidence and limits](docs/EVIDENCE.md#responsive-panel-contents-2026-10-12).

Shared demo/visual BPM and selectable resolution (2026-10-11, INCREMENTAL): preview popovers expose tempo/Tap and output size; native remains the default, lower sizes are saved with the set. The demo follows the show clock without tracker feedback. Unit and local/Stage browser coverage: [evidence](docs/EVIDENCE.md#shared-tempo-and-selectable-output-2026-10-11).

Autopilot UI synchronization (2026-10-11, INCREMENTAL): playing-look changes now update the Look name, family, actual parameter values, editor preview and catalog selection in local and Stage modes. Existing controls track live parameter changes without replacing manual drafts on every status update. See [evidence](docs/EVIDENCE.md#autopilot-look-synchronization-2026-10-11).

Biomechanical control redesign (2026-10-11): sculpted connected panels, teardrop faders, directly editable compact rhythm grid with small track-option popovers and setup dialog; shared show palette with HSV/hex colour picker; organic opening catalog, bundled 512×288 previews with instant palette recolouring and owner-provided wide/portrait page frames, inset spacing, Forum headings and automatic native-resolution preview. Follow-ups make dark mode the default and fix the Stage gate blocking on optional browser APIs, light-header contrast and menu/preview layers overlapping the chassis. Unit, browser, stage-output and independent code review checks passed; owner visual acceptance remains open. See [evidence](docs/EVIDENCE.md#biomechanical-controls-and-shared-colour-2026-10-11).

**Visual/rhythm implementation, 2026-10-11 (INCREMENTAL):** independent family/global grids, protected edited patterns, own-look overrides, quantized edits, coherent family/variant metadata and visual filters are implemented in the existing UI style. All 36 original families received algorithm-specific effects; moving low/mid/high-energy review drove stronger Penrose/Newton/Hopf/Chladni accents and real occupied-area framing for Sandpile and Turmite. Physarum, geometric caustics and Space Colonization add 24 looks after moving studies. The [agreed plan](docs/research/family-rhythm-audit-2026-10-11.md#consolidated-product-plan), [gesture map](docs/families/RHYTHM.md) and [verification](docs/EVIDENCE.md#visual-rhythms-and-catalog-expansion-2026-10-11) record scope and evidence. New studies are playable catalog additions, not newly certified venue families. External-display, full-night endurance and final owner aesthetic acceptance remain open.

Quality/lifecycle fix, 2026-10-10 (INCREMENTAL): stage and family shading use full output resolution without automatic downgrades; Escape has no performance action. Closing the stage restores the chosen preview resolution and renders the transferred show state before showing the local preview. Regression coverage: `tests/render-resolution.test.mjs`, `tests/keymap.test.mjs`, `scripts/test-stage-output.mjs`. Full-resolution external-display timing remains a rig check.

Platform for the first show is implemented on `main` and waits for rig verification: stage renderer and remote control, keyboard grid and pages, unified local/live performance with an optional settings lock (D52), tap/downbeat/nudge, energy and shared beat responses, flash limiter, crash restore, pre-show check, telemetry, cover-crop, bar-count autopilot with the Random default mode (D49, D50), failed-family isolation and full-resolution rendering ([decisions](docs/DECISIONS.md#follow-up-interview-2026-10-08)). **Six families have passed the family gate** (groups 1 and 2, owner sign-off D51): the first-show minimum; "two strong at peak time" is judged at the rig rehearsal. Automatic beat tracking meets its phase target on the three produced tracks in `songs/`, but on five Creative-Commons DJ mixes its targets are not met or not measurable (D63, [evidence](docs/EVIDENCE.md)); the line input therefore starts tap-first.

### Review plan (D53–D63, 2026-10-08)

A live test and review found show bugs and a visual layer weaker than the platform: one palette for every clip, one linear transition, 8-bit banding, peak energy barely different from mid, four gated families deaf to the music. Platform steps run one at a time on `main`, each verified, pushed and redeployed:

1. **Bug batch (D53–D55):** done 2026-10-08 — energy survives clip triggers (bounded autopilot chains); Escape keyboard-locked on the stage, no venue-screen UI on fullscreen loss; drafts on a Lab page autopilot skips; demo-start click does not pause autopilot; **Add missing families**; line input starts tap-first (D63). Gated families' rig timing must be re-run (runner now applies energy curves).
2. **Set v4 and palettes (D57, D59):** done 2026-10-08 — 24 mood-tagged palettes, show-level palette with four-beat glides, palette autopilot, page moods, lossless v3 migration; owner keep/reject sheet pending. Stage ownership no longer depends on status cadence (D64). Transition/post fields join v4 later.
3. **Float picture path and energy-driven post (D56):** done 2026-10-09 — RGBA16F slot/mix/bloom/echo with RGBA8 fallback; bloom, echo, chroma, grain and vignette follow energy under set-wide ceilings; rig p99 unchanged (17.6–17.7 ms Flight/Cathedral).
4. **Palette library and palette autopilot (D57):** landed with step 2.
5. **Transitions (D58):** done 2026-10-09 — per-clip `auto` / eased crossfade / downbeat cut (manual only) / noise dissolve / feedback melt; autopilot uses melt or dissolve in breakdowns, one-bar melt on drops, never a cut. Rig p99 17.6–18.4 ms during transitions.
6. **Audio feature bus (D61):** done 2026-10-09 — low/mid/high envelopes, onset, flux and hits; every gated family maps three capped hero parameters to real audio and falls back to the clock kick within 2 s when tracking or signal drops.

7. **Catalog, faster autopilot, resolution (D65–D68):** owner direction 2026-10-09 — the Lab page and **Add missing families** are replaced by a rated catalog of every look (thumbnails, Play, To slot); new sets fill all eight pages; autopilot plays from the catalog by rating for a random 8/12/16 bars with three-bar smootherstep changes and a **Next** button (Shift+Space); the stage renders at native display resolution and the preview resolution is selectable. On 2026-10-09 the pages went too: the catalog is the instrument, with favourites, own looks and keys that follow the view; set format v5 (D68). Rig check pending: stage p99 at 4K on the external display, thumbnail rendering during a live show.

8. **Algorithm families and editorial order (D69):** done 2026-10-10 on branch `catalog` — 19 new families (#64–#82: Life, attractors, Mandelbrot, sandpile, Newton, flames, Penrose, Voronoi, ripple tank, Langton's ant, Indra's pearls, harmonograph, wallpaper groups, Truchet, space-filling curves, phyllotaxis, Hopf, Chladni, domain colouring), each with CPU tests of its signature mathematics; 304 looks in all; unrated looks ordered most interesting first. Owner ratings on the Mac decide which families get the signature-detail rework next.

Then, in parallel family branches: structural energy gate and re-gating of the six (D60), Flight and Cathedral headliners (D62), Pulse and Interference reworks (D60). Evidence runs alongside (D63): CC-mix beat evaluation, output-measured blackout latency, first 8-hour external-display run by 2026-10-31, USB line check before the freeze. **Status 2026-10-09:** all six platform steps are on `main` and live. Headliners, Pulse (strobe geometry), Interference (layered moiré) and Tapestry (seed shape 3 energy growth, lifted midtones) reworked; every type of all six gated families scores ≥ 0.15 on the energy metric and times at p99 ≈ 17.6–17.7 ms on the rig. Open: owner art sign-off of the reworked families and palette keep/reject; Feedback rig re-timing with the corrected runner; output blackout measurement (needs Chrome's macOS Screen Recording permission); 8-hour external-display run; USB line check.

## Milestone 1 — first show

| Weeks | Dates         | Work                                                                                                                                                                                                                                                                         |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | 8–14 Oct      | Review and merge `lane/test-harness`, `lane/image-pipeline`, `lane/app-core`. Owner provides 5–10 recorded mixes (outside the repo). Beat-tracker prototype.                                                                                                                 |
| 2–3   | 15–28 Oct     | Output window becomes renderer and show owner; control window becomes a remote. Scene contract v3: energy curve, beat responses, types, any aspect. Remove linear score, keyframes, WebM/frame export, MIDI clock, manual audio routing. Measure beat tracking on the mixes. |
| 4–5   | 29 Oct–11 Nov | Grid, keyboard map and pages; optional settings lock; shared controls and energy fader; crash recovery; preflight; bar-count autopilot. Group 1 families start in parallel.                                                                                                  |
| 4–8   | 29 Oct–2 Dec  | Families in queue order, owner sign-off weekly. Auto beat tracking and build/drop autopilot if they meet their targets.                                                                                                                                                      |
| 9     | 3–9 Dec       | Freeze. 8-hour run, fixes only.                                                                                                                                                                                                                                              |
| 10    | 10–16 Dec     | Second 8-hour run if fixes landed; line check with a real DJ mixer feed.                                                                                                                                                                                                     |

**Checkpoint 2026-11-11:** if fewer than three group 1 families have passed the family gate, group 2 leaves the first-show scope and Melt and Acid move up.

### Required for the first show

Output-window renderer; keyboard grid; optional settings lock; tap, downbeat and nudge; energy fader and shared beat responses; flash limiter (on by default, locked during a show); crash recovery; preflight; telemetry; every screen shape handled at least by cover-crop; bar-count autopilot. Minimum content: six families through the family gate, at least two strong at peak time.

### Ships only if ready

Automatic beat tracking (lock within 8 beats of a tempo change, phase error < 20 ms, holds through a 32-bar breakdown, on Creative-Commons DJ mixes plus `songs/`, D63; otherwise off by default and the show runs tap-first); autopilot build/drop response; native per-family composition for odd screen shapes.

### Family queue

1. Cathedral, Interference (plus hard-edged peak mode), Feedback, Tapestry
2. Pulse Geometry (new), Fractal Flight (v6 port)
3. Melt, Acid (absorbs Evolution Garden as a "garden" type)
4. Light Beams (new), Particle Swarm (new)
5. Julia Observatory, Fourth Dimension, Hyperbolic Loom (v6 ports)
6. Magnetic and Phase reworks, then Aquarium (calm-only)

v6 families are ported as ideas, not Canvas2D code: new GPU scenes on contract v3. Fractal Flight's manual flying becomes authored camera paths, one per type. Families after group 1 join the first show only if they pass the gate before the freeze; the rest continue in order after it.

### Family gate

At least three types that pass the grayscale distinctness sheet (same palette, mid energy; structural metric flags near pairs, including across families) and owner sign-off; an owner-approved energy ladder (0.1 / 0.5 / 0.9) for every type with an automated minimum structural difference between 0.1 and 0.9 (D60, applied retroactively to gated families); frame p99 ≤ 34 ms on the reference rig at the 1080p-equivalent budget with the costliest type at full energy; GPU error zero and no non-finite shader inputs; correct at 16:9, ultra-wide and square; kick response through the shared beat layer; at most three audio-mapped hero parameters, smoothed and capped (D61). A family merges only after it passes.

### Family gate status

Every family below is a draft until it passes (D47). Packets: `docs/families/<id>.md`.

| Group | Family                                               | Status                                                                                                                  |
| ----- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1     | Feedback Chapel                                      | **passed** — [packet](docs/families/feedback.md); owner sign-off 2026-10-08                                             |
| 1     | Causal Tapestry                                      | **passed** — [packet](docs/families/tapestry.md); owner accepted Cascade's cross-family near pairs (nearest Melt 0.138) |
| 1     | Cathedrals of Error                                  | **passed**, reworked as headliner (D62) — [packet](docs/families/cathedral.md); awaiting owner sign-off of the new look |
| 1     | Interference Rituals                                 | **passed**, reworked as layered moiré (D60) — [packet](docs/families/interference.md); awaiting owner sign-off          |
| 2     | Pulse Geometry                                       | **passed**, reworked as strobe geometry (D60) — [packet](docs/families/pulse.md); awaiting owner sign-off               |
| 2     | Fractal Flight                                       | **passed**, reworked as headliner (D62) — [packet](docs/families/flight.md); awaiting owner sign-off                    |
| 3     | Melt, Acid (+ garden type)                           | draft                                                                                                                   |
| 4     | Light Beams, Particle Swarm                          | draft                                                                                                                   |
| 5     | Julia Observatory, Fourth Dimension, Hyperbolic Loom | draft                                                                                                                   |
| 6     | Magnetic, Phase (reworks), Aquarium                  | draft                                                                                                                   |

### Show gate

Eight hours unattended on the M3 Pro (mains power, Chrome, external display at native resolution), recorded mixes through the line input, autopilot on: zero crashes and manual recoveries; frame p99 ≤ 34 ms; no quality downgrade after the first ten minutes; heap growth ≤ 50 MB; blackout reaches the output within two frames, measured at the output; crash drill back on screen in ≤ 10 s with ≤ 2 clicks; beat-tracking targets met if it ships; one line check with a real DJ mixer feed.

### How work runs

Platform changes go one at a time on `main`, because they change contracts every scene depends on. After contract v3, families run in parallel branches, one family per branch. Claude builds, tests and produces contact sheets, ladders and headless correctness; real-GPU family timing (`npm run timing -- --rig`) runs one family at a time on the rig; the owner provides mixes, art sign-off and show-gate rig runs. CI runs unit tests, synthetic click-track beat tests and a headless render smoke of shipped families; mixes, soaks and ladder sign-off run locally and never enter the repo.

## After the first show

Remaining families in queue order. Optional families: Oscilloscope, Terrain. v6 set import only if the owner has v6 sets worth keeping.

**Idea, owner 2026-10-08 — image collage family (maybe later, not scheduled):** random images layered and morphed into each other for trippy, uncanny pictures. Not decided: the image source. Live Google Images does not fit a show (mostly copyrighted images in public display, image rights of people shown, unvetted content, no free random-image API, no CORS for WebGL, venue may be offline). Candidate sources: the owner's own folder (rights held or CC0), or random public-domain/CC0 packs from open archives that allow cross-origin use (Wikimedia Commons and the Met's image hosts sent `Access-Control-Allow-Origin: *` in a spot check), fetched in Prep, reviewed and cached offline. Building it reverses D25 (generative only) and needs a decision entry first.

## Cut

Linear cue score and keyframes; WebM recording and PNG frame-sequence export (PNG snapshots stay); MIDI clock and Start/Stop/Continue; manual band-to-parameter audio routing; Safari and Firefox support; Milestone 3 (outside performers); separate public-demo polish (verified platform steps are still redeployed, D63). MIDI learn for CC/notes stays.

## Done

- **2026-10-11 · Control workflow fixes (INCREMENTAL):** live-stage mute/source handoff, cancellation-safe variation thumbnails, stable keyboard focus and fader readouts, valid own-look base IDs, settings-lock race protection and reliable held-Flash release. All 304 looks and the expanded control/stage browser checks pass; [evidence and remaining rig checks](docs/EVIDENCE.md#2026-10-11--control-workflow-bug-fixes-and-release-checks).

- **2026-10-11 · Reference UI redesign (INCREMENTAL):** warm gold-accented light/dark themes with system default and persistent toggle; responsive two-column workspace with Preview/Catalog on the left and Look above Performance and Setup on the right; compact catalog cards, filter pills and recoverable empty states; Audio/MIDI/Set/Pre-show tabs, progressive disclosure and native keyboard controls. Rendering and saved-set formats remain unchanged. Validation and limits: [evidence](docs/EVIDENCE.md#2026-10-11--lightdark-control-interface).

- 2026-10-10: connected the existing Vercel project to `main`; versioned build settings run tests, typecheck and distribution verification before publishing `dist` (D70). Other branches do not auto-deploy; running shows retain their offline generation.
- Ten families / 62 looks on one WebGL2 engine; fixed 60 Hz simulation with bounded catch-up; two-slot transitions with interrupted-mix recovery; context-loss rebuild.
- Cue scores with keyframes, quantized GO, director mode; audio/MIDI routing and clock; clean projector output; PNG/WebM/frame-sequence export; strict portable v2 sets with v1 migration and recovery backup; content-stamped offline cache.
- Public Vercel release with hosted all-family, offline, 390 px and output checks (see evidence log).
- 2026-10-08: critical review; `main` became canonical; Pages mirror retired; v6 source frozen and tagged `archive/v6-canvas`; owner interview set the VJ direction above.
- 2026-10-08: lanes merged (test harness, image pipeline incl. review fixes R1–R6, app core); show core, stage/control split and contract v3; beat tracker with synthetic tests; seven new or ported families as drafts; failed-family isolation, ray-step-first governor, pre-show facts, family timing runner; soak counters judged before the crash drill; leftover frame-sequence export code removed. Evidence: [log](docs/EVIDENCE.md).
- 2026-10-08: owner-requested production deployment of the complete current VJ instrument (`166ffbe`, distribution revision `5bf07cc48a03e25f`); live Chrome smoke verified demo beat lock, keyboard clip selection, blackout/recovery and remote preview. Show acceptance gates remain open.
- 2026-10-08: main preview now animates the selected clip before opening the stage; reuses the editor renderer, switches to live stage video and restores the selected visual after the stage closes.
- 2026-10-08: control-window demo audio starts after the first interaction without a stage; Off and local mute work; opening the stage stops local sound, and closing it resumes the selected demo.
- 2026-10-08: unified local/live performance controls; grid clicks also trigger the connected stage; clip/set/audio/MIDI settings stay editable by default. Optional **Lock settings** is stage-only and never blocks the grid or performer controls. Local Chrome smoke covered rendered blackout/master/freeze, live editing, lock/unlock, state handoff and control reload with zero page errors.
- 2026-10-08: fixed stale offline releases trapping browsers on stage-only controls and Prep-only grid clicks. Explicit **Update app** cutover preserves saved sets and refuses activation while any other Phosphor window is open. Legacy-cache repro and current no-stage pixel checks passed; evidence in [the log](docs/EVIDENCE.md).
