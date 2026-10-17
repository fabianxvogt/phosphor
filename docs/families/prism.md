# Prism Engine · Prismenmaschine (#108)

**Shard / Splitter → Array / Anordnung → Kaleidoscope / Kaleidoskop** is one continuous optical world. The same prism splits an incident beam, grows eight relays and four biconvex lenses, then opens into a seven-bay pointed glass nave with a ten-prism optical rose. World/family ids, state/preset names, seeds, schema keys and the original three rhythm ids are unchanged.

## Round 4 — review response

Independent r3: L6/G8.5/E6.5, Overall6.5. This revision changes spatial staging, material hierarchy and event topology rather than adding global glow.

- Shard now shares the room with a large, asymmetric near-left optical surface and a distant persistent relay. Both become existing Array relays continuously; CPU/GLSL poses agree. Separated receding floor images and a far-vault reflection establish depth. Hero, incident ray, dispersed fan and opened peak rose remain.
- Broad transmitted face bands and thickness-darkened edges replace uniform bevel priority. Selected supports have soft directional face lighting. Normalized internal additive paths remove the former 41-fold line overdraw; mirrors, passive lower rays and secondary branches are quieter.
- Slot 3 **Spectral relay** now has four spatially connected legs: incident arrival → hero → first relay → second relay → isolated floor receiver. At peak the relay pair is selected from actual rose centres by event count; below peak it follows existing side relays. Sixteen non-overlapping wavelength bands carry a bounded travelling packet, arrival lights the receiving glass face and a delayed coloured caustic answers on the floor. No topology rebuild, simulation, extra pass or framebuffer.
- The route is authored optical staging, **not a claim of recursively solved Snell transport**. Exact Cauchy/Snell fans remain unchanged. Envelope strength affects how much of the journey is traversed on soft hits; strong hits show the full sequence. Muting removes the packet, face arrival and receiver answer; only a dim passive guide remains.
- Three original named rhythm presets, steps, strengths, durations and polyrhythmic lengths are unchanged: 2.75 / 8.25 / 14.0 hits/bar.

Film rounds 1/2/3 and final are retained under `artifacts/look-review/prism-engine-r4-*`; sheets and large individual frames were inspected after every substantive revision. A final receiver-position correction pulls the caustic back from the lower frame edge. Final default/Ember/Glacier evidence and a 30fps journey strip are in `artifacts/look-review/prism-engine-r4/`.

Native limiter-enabled matrix: 73 cases, all eight looks × three energies, three palettes, portrait, one-slot reversal, 3600/4096/43200s and eight sub-beat signature on/muted comparisons. Minimum lit fraction 32.5%, maximum near-white 0.0087%; zero GL/non-finite/browser errors. Muting changes 0.87–1.49% of pixels at eight sub-beat phases. Exact health and timings are recorded in `artifacts/verification/prism-r4/` and `artifacts/performance/prism-r4-*`. Full test/type/build, native DE/EN and owned-file formatting gates are recorded in the r4 worker report. Initial i18n attempts used an ignored `--rig`; use its supported `--native-gpu` flag.

Measured p50/p95 ms (Shard/Array/Kaleidoscope): 1080p **2.7/2.8, 2.9/3.0, 3.2/3.5**; 4K **10.4/12.6, 9.4/12.1, 12.1/13.9**. All absolute p50 budgets pass. Final ABBA versus main is **+33.3%, +7.4%, +9.7%** and therefore fails the pair script's +5% warning threshold: the persistent foreground and receiver environment have a real cost, not hidden by resolution scaling. Profiles are short synchronous native throughput under fleet contention, not venue-cadence certification.

Remaining limitations: analytic rather than recursive view refraction; monochrome palettes separate wavelengths less clearly; dark glass still has deliberately restrained face contrast. Self-assessment is not an independent pass.

## Round 3 — 2026-10-16

Executing model: **openai-codex/gpt-6.1-sol**. Independent baseline: L6/G2/E2, Overall4.5 (main SCORES.md), not the earlier implementer's optimistic 8.5.

