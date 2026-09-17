# Dark techno demo beat

Date: 2026-09-16  
Classification: **INCREMENTAL** · **EMPIRICAL**

Performance follow-up — **2026-09-17**: Causal Tapestry keeps its full 960×600 output, but now reuses the output-width source-column map and a cached horizontal phase basis instead of allocating colors or evaluating a sine for every pixel on every frame. In the local Chrome rehearsal, the selected family measured `4.3ms` p95 with no source and `6.8ms` p95 with the Demo beat active, both within the nominal `16.7ms` frame target. This is local empirical evidence, not a named-device certification.

Performance follow-up — **2026-09-17 (Interference Rituals)**: the renderer now computes one padded composite field, reuses the center pixel's four neighbors for filtering, hoists the bounded spatial basis once per frame, and interpolates RGB channels inline. In the local Chrome rehearsal, Interference Rituals measured `10.4ms` p95 idle and `13.5ms` p95 with the Demo beat active, within the nominal `16.7ms` frame target. This is local empirical evidence, not a named-device certification.

Performance follow-up — **2026-09-17 (Cathedrals of Error)**: the renderer now reuses normalized ray directions, marches through scalar scratch state without per-pixel result objects, and keeps the native Full/Low backing during beat playback (`95%` on HD) with a bounded `10`-step march (`8` on Low); idle renders retain the authored full-detail raster. In the local Chrome rehearsal, the Full Demo-active path measured `13.9ms` p95 against the nominal `16.7ms` frame target. This is local empirical evidence, not a named-device certification.

Performance follow-up — **2026-09-17 (set timing pass)**: the output dock now offers a bounded **Measure 14 scenes** action. It warms each family once, records three timed draws at the selected output profile, fills the existing set-level p95 coverage, and restores the active scene, pause state, camera, audio source and authored set. The corrected live Demo-beat pass reached `14/14` coverage; Cathedrals of Error was the slowest family at `9.5ms` p95 and every family stayed within the nominal `16.7ms` target. The result remains a tuning/rehearsal signal rather than a certification.

Performance follow-up — **2026-09-17 (timing detail)**: expanding **Timing detail** now lists all fourteen catalog numbers and family names with each retained p95 and an explicit `within target`, `over target`, or `unmeasured` label. The list is deliberately read-only and bounded; it keeps a partial pass honest and makes a repeated slow family actionable before any renderer tuning. This remains local empirical evidence, not device certification.

Performance follow-up — **2026-09-17 (active-beat rehearsal)**: the same local pass recorded `14/14 VISUALS BEAT-LINKED`, `91` Demo onsets, and `RUN 0:26 · MAX 68% · 32% HEADROOM` while the set timing stayed within target. The family detail showed Interference Rituals at `6.0ms` p95 and Cathedrals of Error at `9.5ms` p95, with the remaining families below that tail. This corrects the earlier idle-versus-active ambiguity but is still not named-device or sustained-run evidence.

Layout follow-up — **2026-09-17**: a live desktop inspection found the responsive grid override had omitted the explicit beat-response row. Chromium therefore created implicit zero-width tracks, squeezing the source/output dock and wrapping readouts into one another. The area map now keeps `beat beat` explicit; a fresh Demo pass renders the shell as two stable columns (`813.9px + 626.1px`) and the dock as three readable tracks (`324.6px / 649.2px / 432.8px`).

Quality follow-up — **2026-09-17**: Focus quality fitting and scale diagnostics now include the browser's device-pixel ratio. On a 2× display, Julia's bounded Full CPU backing is capped to a `480px` CSS stage at the existing `1.3×` physical raster allowance, and the readout names `DPR 2.0×` instead of mislabeling the physical result as a downscale. Standard 1× behavior is unchanged.

