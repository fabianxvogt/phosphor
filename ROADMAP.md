# Roadmap

State: production candidate; canonical branch `main`; [Vercel](https://phosphor-performance.vercel.app/) is a frozen free demo. Direction set 2026-10-08 in an owner interview, recorded in the [decision log](docs/DECISIONS.md):

**Phosphor is the owner's VJ instrument for other people's DJ sets.** One MacBook Pro M3 Pro, Chrome, HDMI straight to whatever screen the venue has, 4–8-hour nights, generative visuals only. Reference: [docs](docs/README.md), [evidence log](docs/EVIDENCE.md).

First show: **2026-12-17** (planning placeholder until a real date exists). Feature freeze two weeks before. The date is fixed; scope flexes.

## Product shape

- **Play:** 4×8 clip grid on the keyboard (physical key positions, so QWERTZ works), eight pages. Show mode has no editors; Prep mode has everything. A fresh stage plays at once: demo beat at 120 BPM, autopilot in Random mode (random clips, parameters gliding around their saved values, every change crossfaded; D49, D50). Any manual trigger takes over and hands back after 32 idle bars.
- **Controls:** shared master, energy, speed trim (½×/1×/2×), hue, zoom, mirror and flash (through the limiter); three family controls on stage, all eight in Prep. A clip stores its look, base energy, fade, quantize and autopilot flag.
- **Timing:** line feed from the DJ mixer. Automatic tempo and beat phase, downbeat by key, builds/drops/breakdowns from loudness. Tap, downbeat and nudge always work alone. Techno/house, 100–150 BPM.
- **Output:** the output window renders at the screen's native size and shape (≈2.1 MP budget) and owns show state, audio, beat tracking and autopilot; the control window is a remote with a preview. Full restore after a crash in ≤ 10 s.
- **Visuals:** 16 families, 3–4 structurally distinct types each, every type spanning very low to very high energy (Aquarium is the only calm-only family). Shared kick responses for every family.

## Now (2026-10-08)

Platform for the first show is implemented on `main` and waits for rig verification: stage renderer and remote control, keyboard grid and pages, Show/Prep, tap/downbeat/nudge, energy and shared beat responses, flash limiter, crash restore, pre-show check, telemetry, cover-crop, bar-count autopilot with the Random default mode (D49, D50), failed-family isolation and the ray-step-first governor ([decisions D44–D50](docs/DECISIONS.md#follow-up-interview-2026-10-08)). All four group 1 families have sign-off packets with technical checks and rig timing passed and **await owner art sign-off**; group 2 is in lanes. Owner inputs pending: 5–10 recorded mixes in `~/Development/phosphor-mixes`, family sign-offs, rig runs with the external display.

## Milestone 1 — first show

| Weeks | Dates | Work |
| --- | --- | --- |
| 1 | 8–14 Oct | Review and merge `lane/test-harness`, `lane/image-pipeline`, `lane/app-core`. Owner provides 5–10 recorded mixes (outside the repo). Beat-tracker prototype. |
| 2–3 | 15–28 Oct | Output window becomes renderer and show owner; control window becomes a remote. Scene contract v3: energy curve, beat responses, types, any aspect. Remove linear score, keyframes, WebM/frame export, MIDI clock, manual audio routing. Measure beat tracking on the mixes. |
| 4–5 | 29 Oct–11 Nov | Grid, keyboard map and pages; Show/Prep; shared controls and energy fader; crash recovery; preflight; bar-count autopilot. Group 1 families start in parallel. |
| 4–8 | 29 Oct–2 Dec | Families in queue order, owner sign-off weekly. Auto beat tracking and build/drop autopilot if they meet their targets. |
| 9 | 3–9 Dec | Freeze. 8-hour run, fixes only. |
| 10 | 10–16 Dec | Second 8-hour run if fixes landed; line check with a real DJ mixer feed. |

**Checkpoint 2026-11-11:** if fewer than three group 1 families have passed the family gate, group 2 leaves the first-show scope and Melt and Acid move up.

### Required for the first show

Output-window renderer; keyboard grid; Show/Prep; tap, downbeat and nudge; energy fader and shared beat responses; flash limiter (on by default, locked during a show); crash recovery; preflight; telemetry; every screen shape handled at least by cover-crop; bar-count autopilot. Minimum content: six families through the family gate, at least two strong at peak time.

### Ships only if ready

Automatic beat tracking (lock within 8 beats of a tempo change, phase error < 20 ms, holds through a 32-bar breakdown, on the owner's mixes); autopilot build/drop response; native per-family composition for odd screen shapes.

### Family queue

1. Cathedral, Interference (plus hard-edged peak mode), Feedback, Tapestry
2. Pulse Geometry (new), Fractal Flight (v6 port)
3. Melt, Acid (absorbs Evolution Garden as a "garden" type)
4. Light Beams (new), Particle Swarm (new)
5. Julia Observatory, Fourth Dimension, Hyperbolic Loom (v6 ports)
6. Magnetic and Phase reworks, then Aquarium (calm-only)

v6 families are ported as ideas, not Canvas2D code: new GPU scenes on contract v3. Fractal Flight's manual flying becomes authored camera paths, one per type. Families after group 1 join the first show only if they pass the gate before the freeze; the rest continue in order after it.

### Family gate

At least three types that pass the grayscale distinctness sheet (same palette, mid energy; structural metric flags near pairs, including across families) and owner sign-off; an owner-approved energy ladder (0.1 / 0.5 / 0.9) for every type; frame p99 ≤ 34 ms on the reference rig at the 1080p-equivalent budget with the costliest type at full energy; GPU error zero and no non-finite shader inputs; correct at 16:9, ultra-wide and square; kick response through the shared beat layer. A family merges only after it passes.

### Family gate status

Every family below is a draft until it passes (D47). Packets: `docs/families/<id>.md`.

| Group | Family | Status |
| --- | --- | --- |
| 1 | Feedback Chapel | [packet](docs/families/feedback.md): types, ladder, aspect, correctness and rig timing pass; **awaiting owner art sign-off** |
| 1 | Causal Tapestry | [packet](docs/families/tapestry.md): four types pass within the family; Cascade has cross-family near pairs (nearest Melt 0.138), the other three are clear; ladder, aspect, correctness and rig timing pass; **awaiting owner art sign-off** |
| 1 | Cathedrals of Error | [packet](docs/families/cathedral.md): four types pass within the family; Crystals and Roses have cross-family near pairs (0.224–0.245), Vaults and Folded are clear; ladder at 64 ray steps, aspect, correctness and rig timing pass; **awaiting owner art sign-off** |
| 1 | Interference Rituals | [packet](docs/families/interference.md): six compositions consolidated into three distinct types (no near pair within or across families); ladder, aspect, correctness and rig timing pass; **awaiting owner art sign-off** |
| 2 | Pulse Geometry | [packet](docs/families/pulse.md): four forms pass within the family; the tunnel (form 1) has cross-family near pairs (Hyperbolic 0.168–0.210, Fourth Dimension, Evolution), the other three are clear; ladder, ±12 % drift, aspect, correctness and rig timing pass; **awaiting owner art sign-off** |
| 2 | Fractal Flight | in lane |
| 3 | Melt, Acid (+ garden type) | draft |
| 4 | Light Beams, Particle Swarm | draft |
| 5 | Julia Observatory, Fourth Dimension, Hyperbolic Loom | draft |
| 6 | Magnetic, Phase (reworks), Aquarium | draft |

### Show gate

Eight hours unattended on the M3 Pro (mains power, Chrome, external display at native resolution), recorded mixes through the line input, autopilot on: zero crashes and manual recoveries; frame p99 ≤ 34 ms; no quality downgrade after the first ten minutes; heap growth ≤ 50 MB; blackout reaches the output within two frames, measured at the output; crash drill back on screen in ≤ 10 s with ≤ 2 clicks; beat-tracking targets met if it ships; one line check with a real DJ mixer feed.

### How work runs

Platform changes go one at a time on `main`, because they change contracts every scene depends on. After contract v3, families run in parallel branches, one family per branch. Claude builds, tests and produces contact sheets, ladders and headless correctness; real-GPU family timing (`npm run timing -- --rig`) runs one family at a time on the rig; the owner provides mixes, art sign-off and show-gate rig runs. CI runs unit tests, synthetic click-track beat tests and a headless render smoke of shipped families; mixes, soaks and ladder sign-off run locally and never enter the repo.

## After the first show

Remaining families in queue order. Optional families: Oscilloscope, Terrain. v6 set import only if the owner has v6 sets worth keeping.

## Cut

Linear cue score and keyframes; WebM recording and PNG frame-sequence export (PNG snapshots stay); MIDI clock and Start/Stop/Continue; manual band-to-parameter audio routing; Safari and Firefox support; Milestone 3 (outside performers); further work on the public demo. MIDI learn for CC/notes stays.

## Done

- Ten families / 62 looks on one WebGL2 engine; fixed 60 Hz simulation with bounded catch-up; two-slot transitions with interrupted-mix recovery; context-loss rebuild.
- Cue scores with keyframes, quantized GO, director mode; audio/MIDI routing and clock; clean projector output; PNG/WebM/frame-sequence export; strict portable v2 sets with v1 migration and recovery backup; content-stamped offline cache.
- Public Vercel release with hosted all-family, offline, 390 px and output checks (see evidence log).
- 2026-10-08: critical review; `main` became canonical; Pages mirror retired; v6 source frozen and tagged `archive/v6-canvas`; owner interview set the VJ direction above.
- 2026-10-08: lanes merged (test harness, image pipeline incl. review fixes R1–R6, app core); show core, stage/control split and contract v3; beat tracker with synthetic tests; seven new or ported families as drafts; failed-family isolation, ray-step-first governor, pre-show facts, family timing runner; soak counters judged before the crash drill; leftover frame-sequence export code removed. Evidence: [log](docs/EVIDENCE.md).
