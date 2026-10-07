# Phosphor

A local browser instrument for performing ten procedural visual families. This checkout is the v2 performance rebuild: 62 authored looks, complete scene-cue sequencing, GPU simulation, local audio/MIDI, clean projector output, preset breeding, and portable sets.

**Release state: production candidate, not live-show certified.** Desktop Chromium is the reference runtime. See [verification and remaining gates](docs/README.md) before relying on it for a paid show. No cross-device deterministic replay, biological discovery, automatic BPM detection, or photosensitivity certification is claimed.

## Run

```sh
npm test
npm run build
npm run check:dist
npm run preview
```

Open `http://localhost:48101`. No dependency installation is needed for the application or these checks. Use the built preview for offline operation. The unstamped source worker is network-only; disable browser cache while editing. If switching a previously built origin to source development, close all old windows so the new worker can activate.

All media, device access, rendering, imports, exports, and recordings stay on this device. No account, upload, external font, or inference service is required. HTTPS or localhost is required for microphone, MIDI, offline caching and file-system APIs.

## Perform a set

1. Choose **Scenes / controls**, then an authored look. On desktop, the sticky preview/transport sits beside the editor so you can watch changes while scrolling controls; narrow screens stack the same controls. Parameters, seed, palette, bloom and kaleidoscope share one editor. Click the stage to inject; pause holds simulation and clock. Reset starts the current seed again. Undo/redo covers edits, not the simulated field.
2. In **Set / cues**, capture complete scene snapshots, name/reorder/duplicate them, set bars and fade beats, and add same-family parameter/palette keyframes. Cue snapshots include scene, preset, seed, parameters and palette; brightness, bloom, kaleidoscope and quality remain global output-bus controls. GO arms the next bar unless quantization is off. **Play score** loops the set; pause/resume preserves remaining cue time. Manual scene/preset changes stop the old score rather than letting it overwrite your performance.
3. The opening score is ten 64-bar cues: approximately 27.8 minutes at 92 BPM. Repeat it, build longer arcs, or use up to 256 cues. **Director** matches normalized audio energy to editable cue energy, penalizes recent repeats, and adds bounded variation. It is not a music-section classifier. Sequence mode preserves cue position even after a long callback gap; director mode makes a fresh selection after a gap.
4. In **Audio / MIDI**, choose the original demo pulse, local looping audio, or an explicit live input. Live input is never sent to speakers; browser echo/noise/gain processing is disabled. Local/demo monitoring can be muted independently of analysis and recording. Route energy, bass, mid, high or onset to bounded controls. Set/tap manual tempo or enable MIDI clock; the current tempo then controls beat fades and the demo pulse, with manual fallback after clock loss. There is no automatic BPM guess. MIDI Start restarts the score, Stop pauses, and Continue resumes.
5. Open **clean output**, move its window to the projector, then enter fullscreen. It receives the exact rendered canvas, not a second independently evolving simulation. Its visible animation loop can drive the control window when that window is hidden. Fullscreen removes output controls. Keep both windows open; OBS/projector capture should target clean output.
6. Export the set before rehearsal and again before the show. Reattach local audio after reopening: session JSON intentionally excludes media, permissions and device assignments. Keep a known-safe look and blackout ready.

Keyboard: **B** blackout, **P** pause, **R** reset, **Esc** safe look, **Shift + arrows** scene change, **Enter** next cue when not on a button. **Space** injects while the stage/non-button surface is focused; buttons retain native keyboard behavior. Shortcuts do not hijack text fields, selects, or the help dialog.

## Scene families

| Family                      | Actual model / refinement                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 47 Acid Mycelium            | Weighted nine-point Gray–Scott field; separately encoded U/V, unequal diffusion, bounded integration and six stable authored parameter regimes.          |
| 48 Magnetic Choir           | Advected dye-thread field with torus, vortex and silk compositions; not a discrete-particle simulator.                                                   |
| 49 Cathedrals of Error      | Bounded SDF raymarcher: vaults, crystals, roses and folded structures; capped ray steps and fold generations.                                            |
| 50 Alien Aquarium           | Lenia-inspired density/nutrient convolution, distinct seed arrangements and habitat flows; an artistic system, not biological organisms.                 |
| 51 Causal Tapestry          | Exact 512-cell elementary automaton, eight rules and 511 retained generations; reverse plays actual history, not reverse evolution.                      |
| 52 Feedback Chapel          | Bounded convex visual feedback with authored geometry, transport and clean recovery; no unbounded additive brightness.                                   |
| 53 Interference Rituals     | Anti-aliased analytic interference fields with multiple compositions and optional beat locking.                                                          |
| 54 Topological Melt         | Projected parametric knots and ribbons with periodic motion, static mode and six materials; crossings can occur, knot preservation is not claimed.       |
| 55 Phase Transition Theatre | Encoded Kuramoto phase lattice with six regimes and three authored arcs; no fabricated hysteresis or phase-transition theorem.                           |
| 56 Evolution Garden         | Gray–Scott garden plus shared immutable preset breeding: deterministic bounded mutation, exact parameter locks, ancestry, selection and generation undo. |