The synthetic audio source is now a small local dark-techno instrument rather than a single sine pulse. One 16-step bar runs four-on-the-floor kick, clap backbeats, off-beat closed hats, occasional open hats, four low-level metallic ghost percussion ticks, and a restrained sub line. Kick and clap events also raise a bounded beat envelope; connected files, microphone, and tab audio continue to use analyser-derived bands instead of being mixed with the demo pattern. The round Start audio control now starts this local Demo beat when no source is connected, while an already-connected file, microphone, or tab source is only resumed. When a native source ends or returns no usable track, the control names the local Demo as a fallback.

Every Phosphor family receives the beat envelope in two ways: its existing scene-specific audio mapping gets a bounded transient boost, and the shared output receives a subtle accent pulse. Fractal Flight participates through surface detail and the shared pulse, but the beat never steers the camera. The pattern follows the BPM control and remains local-only; no audio is uploaded or persisted.

The same envelope now gives the authored effect stack a bounded transient lift: symmetry opens, echo catches a short trail, chroma separates slightly, and glow breathes on the hit. These are render-time overlays; saved effect strengths remain unchanged.

The Demo kick now layers a low sine body beneath its pitch-dropping punch and sends the summed bus through a conservative dynamics compressor when the browser supports it. This adds weight and keeps the kick/clap stack inside a predictable headroom envelope; unsupported browsers retain the uncompressed fallback.

Mute and unmute preserve the selected source and restore the authored demo level, so the heavier kick does not silently come back at a different gain.

The source dock now names the active 16th-note step, voices, and bounded beat response while the demo is running; it returns to `BEAT IDLE` when the source stops. A companion `14/14 VISUALS BEAT-LINKED` readout makes the complete scene-family coverage explicit. Global pause now holds the Demo scheduler on its current step so audio and visuals resume together.

The rehearsal surface now has a permission-free **Run beat check** action. It raises a fixed test pulse without touching the live set, verifies all fourteen scene mappings and the four shared effect links, and stores a bounded `phosphor-beat-response-v1` payload in the next report. This is wiring evidence: it does not claim that every look is aesthetically successful, that audio hardware behaves consistently, or that a device is certified.

The source dock now adds a live fourteen-cell beat scope. Each meter follows the same bounded scene response used by the renderer, so a performer can see the family-level spread while Demo, file, microphone, or tab audio is active; it is a monitor, not a second modulation path. Meter style and accessibility updates are change-only, keeping the scope cheap on CPU fallback paths.

The source dock now also labels the selected scene's bounded response and highlights that scene's family meter. Switching scenes therefore keeps the current visual's beat relationship visible without creating a parallel modulation path.

The `14/14` coverage contract now checks that each beat mapping still targets a live parameter in its scene schema. Reports keep the existing versioned shape, while the live meter, rehearsal pass, and wiring check refuse to claim complete coverage if a future scene-control rename breaks a mapping.

That guard also bounds the mapped band and modulation amount (`low`/`mid`/`high`, positive and at most `1`). The render loop consumes the same validator, so a stale or malformed entry fails closed instead of silently producing a dead family or an overdriven response.

Every active hit now adds a restrained perimeter accent to the rendered stage alongside the existing shared wash. The cue is clamped and disappears at idle, making the beat legible across all families without overpowering the authored image.

The perimeter cue now keys from a hysteresis-gated rising beat onset rather than a sustained high envelope, so loud external audio does not hold a continuous frame flash; the extra kick accent is limited to the Demo pattern. Reduced motion suppresses both the perimeter cue and the shared transient effect lift while leaving the existing scene-specific mapping available, and the selected-scene status avoids repeating live-region announcements during a steady pulse.

The output dock now keeps a bounded set-level performance summary alongside the selected-scene timing. It counts distinct visual families with retained samples, uses the worst measured scene p95 as the set-level tail, and names the slowest family. Until all fourteen families have samples, the readout says how many remain unmeasured; it is a rehearsal aid, not device certification.

The rehearsal card now condenses those signals into a local pass snapshot: source state, active audio-run duration and headroom, fourteen-family beat coverage, set timing coverage, and manual observations. It stays `IN PROGRESS` or `ATTENTION` while evidence is missing or risky, distinguishes timing warm-up from an over-target set, and only reports `READY` after a sustained 20-minute audio run plus every local gate; the label is evidence guidance, never device certification.

