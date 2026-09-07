# Phosphor

A browser instrument for psychedelic generative visuals. Fourteen scene families share live controls, per-scene colors, layered effects, music response, portable sets, and visual export.

[Open the public preview](https://phosphor-visual-instrument.fabian523417.chatgpt.site/). The thirteen-family studio update is live; the unreleased Fractal Flight integration is recorded in [docs/releases/performance-score.md](docs/releases/performance-score.md).

## Play

```sh
npm run build
npm run preview
```

Open `http://localhost:48101`. Choose a scene and an authored look. Shape it with the controls, choose a color collection or edit all three colors, then add effects. Artwork colors never change the interface text or controls. Each scene remembers its own palette.

Try **Julia Observatory** for complex fractal filaments; **Fourth Dimension → Hopf lantern** for linked circles rotating through four dimensions; or **Hyperbolic Loom** for geodesics flowing through a Poincaré disk. **Trip stack** combines kaleidoscope, echo trails, chromatic split, and glow. Each layer has an independent strength; Clear effects returns to the raw scene. This stack processes one active scene; mixing several independent scene generators is future work.

The original ten families remain: Acid Mycelium, Causal Tapestry, Feedback Chapel, Magnetic Choir, Cathedrals of Error, Alien Aquarium, Interference Rituals, Topological Melt, Phase Transition Theatre, and Evolution Garden. Julia Observatory, Fourth Dimension, Hyperbolic Loom, and Fractal Flight extend the library with complex filaments, a 4D tesseract/Hopf instrument, hyperbolic geodesics, and a seeded Mandelbox distance-field flight. Topological Melt now rotates and morphs a projected 3D loop with working view, thickness, and color controls. Phase Transition Theatre now sustains moving spatial patterns; Play journey animates its controls, while Manual controls gives them back to you. It is an artistic driven field, not a thermodynamic simulation.

Use Pause to compose a still, Shift + left/right to change scenes, B for blackout, and Focus canvas for an immersive view. Explore exposes every control; Perform keeps a smaller set. Add cues to capture the current scene look, palette, and effects; use the cue refresh control to update one safely. Save set for local persistence, Restore previous set to recover the last persisted tab state, and Export JSON to reopen it elsewhere. The explicit Load 24m score action provides a nine-cue, three-look rehearsal example; it does not run until selected. Three-, ten-, and thirteen-scene saves migrate to the fourteen-family library.

## Music

Choose a local audio file, the synthetic Demo pulse, Microphone, or Use tab audio. For internet radio, open an official player such as [cliqhop IDM](https://somafm.com/cliqhop/) in a browser tab, start playback, then select that tab with audio sharing enabled. Availability varies by desktop browser. A tab with no audio track produces a clear error; files and microphone remain alternatives. Stop music releases the source. Response controls sensitivity.

Music analysis stays on the device. Microphone and shared-tab audio are analysed without speaker monitoring and are excluded from recordings. Local-file/demo audio can accompany WebM recording. No station streams or third-party media are bundled. Sources must be reconnected after reopening a set; media itself is never saved in JSON. Current response uses smoothed energy, not measured BPM or beat detection.

## Output and limits

Full (960×600 / 60 target) and Low (480×300 / 30 target) change real canvas dimensions and work budgets; the rates are targets, not measured guarantees. Julia uses a bounded, lower-resolution CPU sampling grid. The 4D scene contains a real tesseract graph and projected Hopf fibers. Hyperbolic Loom uses true disk geodesics and Möbius isometries; it is not a regular tiling or curved-space ray marcher. Evolution Garden currently breeds bounded harmonic contours, not neural networks or organisms.

Capture still, WebM recording, and numbered PNG frame plans use the same visual/effect output. Offline plans render 1–240 frames from a seeded start into a new folder where directory writing is supported. They preserve setup and events, not a lossless live-buffer checkpoint. Cancel/failure restores a paused seeded preview; blackout and recovery stay dark. Old Phase field plans require re-export, while archived old measurements retain their original model identity.

The public preview is not full-v1 acceptance: sustained reference-device performance, native microphone/tab capture, native folder permission, and performer review remain open. See [verification](docs/releases/studio.md), [score and Fractal Flight evidence](docs/releases/performance-score.md), [roadmap](ROADMAP.md), and [algorithm research](docs/research/README.md).

## Source

`app.js` integrates scenes, audio, transport, persistence, and export; `core.mjs` contains deterministic simulation primitives; `advanced.mjs` implements fractal/4D/hyperbolic drawing; `mandelbox-flythrough.mjs` implements the bounded WebGL Mandelbox flight; `effects.mjs` implements the bounded effect stack. Run `npm test`, `npm run build`, and `npm run check:dist` for source verification.

## License

MIT. Visual implementations and the procedural demo pulse are project code based on established algorithms. No claim of mathematical novelty is made.
