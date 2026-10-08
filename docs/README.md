# Phosphor documentation

- [Performer guide](../README.md) · [Roadmap and gates](../ROADMAP.md) · [Evidence log](EVIDENCE.md)
- Creative brief: `Development/docs/projects/GAMES_VISUALS_CREATIVE.md`, families 47–56.

## Classification

**INCREMENTAL / EMPIRICAL.** A product rebuild, not a research novelty claim. All ten scene modules are implemented; none is a placeholder. Mathematical/biological discovery, topology preservation, automatic musical understanding and cross-device exact replay are not claimed. State: production candidate; the Milestone 1 rig rehearsal and multi-hour endurance gates remain open.

## Workflow details

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

## Release operations

Vercel production (`fabianxvogts-projects/phosphor-performance`) is the only public deployment, published from reviewed `dist` at checkpoints, never mid-show. The GitHub Pages mirror was retired on 2026-10-08. For manual Vercel updates: `npm run build && npm run check:dist`, then `npx vercel link --yes --project phosphor-performance --scope fabianxvogts-projects --cwd dist` and `npx vercel deploy --prod --yes --scope fabianxvogts-projects --cwd dist`. Builds recreate `dist`, including the upload exclusion policy; re-link after rebuilding. Only deploy reviewed distribution assets. `.env*`, `.vercel`, other-provider metadata and the exclusion file itself are excluded; never publish CLI-generated environment tokens. Git connection is intentionally not required, avoiding an automatic deployment of the separate default-branch instrument.

## Show acceptance checklist — not yet executed

1. Run the intended set for its full 2–4-hour duration on the target laptop, browser, audio interface and projector. Include every fade, quiet look and highest-cost combination; log observed frame timing, quality reductions, memory and thermal behavior. Prevent OS sleep; Wake Lock alone is not authority over OS power settings.
2. Exercise real MIDI controller routing/clock, Start/Stop/Continue and disconnection, real line input at representative levels, permission denial, source changes and monitoring. Confirm there is no speaker feedback; simulated MIDI messages do not establish physical compatibility.
3. Verify native file pickers, disk space/write throughput, finalization and reopening the full recording. Use OBS for long archival capture; browser container seeking/crash recovery is not certified.
4. Repeat offline/fullscreen checks on the physical show machine, including browser restart/storage retention. Rehearse updates only after all old windows close. Deploy the complete distribution atomically; never mix partial uploads or update mid-show.
5. Performer/viewer review: cue ergonomics, readability at projection distance, pacing, fatigue, color/black levels, reduced-motion behavior and sensitive-viewer suitability. No strobe is bundled, but no photosensitivity safety claim follows from that.

New families follow the [roadmap](../ROADMAP.md): the frozen v6 instrument's Fractal Flight, Julia, Fourth Dimension and Hyperbolic Loom are ported in Milestone 2, after the Milestone 1 reliability and art-direction gates.
