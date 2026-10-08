# Phosphor documentation

- [Performer guide](../README.md) · [Roadmap and gates](../ROADMAP.md) · [Decision log](DECISIONS.md) · [Evidence log](EVIDENCE.md)
- Creative brief: `Development/docs/projects/GAMES_VISUALS_CREATIVE.md`, families 47–56.

## Classification

**INCREMENTAL / EMPIRICAL.** A product rebuild, not a research novelty claim. All ten scene modules are implemented; none is a placeholder. Mathematical/biological discovery, topology preservation, automatic musical understanding and cross-device exact replay are not claimed. State: production candidate; the Milestone 1 rig rehearsal and multi-hour endurance gates remain open.

## How a show runs

The **stage** window owns the show: renderer, show controller, clock, autopilot, audio input and the beat tracker (AudioWorklet). The **control** window is a remote over a BroadcastChannel: it edits the set, sends performer actions and shows the stage's state and a preview. Either window can reload without stopping the other; the stage saves its runtime state every second and restores the current clip, energy, speed, shared controls and tempo after a reload.

- **Sets (v3):** 8 pages × 32 slots. A clip stores family, parameters, seed, palette, base energy, fade (beats), start quantization (beat / bar / immediately) and whether autopilot may play it. Shared controls — master, hue, zoom, mirror — and the speed trim are a mixer strip, not part of clips. v1/v2 files (including v6 14-family sets) import through the v2 migration; cues become clips, and keyframes, audio routings and score-only MIDI targets are reported as dropped.
- **Clock:** one monotonic beat. Following audio, it steers toward the tracker with slew-limited, forward-only corrections and holds tempo and phase through breakdowns; nudges set a latency offset. Taps switch to manual tempo. Enter marks beat 1 of the bar. Beat tracking assumes 4/4 at 100–150 BPM (half and double tempo fold in).
- **Autopilot:** plays allowed clips on the current page every 16/32/64 bars, never repeats the last six, and on loudness events raises energy (build), cuts to a higher-energy clip on the downbeat (drop) or lowers energy, halves speed and later moves to a calmer clip (breakdown). It never changes master, blackout, flash or page.
- **Energy:** each family declares how its parameters move from calm to intense (additive or multiplicative slopes from the clip's own base energy) and which shared beat responses it takes: zoom punch and brightness pulse on the kick, optional injection into simulations. Flashes unlock above energy 0.8 and always pass the flash limiter.
- **Screens:** the stage renders at the screen's native size within a pixel budget (2.1 / 1 / 0.5 MP). Math and raymarched families compose natively; simulation families render a 16:9 frame that is cover-cropped to any other shape. Frames are paced at about 60 Hz whatever the display's refresh rate; the budget only steps down after two slow five-second windows.

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

Simulation runs on a fixed 60 Hz clock with at most six catch-up ticks per frame; the speed trim scales it (½×, 2×). Crossfades keep at most two slots, then dispose the old one; the engine counts every texture it creates and the harness checks none leak. Each family compiles in parallel; one failed shader disables that family only. A frame error loads the safe look instead of stopping the show. WebGL context loss rebuilds resources and restarts the latest seed.

## Save and export

- **Sets:** saved locally on every edit (never during playback) and exported as `.phosphor.json`. Export before rehearsal and before the show.
- **Rehearsal log:** per-minute frame timing (p50/p95/p99), errors, memory, budget, scene and tempo lock, exported from the pre-show panel.
- **Contact sheets** (`npm run contact`): looks, energy ladders (`--sheet ladder`) and grayscale distinctness of each family's types (`--sheet types`).
- **Offline:** all assets are precached as one content-stamped generation. A new release waits until every Phosphor window is closed. Never update mid-show.

## Release operations

Vercel production (`fabianxvogts-projects/phosphor-performance`) is the only public deployment, published from reviewed `dist` at checkpoints, never mid-show. The GitHub Pages mirror was retired on 2026-10-08. For manual Vercel updates: `npm run build && npm run check:dist`, then `npx vercel link --yes --project phosphor-performance --scope fabianxvogts-projects --cwd dist` and `npx vercel deploy --prod --yes --scope fabianxvogts-projects --cwd dist`. Builds recreate `dist`, including the upload exclusion policy; re-link after rebuilding. Only deploy reviewed distribution assets. `.env*`, `.vercel`, other-provider metadata and the exclusion file itself are excluded; never publish CLI-generated environment tokens. Git connection is intentionally not required, avoiding an automatic deployment of the separate default-branch instrument.

## Show acceptance

The show gate is in the [roadmap](../ROADMAP.md): an eight-hour unattended run on the reference rig with recorded mixes through the line input (`npm run soak -- --rig --minutes 480 --audio mix.wav`), blackout latency, a crash drill and a line check with a real DJ mixer. Not yet executed.
