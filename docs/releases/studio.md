# Studio update — 2026-09-07

Status: PUBLIC PREVIEW, deployed as Site version 5. Classification: INCREMENTAL. Research proposals: EXPLORATORY. No mathematical novelty or full-v1 claim.

## Changes and cause

Topological Melt previously changed the curve's parameter origin as time advanced, leaving the complete outline effectively unchanged; several live controls were read from reset-time snapshots. The replacement rotates a closed 3D curve and reads live shape, camera, material and thickness parameters.

The old Phase field's additive regime bias dominated diffusion and saturated most regimes into nearly uniform values. A new driven spatial target and convex diffusion/relaxation update retain visible structure. Model identity is now driven-regime-field-v2; legacy archived measurements retain their old identity and old Phase frame plans require a new export. This is an artistic field, not equilibrium hysteresis or thermodynamics.

Julia, 4D tesseract/Hopf and hyperbolic geodesic scenes join the existing library. Every scene has its own persistent three-color palette, isolated from interface styling. Ordered kaleidoscope, echo, chromatic split and glow share still, recording and offline output. This is an effect stack over one source, not multi-scene mixing.

Other fixes cover repeated Evolution sibling batches, escaping imported labels, transactional import validation, legacy scene migrations, audio-driven parameter drift, source races/cleanup, recording-track ownership, paused effect edits, cleared echo history and clean scene resets.

The reusable-performance pass adds generalized cue snapshots for the active scene parameters, palette, and effect stack, plus an explicit cue update action. Existing scene/preset-only cues remain readable. Set transport now preserves the active cue and consumed beat position across pause/resume, retimes the remaining cue when tempo changes, completes once instead of wrapping, and invalidates stale timers when cues are removed or a job starts. The set panel shows elapsed/total duration. An explicit Load 24m score action installs a validated nine-cue Acid/Magnetic/Topology rehearsal example only after the performer chooses it; it does not silently replace a saved set.

## Evidence

EMPIRICAL: a separate Codex session configured as GPT-5.6 Luna (high) ran npm test: 29/29 passing, including the 2,200-step Phase session run, deterministic scene dispatch, portable palette/effect migration, malformed import rejection, offline cancellation/restoration and no base-parameter drift under audio. Mathematical fixtures cover 4D norm/edge structure, Hopf invariance, geodesic orthogonality/isometry, known Julia orbits and finite draw paths. These tests support implementation behavior, not formal proof of the complete renderer.

EMPIRICAL: build and distribution validation pass. Bounded local browser observation confirms visible Topological motion and paused view adjustment, a spatially varying Phase field, Julia output, and unchanged lime/white UI text after artwork palette changes. Effect stacking is visibly rendered. Final browser checks also observed tesseract, layered Hopf fibers and hyperbolic curves, a compact 480-CSS-pixel viewport without horizontal overflow, and Focus canvas retaining 8:5 proportions. This is bounded observation, not sustained performance evidence.

The separate Luna code review accepted the prior topology, Phase manifest and effect-buffer repairs, then found four further defects: guarded automatic Acid injections, non-idempotent paused trail redraws, stale pending plans after session import, and recorder callback races. All four are fixed with regression coverage. A final Luna recheck accepted the fixes and Focus layout rules with no remaining actionable issue in that scope. The reviewer’s proposed live transport restoration was declined because the established offline contract is a paused seeded restart, explicitly stated in plans and user documentation.

EMPIRICAL: the parent reran the complete suite after those fixes: 29/29 pass (18.92 seconds), followed by successful build, distribution validation and whitespace checks. New regressions compare live/offline Acid arrays at an automatic injection, blend paused trail backgrounds, test transactional plan invalidation, and deliberately invoke stale recorder callbacks. Actual hardware capture remains untested.

EMPIRICAL: this reusable-performance pass passes the existing 29-test suite, `npm run build`, and `npm run check:dist`. Source evidence is `app.js` cue validation/playback and `index.html` set controls. The 24-minute example is nine cues × 64 bars at 96 BPM = 1,440 seconds; structural snapshot validation is in the session import path. No browser/device rehearsal or performer acceptance is claimed here.

## Limits and next checks

Native microphone/tab capture, device permissions, listening quality and native folder selection were not exercised. The suite checks some cancellation and stale-state paths; it is not comprehensive hardware/audio race coverage. Full/Low rates remain targets. Sustained frame-time/performance and human aesthetic/performer acceptance remain open. Julia is deliberately sampled below output resolution; effect ordering is fixed; there is one active generator. Exact live-buffer checkpoint replay is not promised.

## Release

Site version 5 deployed successfully on 2026-09-07 from exact source `465236e255b4c303a6314cdfc4bc172b0f7195ff` at [the existing public URL](https://phosphor-visual-instrument.fabian523417.chatgpt.site). The source was pushed to both the owner GitHub repository and the configured Sites source branch before packaging. This document is a subsequent release record; the deployed product source remains the SHA above.
