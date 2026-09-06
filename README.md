# Phosphor

Phosphor is a local browser instrument for performing bounded, procedural visual systems. The source preview includes ten authored families: Acid Mycelium (47), Magnetic Choir (48), Cathedrals of Error (49), Alien Aquarium (50), Causal Tapestry (51), Feedback Chapel (52), Interference Rituals (53), Topological Melt (54), Phase Transition Theatre (55), and Evolution Garden (56). They share one renderer, transport, save, replay, capture, and export contract; full-v1 acceptance remains gated by independent, browser, device, and human review.

## Try it

```sh
npm run build
npm run preview
```

Open `http://localhost:48101`. Start with the procedural demo pulse or stay silent with manual tempo. Click the stage to inject a gesture, use `Shift + ←/→` to transition scenes, and add or play cues from the set panel. All audio, rendering, saves, imports, captures, and recordings stay on the device.

## What is bounded

- Acid Mycelium runs a 120×75 Gray–Scott-style field with clamped feed, kill, diffusion, and injection values.
- Causal Tapestry stores 120 cellular-automaton rows at 220 cells wide and labels reverse playback as history playback.
- Feedback Chapel swaps two fixed 960×600 buffers and clamps decay, transform, symmetry, and impulse controls.
- Magnetic Choir caps particle trails at 480 particles, Cathedrals of Error caps recursive corridor depth at six, and Alien Aquarium caps organisms at 64.
- Interference Rituals and Phase Transition Theatre use bounded low-resolution fields; Topological Melt uses a fixed 160-point loop; Evolution Garden uses five deterministic siblings with bounded mutation controls.
- Phase Transition Theatre uses one fixed Coupled Regime Field equation with six regimes and three authored journeys. Each journey has build, transition, and release phases, selectable Play/Stop/Rehearse controls, tempo-linked progress, cue playback, and exported transition-gap measurements. The gap is a measured return-path difference, not a claim of equilibrium hysteresis. Archive measurement saves a versioned snapshot beside the live readout; reopening resets live buffers but keeps the captured model/arc/progress/control/gap record.
- `720 / 30` is the lower quality mode for constrained devices. Still capture, WebM recording with active local/demo/microphone audio mixed into the stream, and a versioned offline frame manifest are available when supported; without an audio source, recording remains a visual-only fallback.
- Reset and automatic Acid growth use a seeded trajectory. Session files carry canonical scene state, authored cues, Magnetic gesture events, and Evolution lineage. Portable setup/event replay is supported; exact live-render checkpoint replay is not promised.

## Project files

- `app.js` — shared transport, scenes, cues, audio input, save/export, and capture.
- `core.mjs` — deterministic bounded simulation primitives.
- `ROADMAP.md` — release state and next work.
- `docs/README.md` — evidence and documentation map.

## License

MIT. The procedural demo pulse and visual algorithms are original project code. No third-party media is bundled.
