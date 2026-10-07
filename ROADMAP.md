# Roadmap

State: v2 performance rebuild publicly deployed on [Vercel](https://phosphor-performance.vercel.app/) with a [GitHub Pages mirror](https://fabianxvogt.github.io/phosphor/); production candidate, not multi-hour live-show certified. Classification: `INCREMENTAL / EMPIRICAL`. This older standalone checkout is distinct from the separately documented public v6 deployment; this task has not replaced or redeployed that app.

## Now

- Rehearse the intended 2–4-hour score on the target laptop, physical MIDI/audio interface and projector. Record frame timing, quality reductions, memory/thermal behavior, output visibility, sleep behavior and recovery.
- Repeat automated endurance with durable host-side telemetry: the attempted two-hour offline/demo/output run became unrecoverable through browser automation, so it is not a passed soak. The final public 65.8-second music/score/output check passed at Balanced quality, median 16.7 ms / p95 16.8 ms; multi-hour smooth presentation remains unproven.
- Measure cue preparation and transitions on the target machine. Seed preparation is callback-budgeted; the earlier shared-host timings do not support a controlled latency before/after comparison.
- Verify native chooser/disk workflows and reopening a long recording; use OBS for archival shows.
- Obtain performer/viewer acceptance for pacing, projection readability, sensitive-viewer suitability and cue ergonomics.
- Reconcile this candidate with the existing public v6 source before replacing that deployment. Preserve its additional scenes; the separately hosted rebuild is not a silent cutover.

## Next

- Refine authored arcs from rehearsal/viewer evidence, not another automatic scene-expansion wave.
- Fix only observed device/runtime or endurance defects before promoting this candidate to a live-show release.
- Evaluate whether full-score offline video rendering is needed; the shipped frame exporter is explicitly a four-second scene sequence, not an hours-long score renderer.

## Later

- A genuinely distinct visual model: vector/oscilloscope drawing, spectrogram typography, or reviewed local-media collage, only after the show gates pass.
- Parameter-only sharing if a real handoff workflow warrants it; no automatic media uploads.

## Done

- All ten requested scene families with 62 complete authored presets, one shared WebGL2 engine and consistent parameter editor. Ten owner-requested Sol 6.1 medium scene workers completed integration against one contract.
- Fixed 60 Hz simulation independent of presentation, bounded catch-up, two-slot transitions with continuous interrupted-mix recovery, preserved paused resize, deferred context-loss loads and resource rebuilding.
- Real model refinements: encoded Gray–Scott fields, exact CA/history playback with full-width integer seeds, Lenia-inspired nutrient convolution, bounded convex feedback, periodic parametric geometry, Kuramoto phase lattice and immutable preset ancestry.
- Measured ribbon bottleneck correction: capped internal shading with preserved final output resolution; same-GPU loop endpoints match exactly.
- Full scene/palette cue snapshots, same-family keyframes, quantized GO, identity-safe arrangement, remaining-time pause/resume, correct long-gap sequential position and energy-tagged recent-repeat-aware director.
- Safe local/demo/live-input audio, RMS/bands/onset routes, explicit monitoring, MIDI mapping and transport/clock support. Effective tempo drives fades and demo scheduling; frame-driven demo pumping survives a stalled scheduler interval. Physical device acceptance remains in Now.
- Strict portable v2 sets including full-capacity file imports, v1 migration preserving the original key, local autosave/export/reopen, immutable breeding/locks/lineages and rejected-save recovery backup without quota-induced overwrite. Failed/pending saves participate in the closing warning.
- Clean canvas-stream output, hidden-parent driver, fullscreen/Wake Lock, blackout/safe look, reduced motion, quality governor and optional blank-output recovery.
- Real PNG capture, bounded disk/memory WebM recording with cloned audio ownership, immutable 120-PNG frame export in unique subdirectories and cancellation manifests.
- Complete content-stamped offline distribution without mixing cache generations or force-activating an update during a show.
- Actual desktop/narrow browser journeys, all-preset GPU checks, accelerated living-field trajectories, transport/source/export/recovery probes and independent focused integration review. Exact observed limits are retained in the evidence page.
- Owner-requested public deployment through GitHub Pages on the isolated rebuild branch; hosted all-family GPU checks, offline reload, 390 px layout, muted fullscreen output and a real music-score run pass.
- Owner-requested Vercel production deployment of the same reviewed static build, with public access, all-family rendering, offline reload, responsive layout and clean fullscreen video output verified. Upload exclusions omit environment tokens and provider metadata.
