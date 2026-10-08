# Roadmap

State: production candidate on [Vercel](https://phosphor-performance.vercel.app/), canonical branch `main`. Classification `INCREMENTAL / EMPIRICAL`. Goal (owner, 2026-10-08): the owner's own reliable live instrument; the public URL is a free demo. The Canvas2D v6 instrument (`apps/phosphor`, tag `archive/v6-canvas`) is frozen; its features are ported here. Decisions and evidence: [docs](docs/README.md), [evidence log](docs/EVIDENCE.md).

## Now — Milestone 1: live-show reliability and art direction

Reference rig: Apple M3 Pro, Chrome, external 1080p 60 Hz display. Parallel lanes, one writer per file:

- **App core:** split `app.js` into testable transport/persistence/MIDI/keyboard/governor modules; fix live-show bugs test-first (panic keys under slider focus, duplicate MIDI delivery, NaN keyframes, 120 Hz governor downgrade, undo/autosave/output-window/device hazards); dark-techno demo, tab audio, v6 14-family set import with a visible drop report; runtime telemetry.
- **Image pipeline:** highlight rolloff, dual-filter bloom, dithering, stochastic 8-bit rounding, shader correctness (seed precision, `pow`, hash growth), flash limiter (default on), echo/chroma effects, generated offline asset list, Melt/Cathedral cost cuts, isolated shader failures.
- **Test harness:** committed browser smoke, 62-preset contact sheet with art metrics, host-logged soak runner with gate summary, Safari/Firefox render smoke, typecheck/format, CI gate before any deploy.
- **Then art direction:** art bible (emissive light on true black), per-preset palettes, three signature looks to owner-approved 5/5 (candidates Opal Reliquary, Foil Ribbon Eclipse, Nested linen), one rework of Magnetic and Phase or hide them.
- **Then performer UX:** stage view with GO/NEXT and bar countdown, pinned blackout strip on narrow screens, preset thumbnails, contrast ≥ 3:1 and visible focus.
- **Gate:** owner's 30-minute set on the reference rig — frame p95 ≤ 18 ms / p99 ≤ 34 ms at Balanced, zero governor downgrades, GPU errors and non-finite shader inputs, heap growth ≤ 50 MB, one slot/five textures after fades, cue prep ≤ 250 ms, blackout within two frames, export → reload identical.

## Next — Milestone 2

- Two-hour soak on the reference rig with host-side telemetry.
- Port the four v6 families: scene-contract camera input, then Fractal Flight, Julia, Fourth Dimension, Hyperbolic Loom as GPU scenes with six presets each; optional `camera` field in v2 sets. Then archive the v6 checkout.

## Later

- Milestone 3: outside performers (three performers, two independently returning to a saved set).
- MIDI controller templates once hardware is named; side-by-side bred-variant comparison; higher-precision simulation buffers if contact sheets still show artifacts; parameter-only sharing if a real handoff needs it.

## Done

- Ten families / 62 looks on one WebGL2 engine; fixed 60 Hz simulation with bounded catch-up; two-slot transitions with interrupted-mix recovery; context-loss rebuild.
- Cue scores with keyframes, quantized GO, director mode; audio/MIDI routing and clock; clean projector output; PNG/WebM/frame-sequence export; strict portable v2 sets with v1 migration and recovery backup; content-stamped offline cache.
- Public Vercel release with hosted all-family, offline, 390 px and output checks (see evidence log).
- 2026-10-08: critical review; `main` became the canonical/default branch; Pages mirror retired; v6 source frozen and tagged.