The source dock now keeps a bounded audio-run envelope while a source is active. It records actual active-source duration, the maximum held peak, average hold, hot/near-clip proportions, remaining headroom, and whether the sample cap was reached, then carries that snapshot through reports, cache reopen, and before/after comparison. This makes the heavy-kick/headroom check useful over a sustained device pass without storing media or claiming calibrated loudness.

The source dock also records a capped `HITS / LAST` onset snapshot. External sources use a threshold crossing with hysteresis; the Demo counts one qualifying event per 16th-note step. Reports carry the UTC timestamp and source label so a rehearsal can distinguish a real hit from a sustained envelope without treating the counter as beat-grid certification.

The rehearsal preflight card mirrors that live onset snapshot beside the pass summary, including the hit count, last source, and UTC time. It is intentionally marked diagnostic only and keeps steady-hit updates out of the screen-reader live region.

Julia's display-scale diagnostic now exposes the existing one-click `Use HD` action outside Focus mode too. When the 960×600 or CPU fallback surface is visibly enlarged, the action appears beside the stage readout so a performer can correct softness without hunting through the quality selector; HD remains an explicit, measured tradeoff.

Focus-mode Julia now uses a bounded 1440×900 WebGL backing surface when available, or a 720×450 CPU detail pass at Full (960×600 when HD is selected), reducing the common 2× enlargement to a bounded 1.3× target while leaving the normal Full output profile unchanged; the renderer readout remains explicit about the extra bounded work.

When that Focus diagnostic detects an enlarged non-HD Julia render, its `HD available` warning is now highlighted so the quality correction reads clearly before a performer opens the selector.

The advanced-renderer import now uses a namespace boundary with a local Julia diagnostics fallback. That keeps a stale browser cache or older static module from aborting the whole instrument before the canvas and beat controls can start.

## Evidence

Saved rehearsal reports now carry the bounded pass snapshot itself, preserving the 20-minute audio gate, all-family visual coverage, timing status, and manual evidence state across export and reload; older reports remain readable without that optional field.
Loading a report mirrors that stored pass level and wording in the preflight card, while legacy reports identify the missing field instead of implying a current pass.
The loaded pass and comparison lines now share an unambiguous UTC capture time and optional setup label, with an explicit stale marker after current-state changes.
The preflight card also provides a compact grouped comparison (`setup`, `transport`, `audio`, `timing`, `visuals`, `evidence`, `pass`, `set`) so handoffs can scan drift without opening the JSON.

- `npm test`: passing, including deterministic 16-step pattern, paused Demo transport, demo-source lifecycle, active-source duration across elapsed frame gaps, the rehearsal pass snapshot gate, beat-readout state, all-family modulation contracts, the live scope markup contract, the set-level performance coverage contract, bounded audio-run headroom and onset telemetry, and the versioned beat-response check/report comparison.
- Focus keeps Julia's one-click `Use HD` correction visible for any non-HD profile, making a soft enlarged preview actionable before a resize measurement arrives.
- `npm run build`, `npm run check:dist`, and `git diff --check`: passing.
- Local Chrome smoke: the repaired module graph boots with `RUNNING`, Julia reports `Julia · WebGL native 960×600`, and the Demo beat source starts with `Dark techno demo beat · kick, clap, hats, perc`, reports an active source, and exposes live steps plus `14/14 VISUALS BEAT-LINKED`. The compact beat line names `PERC` on the ghost steps without changing the first kick readout. Voice-level loudness and long-run device output remain uncalibrated.

## Limits and next test

This is an authored preview groove, not a calibrated drum machine or beat detector. Repeat on a named reference device with headphones/speakers and a sustained 20–30-minute set, checking kick weight, hat harshness, output headroom, whether each scene's visual response feels intentional, and whether all fourteen families reach the set-level timing summary. The run envelope keeps actual active-source time but bounds samples to roughly 33 minutes at a 60 Hz cadence; a `CAP` marker means the pass exceeded that evidence window.
