# Roadmap

State: public preview is deployed as Site version 4 from saved Site source `b4c5a394b6a45edac1423d0d3f0e2c94919189ab`, containing accepted product source `a6a7f0193abd43ef42b5a70df5b0b7b4c9f0387e` and public docs HEAD `a45635a94dc12b040e7bd67e6cfe7c95f3a6ed9b`. Sustained device, audio, human, native picker, and full-v1 review remain open.

## Now

- Complete sustained reference-device observation across the ten-family journey, including long-running scenes, quality tiers, recovery, and resource behavior.
- Complete audio/listening and performer review, including local source behavior and the shared transport/cue workflow.
- Measure sustained scene behavior on the named reference laptop and record actual frame-time evidence per scene and quality tier.
- Keep source-side deterministic stress separate from browser evidence; the current suite runs 900 bounded frames across all ten families and compares identical seeded replays.

## Next

- Add richer audio feature mapping.
- Run blind preset comparison with at least three viewers and one performer.

## Later

- Optional MIDI support when browser support is detected.
- Optional URL-sharing for parameter-only sets, with imported media remaining local.

## Done

- Shared local set schema (`phosphor-set-v1`) with save, export, import validation, and recovery messaging.
- Six Acid Mycelium, eight Causal Tapestry, and six Feedback Chapel authored presets.
- Manual transport, procedural demo pulse, local audio, microphone denial handling, pause, mute, blackout, reduced motion, brightness, and quality controls.
- Cue arrangement, three authored cue arcs, cross-scene morph lifecycle, still capture, WebM recording path, executable seeded-start frame-plan import/export, and numbered PNG folder output capped at 240 frames.
- Numbered PNG frame plans use executable `phosphor-frame-sequence-v2` manifests with fixed seeded-start timing, bounded 1–240 frame jobs, one Blob/write, cancellation/failure cleanup, unique output folders, and a draw-only paused seeded preview after cleanup. The preview preserves session/clock/Phase state and leaves blackout/recovery dark. Legacy v1 recipes remain explicitly non-executable. Real OPFS directory/file readback and repeat-byte determinism pass; native picker permission and native user-folder selection remain unobserved platform gates.
- All ten families (47–56) register against the shared renderer and bounded resource contract, with accepted source mechanisms, authored presets, and shared save/replay/capture behavior.
- Source-side verification includes 21 tests, syntax/build/dist checks, a 900-frame deterministic bounded renderer stress test, and all-ten-family offline-controller dispatch coverage with deterministic fixed-step metadata, transactional hostile-plan rejection, one-at-a-time writes, cancellation, failure cleanup, unsupported-browser fallback, and pixel-readback/state checks for the paused cleanup preview. Public version 3 also passed the bounded browser/output recheck for paused brightness, fresh PNG/WebM bytes, resume, transition, Low output resize, and save/reload. The a6 paused-preview browser delta remains a separate final display check; native picker, sustained device, audio, human, and full-v1 gates remain open.
- Standalone Git repository initialized on `codex/v1`.