- Quieted white bevels, studio cards and architectural reflections; added restrained palette-bound face gradients.
- Opened the rose: radius 2.7, centre height 4.5; smaller, deeper peak hero; lenses move laterally instead of blocking the rose. CPU poses match GLSL and retain the original continuity bound.
- Reduced peak camera lateral/dolly excursion and reframed the nave. Stable up; kick focal change remains at most 2%.
- Raised finite floor fold-caustics and made diffuse beam width energy-dependent.
- Added slot-3 **Spectral relay / Spektralstaffel**, three authored loops and DE/EN strings; strengthened address, incident steering and receiver gestures.
- Rejected a broad 41-layer haze revision after capture/profile: overlap desaturated the picture and nearly doubled peak cost. Diffuse scattering now uses **one median-ray sheath per relay**, normalized to the former sample power. All 41 physical spectral fan/receiver traces remain intact.

## Mathematics and rendering

`prism-model.mjs` is the independent CPU reference. Wavelengths are micrometres, 0.38–0.78:

```text
n(λ) = 1.48 + 0.012 · dispersion / λ²
δmin = 2 asin(n sin(α/2)) − α, α = π/3
```

Five half-spaces define each equilateral prism (inradius 0.5, depth ±0.65). Vertex intersections apply vector Snell refraction at both interfaces, with bounded total internal reflection. Forty-one wavelengths define forty connected fan strips sampling the full shared palette gradient. A lower-power secondary branch reflects at the first exit face and takes another real Snell interface; invalid transmitted primitives remain finite and are suppressed.

Four biconvex lenses use paraboloids `z = ±(0.22 − 0.19r²)`. Five aperture rays per wavelength take exact quadratic exit intersections and two Snell interfaces. Tests cover convergence, chromatic focus, rotational symmetry, critical angle, tangential momentum, minimum deviation and wavelength order.

Each arch satisfies `(|x| + w)² + (y − 2.3)² = (2w)²`, with `w = 3.3 · spacing`. Seven bays contain 98 rib/column pieces, 18 rails and 72 roof panes. Tests cover connected crowns, positive dimensions and reversible poses.

One fixed **73,320-vertex** mesh (r4 adds 480 relay-route/receiver vertices), opaque/additive split at **25,344**: glass, mirrors, lenses, arches, spectral sheets, diffuse sheaths and caustic receivers. No new pass, framebuffer, simulation, raymarch, resolution cap or engine modification. All colour comes from palette anchors and black/white mixtures.

Glass uses Schlick Fresnel, two-interface analytic environment refraction, thickness absorption, studio reflections and derivative-filtered bevels. Closest-approach integration exposes internal optical paths through front surfaces. Floor mirrors, contact darkening, finite caustics, gallery slots and bounded haze establish depth.

Approximations: view rays sample an analytic environment, not recursively refracted neighbours; lens view thickness is approximate although beam intersections are exact; artistic fold caustics supplement exact receivers; diffuse haze is not volumetric transport. Near arches may extend beyond the border; the rose and hero remain visible in portrait.

## States, looks and energy

The first three looks share seed **10801** and identical non-development parameters.

| Look                                     | Development | Composition                                                          |
| ---------------------------------------- | ----------: | -------------------------------------------------------------------- |
| Shard / Splitter                         |           0 | Near glass, hero, distant relay, incident fan and separated caustics |
| Array / Anordnung                        |           1 | Eight relays, four focusing lenses and spectral fans                 |
| Kaleidoscope / Kaleidoskop               |           2 | Enclosing nave and open ten-prism rose                               |
| Flint Nocturne / Flintglas-Nachtstück    |           0 | Close, low, slow, strongly dispersive                                |
| Spectral Cloister / Spektraler Kreuzgang |         1.6 | Compressed elevated growing nave                                     |
| Long Exposure / Langzeitbelichtung       |         0.6 | Elevated slow array                                                  |
| Cauchy Vault / Cauchy-Gewölbe            |           2 | Wider, lower, faster cathedral                                       |
| Quiet Optics / Stille Optik              |           1 | Spacious low-dispersion array                                        |

