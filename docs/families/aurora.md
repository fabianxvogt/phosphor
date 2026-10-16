# Aurora Veil / Polarlicht-Schleier

Family **106**, renderer `aurora`, world `aurora-veil`. Glow / Glühen → Curtains / Vorhänge → Corona / Korona. Eight look IDs, names, seeds and parameter values are unchanged. This night-continuation revision is by **openai-codex/gpt-6.1-sol**.

## Algorithm and states

Three persistent **384 × 12** quad material grids follow

`P(u,v) = C(u,development,phase,seed) + v L(u,development,phase) B`,

where **B = (0.035, 1, −0.025)**. All field lines are straight and parallel. The angle and material IDs never reset on development, reversal or energy changes. `aurora-model.mjs` mirrors the shader geometry and camera in double precision. C1 smoothsteps unfold the same seeded circular arcs into open, returning S-folded sheets. There is no picture crossfade or state-triggered flash.

- **Glow (0):** distant folded hems across the full sky, over the frozen inlet.
- **Curtains (1):** deeper pleats and persistent fine vertical rays.
- **Corona (2):** open near/far curtains approach the overhead magnetic direction. The convergence point is now **above** the landscape frame instead of forming a contained radial fan. Base depth is `25 + 33·sheet + 16 sin(1.3θ + 1.7·sheet) + 0.65·ripple`; unmodulated ray reach develops **62 → 92 → 212**, reduced from the former 512-unit peak.

The other looks remain Icebound Arc (wide/low), Silent Meridian (narrow/tall), Pleated Night (dense folds), Zenith Bloom (narrow crown), and Magnetic Thaw (wide transition/strong mirror). The first three states share seed 1061 and identical non-development parameters.

## Look changes

Peak pitch is reduced from 0.78 to **0.50 radians**, retaining roughly the lower quarter for mountains and lake; the closed roll-free camera orbit and 1.8% maximum kick focal punch remain. The closest peak sheet sits farther away, separating layered folds rather than placing a starburst at the top edge.

Saturated primary emission near the hem changes to stronger secondary rays over material heights 0.012–0.12. Unnecessary white mixing is removed from ray emission. A thicker, uneven lower emission layer supports the fine edge; broad filaments carry spatially varying excitation instead of uniform streaks. Field-aligned Gaussian hair is footprint-filtered, including a second octave when the finest rays become sub-pixel. Upper tips and open ends fade. Distance, facing and sheet-index attenuation separate the additive layers.

Actual y-reflected curtain geometry supplies the lake image. Fresnel, winding shore masking, frost-dependent attenuation and perturbed material coordinates break it up. Reflection gain is increased 1.8×. Seeded pressure cracks, granular frost, snow normals, two mountain ranges and stars remain unchanged. This is shaded analytical terrain and rough-ice approximation, not displaced snow or volumetric light transport.

## Energy and endlessness

Energy changes travel speed (×0.75–1.35), filtered filament detail, gap occupancy and ray reach, **not master exposure**. Low energy retains a composed full-width sky and readable ground. Two integrated 2π-periodic clocks own material travel (`0.22·travel`) and camera movement (`0.025`). No shader `u_time`, re-anchoring or temporal random grain is added.

## Rhythm

All four gestures have independent restrained/driving/accented loops. Existing count-selected/motion tracks remain at ≤2 hits/bar; their visible emission is strengthened without camera shake.

| Slot | Gesture                         | Mapping                                                                                                                                            |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | Ray packet                      | Persistent field-ray cohort catches a stronger local pulse                                                                                         |
| 1    | Upward fold                     | Excitation climbs through existing filaments                                                                                                       |
| 2    | Polar hem                       | Sparse selected hems and supporting lower air glow                                                                                                 |
| 3    | **Curtain surge / Vorhangwoge** | A count-addressed excitation front moves across a folded sheet and upward through its rays, with a local accent crest and actual mirrored response |

The signature consumes `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w`. Its width is local to material coordinates, not a whole-frame brightness change. The hit only adds a small hot edge; the envelope carries the rolling front. No limiter changes.

Preset names remain **Polar silence**, **Curtain signals**, **Magnetic midnight**. Their total family density is **2.5 / 7.75 / 11.5 hits/bar**. Driving slot 3 has eighth-step positions **0,2,4,6 | 8,10,12,14,15** in a 16-step/two-bar loop; the second bar has an extra strong crest and late fill. Accented has sixteenth positions **0,2,4,6,8,10,13 | 16,18,20,22,24,26,28,30**. Restrained uses positions **4,15,29** in a 32-eighth-step/four-bar loop. The existing ray packet and polar hem also interlace three-bar figures.

## Cost and verification (2026-10-16)

Native Chrome / ANGLE Metal / Apple M3 Pro, synchronous throughput including post, **64 samples/state**, energy 0.95. Shared-GPU results are not venue/display-cadence qualification.

| State    | 1080p p50 / p95 | 4K p50 / p95  | Final ABBA p50 delta vs main |
| -------- | --------------- | ------------- | ---------------------------- |
| Glow     | 2.9 / 3.1 ms    | 8.5 / 10.4 ms | −5.9%                        |
| Curtains | 3.0 / 3.9 ms    | 8.6 / 10.2 ms | 0%                           |
| Corona   | 3.3 / 4.5 ms    | 9.8 / 11.3 ms | +9.7% (+0.3 ms)              |

Absolute p50 budgets pass. **The pair tool exits 1** because Corona exceeds its stricter 5% relative gate. Earlier contended short runs gave Corona 4K p50 12.2–16.3 ms and paired deltas +5.7% to +66.7%; these logs are retained, not discarded. Topology is still 165,888 additive vertices, including reflections; no new passes or caches.

- `npm test`: 977 pass, 21 skip, zero failures (998 total).
- Typecheck, build, native DE/EN i18n smoke and scoped Prettier checks pass.
- Family/continuity, authored world rhythms and flash pipeline targeted suite: 53/53 pass.
- `scripts/verify-aurora.mjs --rig --port 48822`: 81 development/energy/palette combinations, 3600/43200-second probes, eight saved looks, three portrait states, 241-frame reversal with unchanged slot, **zero differing float-picture values** on frozen 0.7→1.83→0.7 reversal, three HDR probes and 180-frame **limiter-enabled** smoke. Zero GL errors/non-finite values. Low-energy matrix frames exceed 10% lit pixels.
- Before, M4 minimum and three filmed look rounds inspected. Reviewer evidence: `artifacts/look-review/aurora-veil-r3/aurora-veil-{sheet,rhythm}.png`, `aurora-veil.mp4`, `grids.md`. Matrix, JSON and all test/performance logs: `artifacts/look-review/aurora-veil-r3-checks/`.

## Remaining weaknesses

**Self-assessed L≈7, not an independent pass.** The persistent field mathematics remains somewhat graphic: long straight rays and overlapping hems can still suggest stage-light wedges, particularly in pale palettes. Terrain is subdued and analytical; the peak has better spatial anchoring but less dramatic overhead convergence. Signature colour patches and reflection are visible, while the perceived rolling motion deserves independent judgement from the film. No physical twelve-hour soak or venue qualification is claimed.
