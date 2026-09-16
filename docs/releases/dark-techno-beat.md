# Dark techno demo beat

Date: 2026-09-16  
Classification: **INCREMENTAL** · **EMPIRICAL**

The synthetic audio source is now a small local dark-techno instrument rather than a single sine pulse. One 16-step bar runs four-on-the-floor kick, clap backbeats, off-beat closed hats, occasional open hats, and a restrained sub line. Kick and clap events also raise a bounded beat envelope; connected files, microphone, and tab audio continue to use analyser-derived bands instead of being mixed with the demo pattern.

Every Phosphor family receives the beat envelope in two ways: its existing scene-specific audio mapping gets a bounded transient boost, and the shared output receives a subtle accent pulse. Fractal Flight participates through surface detail and the shared pulse, but the beat never steers the camera. The pattern follows the BPM control and remains local-only; no audio is uploaded or persisted.

The same envelope now gives the authored effect stack a bounded transient lift: symmetry opens, echo catches a short trail, chroma separates slightly, and glow breathes on the hit. These are render-time overlays; saved effect strengths remain unchanged.

The Demo kick now layers a low sine body beneath its pitch-dropping punch and sends the summed bus through a conservative dynamics compressor when the browser supports it. This adds weight and keeps the kick/clap stack inside a predictable headroom envelope; unsupported browsers retain the uncompressed fallback.

Mute and unmute preserve the selected source and restore the authored demo level, so the heavier kick does not silently come back at a different gain.

The source dock now names the active 16th-note step, voices, and bounded beat response while the demo is running; it returns to `BEAT IDLE` when the source stops. A companion `14/14 VISUALS BEAT-LINKED` readout makes the complete scene-family coverage explicit. Global pause now holds the Demo scheduler on its current step so audio and visuals resume together.

The rehearsal surface now has a permission-free **Run beat check** action. It raises a fixed test pulse without touching the live set, verifies all fourteen scene mappings and the four shared effect links, and stores a bounded `phosphor-beat-response-v1` payload in the next report. This is wiring evidence: it does not claim that every look is aesthetically successful, that audio hardware behaves consistently, or that a device is certified.

The source dock now adds a live fourteen-cell beat scope. Each meter follows the same bounded scene response used by the renderer, so a performer can see the family-level spread while Demo, file, microphone, or tab audio is active; it is a monitor, not a second modulation path. Meter style and accessibility updates are change-only, keeping the scope cheap on CPU fallback paths.

The output dock now keeps a bounded set-level performance summary alongside the selected-scene timing. It counts distinct visual families with retained samples, uses the worst measured scene p95 as the set-level tail, and names the slowest family. Until all fourteen families have samples, the readout says how many remain unmeasured; it is a rehearsal aid, not device certification.

The rehearsal card now condenses those signals into a local pass snapshot: source state, active audio-run duration and headroom, fourteen-family beat coverage, set timing coverage, and manual observations. It stays `IN PROGRESS` or `ATTENTION` while evidence is missing or risky, distinguishes timing warm-up from an over-target set, and only reports `READY` after a sustained 20-minute audio run plus every local gate; the label is evidence guidance, never device certification.

The source dock now keeps a bounded audio-run envelope while a source is active. It records actual active-source duration, the maximum held peak, average hold, hot/near-clip proportions, remaining headroom, and whether the sample cap was reached, then carries that snapshot through reports, cache reopen, and before/after comparison. This makes the heavy-kick/headroom check useful over a sustained device pass without storing media or claiming calibrated loudness.

Julia's display-scale diagnostic now exposes the existing one-click `Use HD` action outside Focus mode too. When the 960×600 or CPU fallback surface is visibly enlarged, the action appears beside the stage readout so a performer can correct softness without hunting through the quality selector; HD remains an explicit, measured tradeoff.

The advanced-renderer import now uses a namespace boundary with a local Julia diagnostics fallback. That keeps a stale browser cache or older static module from aborting the whole instrument before the canvas and beat controls can start.

## Evidence

- `npm test`: passing, including deterministic 16-step pattern, paused Demo transport, demo-source lifecycle, active-source duration across elapsed frame gaps, the rehearsal pass snapshot gate, beat-readout state, all-family modulation contracts, the live scope markup contract, the set-level performance coverage contract, bounded audio-run headroom telemetry, and the versioned beat-response check/report comparison.
- `npm run build`, `npm run check:dist`, and `git diff --check`: passing.
- Local Chrome smoke: the repaired module graph boots with `RUNNING`, Julia reports `Julia · WebGL native 960×600`, and the Demo beat source starts with `Dark techno demo beat · kick, clap, hats`, reports an active source, and exposes live steps plus `14/14 VISUALS BEAT-LINKED`. Voice-level loudness and long-run device output remain uncalibrated.

## Limits and next test

This is an authored preview groove, not a calibrated drum machine or beat detector. Repeat on a named reference device with headphones/speakers and a sustained 20–30-minute set, checking kick weight, hat harshness, output headroom, whether each scene's visual response feels intentional, and whether all fourteen families reach the set-level timing summary. The run envelope keeps actual active-source time but bounds samples to roughly 33 minutes at a 60 Hz cadence; a `CAP` marker means the pass exceeded that evidence window.
