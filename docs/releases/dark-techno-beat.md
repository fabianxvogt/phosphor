# Dark techno demo beat

Date: 2026-09-16  
Classification: **INCREMENTAL** · **EMPIRICAL**

The synthetic audio source is now a small local dark-techno instrument rather than a single sine pulse. One 16-step bar runs four-on-the-floor kick, clap backbeats, off-beat closed hats, occasional open hats, and a restrained sub line. Kick and clap events also raise a bounded beat envelope; connected files, microphone, and tab audio continue to use analyser-derived bands instead of being mixed with the demo pattern.

Every Phosphor family receives the beat envelope in two ways: its existing scene-specific audio mapping gets a bounded transient boost, and the shared output receives a subtle accent pulse. Fractal Flight participates through surface detail and the shared pulse, but the beat never steers the camera. The pattern follows the BPM control and remains local-only; no audio is uploaded or persisted.

The same envelope now gives the authored effect stack a bounded transient lift: symmetry opens, echo catches a short trail, chroma separates slightly, and glow breathes on the hit. These are render-time overlays; saved effect strengths remain unchanged.

Mute and unmute preserve the selected source and restore the authored demo level, so the heavier kick does not silently come back at a different gain.

The source dock now names the active 16th-note step, voices, and bounded beat response while the demo is running; it returns to `BEAT IDLE` when the source stops. A companion `14/14 VISUALS BEAT-LINKED` readout makes the complete scene-family coverage explicit.

The advanced-renderer import now uses a namespace boundary with a local Julia diagnostics fallback. That keeps a stale browser cache or older static module from aborting the whole instrument before the canvas and beat controls can start.

## Evidence

- `npm test`: 39/39 passing, including deterministic 16-step pattern, demo-source lifecycle, beat-readout state, and all-family modulation contracts.
- `npm run build`, `npm run check:dist`, and `git diff --check`: passing.
- Local Chrome smoke: the repaired module graph boots with `RUNNING`, Julia reports `Julia · WebGL native 960×600`, and the Demo beat source starts with `Dark techno demo beat · kick, clap, hats`, reports an active source, and exposes live steps plus `14/14 VISUALS BEAT-LINKED`. Voice-level loudness and long-run device output remain uncalibrated.

## Limits and next test

This is an authored preview groove, not a calibrated drum machine or beat detector. Repeat on a named reference device with headphones/speakers and a sustained 20–30-minute set, checking kick weight, hat harshness, output headroom, and whether each scene's visual response feels intentional.