Stage: dispersion, spacing, haze. Energy changes spectral-bundle population, diffuse width and integrated optical/camera speed, not whole-frame brightness. Two integrated 2π clocks preserve phase through rate changes and 12-hour operation. Maximal topology and seed identity survive reversal.

## Rhythm

| Slot | Gesture          | Mapping                                                                                                                                 |
| ---- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Spectral address | Accents a real ray bundle from the currently grown population; ≤2 hits/bar                                                              |
| 1    | Snell breath     | Bounded 0.042-radian incident-angle steering; ≤2 hits/bar                                                                               |
| 2    | Caustic sweep    | A stronger local wavelength band crosses spectral receivers                                                                             |
| 3    | Spectral relay   | A finite packet travels along existing optical segments; counts alternate relay cohorts, with a hero pulse and coloured receiver answer |

Slot 3 reads `u_rhythm.w`, `u_rhythmHit.w`, `u_rhythmCount.w`. Muting zeros its contribution; geometry and camera are unaffected. No full-screen white; the shared flash limiter is unmodified and enabled in native verification. Standard review films use the repository harness's documented deterministic capture behaviour, not live safety certification.

| Preset            | Family hits/bar | Signature steps (1-based, whole loop)                              |
| ----------------- | --------------: | ------------------------------------------------------------------ |
| Sleeping spectrum |            2.75 | Eighth-note loop, 16 steps: 3, 14                                  |
| Refracted paths   |            8.25 | Eighth-note loop, 16 steps: 1, 4, 6, 10, 12, 15                    |
| Caustic choir     |            14.0 | Sixteenth-note loop, 32 steps: 1, 4, 7, 11, 14, 19, 22, 25, 28, 31 |

Original tracks retain independent off-beats, three-bar address figures, sparse steering and a six-beat caustic loop. Signature envelopes settle before their next event in every style.

## Cost and verification

Native ANGLE Metal / Apple M3 Pro, energy 0.95, normal post chain and full output resolution. Twelve measured frames/state; short shared-GPU synchronous throughput, **not sustained venue cadence**.

| State        | 1080p p50 / p95 |  4K p50 / p95 | ABBA p50 Δ vs main |
| ------------ | --------------: | ------------: | -----------------: |
| Shard        |    2.1 / 2.2 ms |  5.9 / 6.0 ms |              −4.3% |
| Array        |    2.6 / 2.9 ms |  8.5 / 9.6 ms |              −3.0% |
| Kaleidoscope |    2.9 / 3.3 ms | 9.0 / 10.2 ms |             −20.0% |

ABBA reference main `ece71270d42f613514e941010660445f7382bb15`, 1080p, 64 samples/candidate. All states meet 8 ms / 16 ms p50 budgets; zero GL/non-finite errors. Profiling uses supported `--families prism` (the brief's singular `--family` is not implemented).

- Family tests: optics, topology/metadata, seed continuity/reversal, all presets, slot 3, density floors, packet spacing, median-only diffuse skip and 12-hour clocks.
- `scripts/verify-prism.mjs --rig --port 48801`: 63 limiter-enabled cases; all eight presets at energy 0.1/0.5/0.9, default/Ember/Glacier, portrait, 3600/4096/43200 seconds, signature on/muted and one-slot reversal. Minimum lit fraction 21.5%; maximum near-white fraction 0.145%; zero GL/non-finite/GPU/browser errors. Muting changes 2.5–10.8% of pixels at sampled signature phases.
- Full tests, typecheck, build, native DE/EN i18n and touched-file formatting: exact current totals/logs in the worker report and `artifacts/verification/prism-r3/`.
- Before and three film rounds: `artifacts/look-review/prism-engine-r3-*`. Final reviewer evidence, default/Ember/Glacier films and grids: `artifacts/look-review/prism-engine-r3/`.

**Historical r3 weaknesses (addressed above in r4):** Shard was an isolated prism study; analytic glass read as outlined geometry; relay propagation was approximated by independently addressed paths. Fuller rhythm and an open rose do not by themselves establish an independent L≥8 pass.
