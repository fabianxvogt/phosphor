# Phosphor

Phosphor is a local browser instrument for performing bounded, procedural visual systems. The v1 release in this repository includes three authored families: Acid Mycelium (47), Causal Tapestry (51), and Feedback Chapel (52). The repository is the shared home for all ten Phosphor families (47–56); additional families can register against the same scene contract without creating a second engine.

## Try it

```sh
npm run build
npm run preview
```

Open `http://localhost:4173`. Start with the procedural demo pulse or stay silent with manual tempo. Click the stage to inject a gesture, use `Shift + ←/→` to transition scenes, and add or play cues from the set panel. All audio, rendering, saves, imports, captures, and recordings stay on the device.

## What is bounded

- Acid Mycelium runs a 120×75 Gray–Scott-style field with clamped feed, kill, diffusion, and injection values.
- Causal Tapestry stores 120 cellular-automaton rows at 220 cells wide and labels reverse playback as history playback.
- Feedback Chapel swaps two fixed 960×600 buffers and clamps decay, transform, symmetry, and impulse controls.
- `720 / 30` is the lower quality mode for constrained devices. Still capture, WebM recording with active local/demo/microphone audio mixed into the stream, and a versioned offline frame manifest are available when supported; without an audio source, recording remains a visual-only fallback.
- Reset and automatic Acid growth use a seeded trajectory. Session files carry save metadata, while the canonical scene state and event controls remain reproducible without reattaching imported media.

## Project files

- `app.js` — shared transport, scenes, cues, audio input, save/export, and capture.
- `core.mjs` — deterministic bounded simulation primitives.
- `ROADMAP.md` — release state and next work.
- `docs/README.md` — evidence and documentation map.

## License

MIT. The procedural demo pulse and visual algorithms are original project code. No third-party media is bundled.
