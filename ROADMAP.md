# Roadmap

State: source-complete verification (all ten families implemented; browser/device/human review pending)

## Now

- Run the browser/device journey when access is granted: fresh start, ten scene transitions, save/reload, export/import, malformed import, capture, and recording capability detection.
- Measure sustained scene behavior on the named reference laptop and record actual frame-time evidence per scene and quality tier.
- Obtain independent exact-source review for each new scene commit before publication.

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
- All ten families (47–56) now register against the shared renderer, bounded resource, preset, save/replay, and transition contract; source checks cover the ten-family registration and new fixed caps.
- Standalone Git repository initialized on `codex/v1`.
