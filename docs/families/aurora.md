# Aurora Veil / Polarlicht-Schleier

Family **106**, renderer `aurora`, world `aurora-veil`. Glow / Glühen → Curtains / Vorhänge → Corona / Korona. Eight look IDs, names, seeds, schema and parameter values remain unchanged. r4 by **openai-codex/gpt-6.1-sol** responds to the independent r3 review (L6.5, Overall7); this document is not an independent score.

## Algorithm and development

Three persistent **384 × 12** quad grids follow `P(u,v) = C(u,development,phase,seed) + v L(u,development,phase) B`, with **B = (0.035, 1, −0.025)**. All field lines remain straight and parallel. Development never reindexes the material or changes topology. `aurora-model.mjs` mirrors geometry/camera in double precision. C1 smoothsteps unfold the same seeded arcs into returning S-folds; reversal is stateless.

- **Glow (0):** distant full-width auroral arcs, mountains and a dark inlet.
- **Curtains (1):** deeper folds, interrupted rays and stronger local excitation.
- **Corona (2):** open near/far sheets approach the overhead magnetic direction, with convergence above the image and mountains/lake still in view. Ray reach develops **62 → 92 → 212**; peak camera pitch remains **0.50 rad**, without roll, and kick focal punch remains 1.8%.

The extra looks remain Icebound Arc, Silent Meridian, Pleated Night, Zenith Bloom and Magnetic Thaw. First three states share seed 1061 and identical non-development parameters. No world definition/HISTORY migration is needed for these material refinements.

## r4 material, depth and water

The former continuous, equally sharp laser-drape material is replaced with smooth seeded excitation packets at different heights. Low-frequency cloudy emission supports the fine field-aligned hair, with stronger upper falloff and irregular lower onset. Sharp lower edges are reserved for addressed packets rather than traced across every curtain.

Far-sheet onset broadens from 0.018 through 0.042 material units; sheet intensity falls by `exp(-0.68·sheet)` rather than the former shallow linear attenuation. Patchy transmission suppresses distant detail between near folds. This is an optically thin additive approximation, **not physical volumetric absorption or exact inter-sheet occlusion**. Dark air, unequal contrast and stars through folds preserve depth without solid fabric.

The snow banks now surround a wider partly thawed channel. Strong granular frost/pressure-ridge highlights were removed from its interior. Actual y-reflected curtain geometry remains vertically registered to the sky. Horizontally stretched, slightly bent wavelets modulate it; their footprint-filtered frequency narrows toward the horizon. Reflected fine rays are integrated away to prevent vertical wire grids. Far reflections receive a separate gain so they do not vanish behind the stronger sky-depth attenuation. The former raised green mound becomes broken horizontal light on dark water.

## Energy and endlessness

Energy changes travel speed (×0.75–1.35), filament detail, gap occupancy and reach, not master exposure. Two integrated 2π clocks own material travel (`0.22·travel`) and camera orbit (`0.025`). New noise coordinates use `sin(phase)`, never a linearly wrapped noise coordinate. A native frozen material-clock 0↔2π comparison is pixel-exact. No temporal random grain or development-triggered event is added.

## Rhythm

| Slot | Gesture                         | Mapping                                                                                             |
| ---- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| 0    | Ray packet                      | Persistent field-ray cohort catches a local pulse; rare sharp excitation                            |
| 1    | Upward fold                     | Excitation climbs through the filaments                                                             |
| 2    | Polar hem                       | Sparse selected lower folds receive an accent                                                       |
| 3    | **Curtain surge / Vorhangwoge** | Ordered left-to-right crest, fading wake and matching reflected wavelets; larger second-bar arrival |

The signature now follows world bearing rather than hopping to unrelated count-selected folds. `fract(u_beat/8)` advances its narrow crest from −1.25 to +1.25 radians over two bars. Its wake trails by 0.16 rad; second-bar amplitude rises from 0.65 to 2.0. All emitted signature light remains multiplied by `u_rhythm.w`, so muting it is silent. `u_rhythmHit.w` adds a tiny hot edge; `u_rhythmCount.w` only changes the internal ray comb. Sky and mirror use identical x/z bearing.

The three authored styles and spacing are retained: **Polar silence**, **Curtain signals**, **Magnetic midnight**, at **2.5 / 7.75 / 11.5 hits/bar**. Driving signature eighth-step positions are **0,2,4,6 | 8,10,12,14,15**; the second bar has a strong late crest/fill. Accented uses sixteenth positions **0,2,4,6,8,10,13 | 16,18,20,22,24,26,28,30**. Restrained signature positions are **4,15,29** over four bars. Existing three-bar accented ray/hem cycles remain. No shared rhythm or flash-limiter code changed.

## Verification and cost — r4

Native Chrome / ANGLE Metal / Apple M3 Pro, 64 synchronous samples/state at energy 0.95, including post. Shared-GPU throughput is not venue/display-cadence qualification.

| State    | 1080p p50 / p95 | 4K p50 / p95   | Final ABBA p50 delta vs main |
| -------- | --------------- | -------------- | ---------------------------- |
| Glow     | 3.5 / 4.0 ms    | 12.8 / 17.4 ms | +15.2% (+0.5 ms)             |
| Curtains | 3.9 / 4.5 ms    | 12.9 / 16.3 ms | +21.9% (+0.7 ms)             |
| Corona   | 4.7 / 5.2 ms    | 14.4 / 18.2 ms | +10.3% (+0.4 ms)             |

Absolute p50 budgets pass. **The paired tool's stricter +5% relative gate fails**: extra per-fragment packet noise has a measurable cost. An earlier pair reported +12.5/+16.1/+24.3%; all logs are retained. No extra meshes, passes or caches; topology remains 165,888 vertices including the mirror.

- Full suite: **1016 pass / 22 skip / 0 fail** (1038 total); typecheck, DE/EN native i18n and scoped Prettier pass.
- Family tests include ordered two-bar travel, shared mirror bearing, depth/wavelet/packet shader contracts, valid presets, density, straight field lines, reversal and late clocks.
- `scripts/verify-aurora.mjs --rig --port 48822`: 81 development/energy/palette combinations at 3600/43200 s; eight saved looks; three portrait states; 241-frame reversal; zero float-picture differences on frozen development reversal and material-clock seam; HDR probes; 180-frame **limiter-enabled** smoke. Zero GL errors/non-finite values. Low-energy frames retain >10% lit coverage.
- Three changed film rounds and final exact reviewer captures inspected, including 960×540 peak/event stills, three palette ladders and portrait. Final evidence: `artifacts/look-review/aurora-veil-r4/` (film, sheets, `peak.png`, `crest.png`, `grids.md`). Tests/matrix/performance: `artifacts/look-review/aurora-veil-r4-checks/`.

## Remaining limitations

Self-assessment: **L≈7.5, Overall≈8**, not an independent pass. Some long magnetic lines remain graphic at the peak; distant overlap uses approximate transmission, not volumetric occlusion. Water is an analytical reflection/wavelet model, terrain remains subdued, and 4K p95 exceeds 16 ms under contention. No physical twelve-hour soak or venue qualification is claimed.
