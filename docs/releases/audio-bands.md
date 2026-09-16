# Audio band response

2026-09-15. **Local source improvement.** Classification: **INCREMENTAL / EMPIRICAL**. No BPM, beat-detection, or novelty claim.

## Change

The analyser now derives bounded low (20–250 Hz), mid (250–2,000 Hz), and high (2,000–12,000 Hz) peak-bin levels from the browser's byte-frequency data. Each level is smoothed on the live transport and shown beside the existing overall energy readout as `L`, `M`, and `H`. Scene parameter mappings use an intentional band: low for Feedback Chapel and Alien Aquarium, mid for Magnetic Choir, Topological Melt, Phase Transition Theatre, Fourth Dimension, and Hyperbolic Loom, and high for Causal Tapestry, Cathedrals of Error, Interference Rituals, Evolution Garden, and Julia Observatory. Advanced renderers and Interference receive that scene's selected band for their audio-reactive brightness, line weight, and phase path. Fractal Flight remains free of audio-driven camera movement, while the new Demo beat can raise only its bounded surface-detail response and shared accent pulse. Native microphone/tab setup releases empty streams and handles an ended track across the returned stream, leaving the source status actionable. When frequency data is unavailable, the prior overall-energy mapping remains the fallback.

The band state is runtime-only. Offline seeded frame rendering clears it so exported plans remain independent of connected audio, then restores the live levels and analyser-availability flag after completion, cancellation, picker failure, or writer failure. If a microphone permission or shared tab ends, source cleanup resets the bands and leaves an actionable ended-source message instead of silently returning to a generic idle label.

## Evidence

- `npm test`: 39/39 passing, including deterministic band fixtures, the bounded dark-techno pattern, offline state restoration, and output-aware Julia CPU/WebGL sizing/draw allocation.
- `npm run build` and `npm run check:dist`: passing.
- `git diff --check`: clean.

## Limits and next test

Band values are peak analyser magnitudes, not calibrated loudness or onset envelopes. Native microphone/tab permissions, device-specific frequency response, sustained performance, and performer preference remain unmeasured. The next useful check is a named-device rehearsal with bass-, vocal-, and cymbal-heavy material, recording whether the mapped scenes feel distinct without destabilizing a 20–30-minute set.
