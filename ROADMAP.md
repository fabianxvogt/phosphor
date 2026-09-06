# Roadmap

State: public preview deployed from exact source `a67de5338040aee56b598362bf0b2ce5e228eed9` (version 3); bounded browser/output acceptance passed, while sustained device, audio, human, and full-v1 review remain open

## Now

- Complete sustained reference-device observation across the ten-family journey, including long-running scenes, quality tiers, recovery, and resource behavior.
- Complete audio/listening and performer review, including local source behavior and the shared transport/cue workflow.
- Measure sustained scene behavior on the named reference laptop and record actual frame-time evidence per scene and quality tier.
- Keep source-side deterministic stress separate from browser evidence; the current suite runs 900 bounded frames across all ten families and compares identical seeded replays.

## Next

- Add richer audio feature mapping and a documented offline frame runner.
- Run blind preset comparison with at least three viewers and one performer.

## Later

- Optional MIDI support when browser support is detected.
- Optional URL-sharing for parameter-only sets, with imported media remaining local.

## Done

- Shared local set schema (`phosphor-set-v1`) with save, export, import validation, and recovery messaging.
- Six Acid Mycelium, eight Causal Tapestry, and six Feedback Chapel authored presets.
- Manual transport, procedural demo pulse, local audio, microphone denial handling, pause, mute, blackout, reduced motion, brightness, and quality controls.
- Cue arrangement, three authored cue arcs, cross-scene morph lifecycle, still capture, WebM recording path, and offline frame manifest export.
- All ten families (47–56) register against the shared renderer and bounded resource contract, with accepted source mechanisms, authored presets, and shared save/replay/capture behavior.
- Source-side verification includes 21 tests, syntax/build/dist checks, and a 900-frame deterministic bounded renderer stress test. Public version 3 also passed the bounded browser/output recheck for paused brightness, fresh PNG/WebM bytes, resume, transition, Low output resize, and save/reload. Sustained device, audio, human, and full-v1 gates remain open.
- Standalone Git repository initialized on `codex/v1`.
