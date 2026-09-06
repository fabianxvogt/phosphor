# Phosphor

Phosphor is a local browser instrument for performing bounded, procedural visual systems. The public preview includes ten authored families: Acid Mycelium (47), Magnetic Choir (48), Cathedrals of Error (49), Alien Aquarium (50), Causal Tapestry (51), Feedback Chapel (52), Interference Rituals (53), Topological Melt (54), Phase Transition Theatre (55), and Evolution Garden (56). They share one renderer, transport, save, replay, capture, and export contract. Full-v1 acceptance remains gated by sustained reference-device performance, audio/listening quality, and human/performer review.

## Try it

```sh
npm run build
npm run preview
```

Open `http://localhost:48101`. Start with the procedural demo pulse or stay silent with manual tempo. Use the scene action shown on the stage: click to inject, shape flow, feed, or choose a sibling as appropriate. Use `Shift + ←/→` to transition scenes, and add or play cues from the set panel. On narrow screens, the sticky quick bar keeps pause, play, save, and export reachable. All audio, rendering, saves, imports, captures, and recordings stay on the device.

The first screen is the instrument: the canvas leads, and the Scene Library shows all ten families with their real mechanism and authored starting look. Use Explore for every bounded scene control, Perform for a smaller live-control surface, and Focus canvas for an immersive stage view. Scene changes keep the shared preset, cue, save, archive, and keyboard/pointer behavior intact.

## Verified public preview

Deployed version 3 uses exact source `a67de5338040aee56b598362bf0b2ce5e228eed9`. A bounded Chrome recheck of the public preview passed Evolution mutation and selection, paused brightness adjustment, fresh 960×600 PNG and WebM capture, resume and scene transition, Low 480×300 / 30 target output, and save/reload. This confirms the reviewed public preview output path; it does not establish sustained device performance, audio/listening quality, human acceptance, or full-v1 acceptance.

## What is bounded

- Acid Mycelium runs a 120×75 Gray–Scott-style field with clamped feed, kill, diffusion, and injection values.
- Causal Tapestry stores 120 cellular-automaton rows at 220 cells wide and labels reverse playback as history playback.
- Feedback Chapel swaps two fixed 960×600 buffers and clamps decay, transform, symmetry, and impulse controls.
- Magnetic Choir caps particle trails at 480 particles and records beat-timed gestures for transport-aware replay; untimed legacy gestures are explicitly migrated as apply-now events. Cathedrals of Error caps recursive corridor depth at six and its authored looks change bounded surface light, material sheen, depth fog, and edge emission in addition to geometry and palette. Alien Aquarium caps organisms at 64 and advances a seeded field of 12 local food patches: nearby living organisms consume and regain energy, while starved inactive organisms cannot feed.
- Interference Rituals and Phase Transition Theatre use bounded low-resolution fields; Topological Melt uses a fixed 160-point loop; Evolution Garden uses five deterministic siblings with bounded mutation controls.
- Phase Transition Theatre uses one fixed Coupled Regime Field equation with six regimes and three authored journeys. Each journey has build, transition, and release phases, selectable Play/Stop/Rehearse controls, tempo-linked progress, cue playback, and exported transition-gap measurements. The gap is a measured return-path difference, not a claim of equilibrium hysteresis. Archive measurement saves a versioned snapshot beside a compact live-current inspector; reopening resets live buffers but keeps the captured model/arc/curve/phase/progress/tempo/control/gap and event position visible without opening JSON.
- `Full · 960×600 / 60 target` and `Low · 480×300 / 30 target` resize the actual canvas and reduce expensive sampling/particle/organism budgets immediately. They are targets, not measured FPS claims. Frame plans carry the active output profile and optional per-scene median/p95 frame-time samples when a real runtime has produced them. Still capture, WebM recording with active local/demo/microphone audio mixed into the stream, and an executable offline frame plan are available when supported; the plan uses `phosphor-frame-sequence-v2`, imports/exports bounded seeded settings, and writes numbered PNGs into a new user-chosen job folder, up to 240 frames, without restoring a live buffer. Legacy `phosphor-frame-sequence-v1` JSON remains a recipe-only format and is rejected with an instruction to export a new plan. Browsers without folder writing keep still, WebM, and plan export with a clear batch-output-unavailable message; without an audio source, recording remains a visual-only fallback.
- Reset and automatic Acid growth use a seeded trajectory. Session files carry canonical scene state, authored cues, Magnetic gesture events, and Evolution lineage. Portable setup/event replay is supported; exact live-render checkpoint replay is not promised.

## Project files

- `app.js` — shared transport, scenes, cues, audio input, save/export, and capture.
- `core.mjs` — deterministic bounded simulation primitives.
- `ROADMAP.md` — release state and next work.
- `docs/README.md` — evidence and documentation map.

## License

MIT. The procedural demo pulse and visual algorithms are original project code. No third-party media is bundled.
