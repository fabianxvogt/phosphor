# Phosphor

A browser visual instrument for live shows: ten GPU-simulated scene families, 62 authored looks, cue scores, audio/MIDI response and a clean projector output. Everything runs locally in the browser.

**Live:** [phosphor-performance.vercel.app](https://phosphor-performance.vercel.app/) · **State:** production candidate, being reshaped into a VJ instrument for other people's DJ sets (first show planned for December 2026); see [ROADMAP](ROADMAP.md) and [decisions](docs/DECISIONS.md). Reference runtime: desktop Chrome on an Apple M3 Pro.

## Run

```sh
npm test && npm run build && npm run check:dist
npm run preview   # http://localhost:48101 (built, offline-capable)
```

No install is needed to run the app. Microphone, MIDI, offline cache and folder export need HTTPS or localhost.

## Perform

1. **Scenes / controls:** pick a family and look; tune parameters, seed, palette, bloom and kaleidoscope. Click the stage to inject.
2. **Set / cues:** capture looks as cues, set bars and fade beats, add keyframes. **GO** arms the next cue on the next bar; **Play score** loops the set.
3. **Audio / MIDI:** demo, local file or live input (never sent to speakers). Route energy/bass/mid/high/onset to controls; tap or set tempo, or follow MIDI clock.
4. **Open clean output**, drag it to the projector, go fullscreen. Keep both windows open.
5. **Export the set** before rehearsal and before the show. Media and device choices are not stored; reattach audio after reopening.

**Keys:** B blackout · Esc safe look · P pause · R reset · Shift+arrows change scene · Enter next cue · Space inject.

## Families

Acid Mycelium · Magnetic Choir · Cathedrals of Error · Alien Aquarium · Causal Tapestry · Feedback Chapel · Interference Rituals · Topological Melt · Phase Transition Theatre · Evolution Garden. Models, bounds and limits: [docs](docs/README.md).

## Source

`app.js` UI and lifecycle · `engine.mjs` + `scene-*.mjs` renderer and scenes · `audio.mjs` audio/MIDI · `session.mjs`, `evolution.mjs` sets and breeding · `docs/` reference and [evidence](docs/EVIDENCE.md).

MIT. No third-party media is bundled.