## Performance and recovery

| Quality  | Output / presentation target |
| -------- | ---------------------------- |
| High     | 1920×1080 / 60 fps           |
| Balanced | 1280×720 / 60 fps            |
| Low      | 960×540 / 30 fps             |

Simulation runs on a fixed 60 Hz clock independently of presentation, with at most six catch-up ticks per callback. Slow callbacks cannot create an unbounded backlog. Crossfades retain at most two scene slots/nine textures, then dispose the old slot. Simulation grids do not grow with output resolution. Melt's internal visual shading is capped at 960×540 for the ribbon GPU budget; final output/capture still uses the chosen resolution. Adaptive quality lowers output after sustained slow windows; it never silently increases quality. Reduced motion slows simulation, clock-driven visual motion and beat effects; it is not a guarantee that every composition is comfortable for every viewer.

Stateful looks prepare their seeded field in batches of at most six simulation ticks per callback, rather than submitting all 120 preparation ticks during a cue change. Automatic fades hold the outgoing look until preparation completes; expect a short preparation delay before the requested fade. Preparation continues when paused after explicitly loading a new look. PNG sequences finish this preparation before counted frame zero.

Optional blank-output recovery samples the whole image, waits through six bad checks, and resets the seed. Disable it for intentionally almost-black work. Blackout is excluded from recovery. WebGL context restoration rebuilds resources and restarts the latest seed; it cannot restore a lost GPU field exactly. Resize preserves the displayed history rather than erasing a paused look.

## Save, capture and export

- **Portable sets:** strict `phosphor-set-v2` JSON up to 32 MB, complete scene cue/keyframe snapshots, options, modulation/MIDI mappings and lineages. Autosave is local and subject to storage quota; failed/pending saves trigger a closing warning, and export backups are still required. v1 imports/local saves migrate labels, duration, palettes and preset intent to corrected models; old unstable trajectories are not preserved. The original v1 local key remains intact. Rejected saves retain a downloadable raw recovery backup; if storage cannot hold that backup, autosave stays blocked to preserve the original until you download it and explicitly save a new set.
  Migration supports this checkout's original three-family v1 format, not every export from the separately maintained public v6 instrument.
- **PNG capture:** current rendered output.
- **WebM:** real canvas plus a separate audio-recording branch. Chromium file-system support streams to disk and stops if pending writes exceed a 16 MB backlog threshold; native encoder chunks can overshoot that threshold. Stop and wait for finalization before closing. Without file-system support, retained in-memory clips stop at 64 MB. For hours-long archival capture, use OBS and verify its audio routing. Browser encoder/container seeking and recovery after a crash are not guaranteed; recording is not a substitute for a set backup.
- **Frame sequence:** 120 real 1280×720 PNG frames at 30 fps plus a manifest, in a new timestamped subdirectory. Captures a frozen look/options/tempo, no audio or live modulation. Cancellation retains completed frames. Seed replay is for the same GPU/runtime, not bit-identical across devices. This is a four-second scene export, not an offline renderer for an entire multi-hour score.
- **Offline:** all distribution assets are precached as one content-stamped generation. Finish recording, close every Phosphor window, then reopen to activate an update. Do not update/redeploy mid-show. Offline caching is available only after a successful online load and remains subject to browser storage eviction.

## Source navigation

- `app.js` — editor, score, device routing, captures and lifecycle.
- `engine.mjs`, `scene-contract.mjs`, `scene-*.mjs` — renderer and scene contracts.
- `audio.mjs` — analysis, safe source ownership and MIDI parser.
- `session.mjs`, `evolution.mjs` — portable state, migration and immutable breeding.
- [ROADMAP](ROADMAP.md) — release gates and scope.
- [Documentation/evidence](docs/README.md) — observed checks, limitations and next tests.

MIT. No third-party media is bundled.
