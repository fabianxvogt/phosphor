# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. Round 3 keeps all eight look names/seeds, schema keys, three state names and the three legacy rhythm ids. The previous world description is appended to `worlds.mjs` `HISTORY`.

## Concept and states

A falling dye ring develops seeded Widnall lobes. Small daughter rings descend from the same lobe positions, then rise and roll outward into a crown. Pigment is a **translucent volume**, not a carved opaque surface: thin scattering sheets overlap absorbing cores. A fill injects a local third-colour packet into the rolled rim.

| State  | DE      | Development | Composition                                            |
| ------ | ------- | ----------- | ------------------------------------------------------ |
| Drop   | Tropfen | 0           | Close wound ring, dark absorbing core, short torn wake |
| Plumes | Fahnen  | 1           | Lobed parent with 5–7 hanging daughter plumes          |
| Nebula | Nebel   | 2           | Wider parent, daughters rising and rolling outward     |

The development schedule is continuous and reversible. Lobe amplitude and daughter size grow smoothly; daughters originate at the lobe peaks, not at an unrelated centre. Their azimuths and count `5 + (seed + 2) % 3` depend only on seed. Development changes neither seed identity nor either integrated clock. Camera centre/distance follow smooth bounded curves, never rhythmic event counts.

## Mathematics and material

- Kelvin's thin-ring speed `Γ/(4πR) · (ln(8R/a) − 1/4)` sets the transport clock. The exported streamfunction velocity and divergence reference are retained and CPU-tested.
- The material atmosphere uses the regular Stokes function `Ψ = r²(k exp(−((r−R)²+y²)/a²) − U/2)`. Two finite-thickness sheet levels surround its separatrix. Wake pigment dilutes and tears above the ring instead of making an infinite axial tube.
- Kaden's phase `c(ρ/a)^(−3/2) − θ + roll` modulates rolled folds, with tighter turns toward the mixed core. It is not an opaque isosurface.
- Six seeded plane-wave vector potentials, including the exact envelope-gradient term in their curl, produce a divergence-free perturbation. Two fixed-duration backward RK2 steps transport the pigment coordinates. This is a bounded procedural characteristic map, **not** a Navier–Stokes simulation.
- Coverage holes, meridian striation, broad folds and absorbing Gaussian cores provide a density hierarchy. Gaussian sheets are spatially filtered before caching. Native fibres are filtered along the ray to avoid high-contrast march slicing. No per-frame random grain.
- The retained `inkCross()` export is a legacy mathematical reference; the renderer now integrates finite volumes rather than counting crossings.

## Rendering and cost decisions

The initial round-3 map-only atlas left material evaluation inside every ray step. Profiling rejected it: peak 1080p/4K p50 **24.0/83.6 ms**. Three further film rounds replaced that repeated work with a **physical scalar-field atlas**:

- 96×128×96 nodes; 98×130 guttered tiles, packed 16×6 into **1568×780 rgba16f**, approximately 9.8 MB.
- Channels: scattering dye concentration, absorbing-core concentration, accent-dye concentration, padded distance estimate. No palette colours, screen-space image or lighting image is cached.
- The full-resolution visual pass integrates extinction, palette mixing, soft backlight, approximate core shadowing and filtered fine fibres. Early opacity termination and damped, padded distance skips avoid empty water.
- At engine budget 96, the march uses 48 samples in Drop/Plumes and 44 at Nebula. It scales with `u_raySteps` at governor budgets 64/40. Step length covers the ray interval; a reduced budget cannot truncate the back of the volume.
- No float target: the same physical field is evaluated analytically at each ray sample. This fallback is substantially slower; it is not venue-qualified.

## Camera, colour, energy, endlessness

Slow continuous orbit about the fall axis, with a small periodic elevation swing. A dark tank, overlapping translucent layers, soft backlight, absorbing cores and the orbit supply depth. Portrait uses a lower elevation and aspect-aware focal length; its composition remains weaker than landscape. Kick focal punch is at most 2%.

Colour comes only from primary/secondary/accent palette uniforms. Thin dye is a saturated transformation of primary; dense dye deepens toward secondary. Accent pigment is local to wave/burst events; there is no full-screen white event. The shared flash limiter is unchanged.

Energy changes Kaden turns (`1.6 + 2.4·level`), perturbation amplitude, material reach and native fibre contrast, plus transport ×0.65→1.3 and orbit ×0.8→1.25. Development still controls the same independent form schedule.

Both clocks have period 2π. Every phase use is periodic, including background drift and plane-wave phases. No time reset, simulation saturation, reseed or accumulating density is needed. Native checks include 3600, 4096 and 43200 seconds.

## Rhythm

Main's **World rhythm presets** commit was merged before rhythm work. The three named presets retain authored first-three-track placements:

| Style      | EN                | DE                  |
| ---------- | ----------------- | ------------------- |
| restrained | Suspended pigment | Schwebendes Pigment |
| driving    | Vortex bloom      | Wirbelblüte         |
| accented   | Widnall flourish  | Widnall-Arabeske    |

- Slot 0 `ring-roll`: winds the existing folds and fibres, shader excursion 2.8 radians times envelope (previously 0.9).
- Slot 1 `finger-reach`: extends lobe/daughter reach by up to 30% times envelope (previously 12%).
- Slot 2 `pigment-wave`: wider travelling accent band in transported material coordinates, with local scattering density increased up to 80% times envelope.
- **Slot 3 `ink-burst` / Tintenausbruch**: one facing rim sector ejects an expanding scalloped dye packet. Envelope controls spread/concentration, hit pinches the injection throat, event count selects among three rim sectors. It changes local material, not global brightness; it works at every development value.

Signature loops use four bars. Zero-based hit steps:

| Preset            | Division | Steps                  | Strength | Duration (beats) |
| ----------------- | -------- | ---------------------- | -------- | ---------------- |
| Suspended pigment | 2        | 14, 31                 | 0.70     | 2.4              |
| Vortex bloom      | 2        | 13, 15, 28, 30, 31     | 0.90     | 1.6              |
| Widnall flourish  | 4        | 26, 30, 58, 60, 62, 63 | 0.98     | 1.1              |

The faster fills deliberately overlap packet envelopes; the latest event selects the active sector. German/English label and description are additive keys beside this family's existing rhythm descriptions.

## Looks

| EN                 | DE                  | Seed  | Character                             |
| ------------------ | ------------------- | ----- | ------------------------------------- |
| Drop               | Tropfen             | 11201 | State 0                               |
| Plumes             | Fahnen              | 11201 | State 1                               |
| Nebula             | Nebel               | 11201 | State 2                               |
| Quiet Infusion     | Stille Infusion     | 11202 | Close, slow, dilute early ring        |
| Twin Currents      | Zwillingsströmungen | 11203 | Wide daughters, strong curl and orbit |
| Silken Tributaries | Seidene Nebenarme   | 11204 | Long, dilute fingers                  |
| Velvet Chamber     | Samtkammer          | 11205 | Dense compact full cascade            |
| Marbled Lantern    | Marmorierte Laterne | 11206 | Wide late crown and faster orbit      |

`curl` scales the characteristic perturbation; `spread` positions daughters; `fingers` controls reach. The first three looks still have identical non-development parameters and seed.

## Native performance

Chrome / ANGLE Metal / Apple M3 Pro, native synchronous throughput including post, not venue cadence. Shared GPU load varied substantially. Final standard probes:

| State  | 1080p p50 / p95 ms | 4K p50 / p95 ms | ABBA p50 delta vs main, 1080p / 4K |
| ------ | ------------------ | --------------- | ---------------------------------- |
| Drop   | 5.3 / 8.1          | 8.3 / 8.8       | −2.9% / −12.2%                     |
| Plumes | 4.3 / 4.8          | 10.1 / 10.5     | +15.2% / +21.2%                    |
| Nebula | 6.6 / 10.9         | 11.2 / 11.8     | 0.0% / −0.9%                       |

All standard p50 values meet 8/16 ms budgets. **Plumes still regresses against main**, so both paired probes exit 1 at their 5% regression threshold; this is not a GL error. Profiles and ABBA samples are in worktree `artifacts/ink-r3-final-{performance,pair}-{1080,4k}/profile.json`.

## Verification and review

- `tests/ink.test.mjs`: Kelvin/Stokes/Kaden references, seed identity, continuous/reversible cascade, finite-sheet quadrature, atlas gutters, phase continuity, all presets, legacy ids and slot-3 styles/uniforms.
- `tests/world-rhythm.test.mjs` and `tests/pipeline-flash.test.mjs`: pass. Shared limiter unchanged.
- `scripts/verify-ink.mjs --rig`: 48 native frames: all eight looks at 0.1/0.5/0.9; Ember/Glacier/Acid Yellow; portrait; reverse development; late time. No GL errors or non-finite values. Lit coverage 24.5–41.4% (threshold max channel >12/255), including low energy.
- Final `npm test`: **956 pass, 21 opt-in skips, zero failures** (977 total). Typecheck, build, native DE/EN i18n and Prettier checks on scene/test/verifier/family doc/plan pass. Targeted ink/world-rhythm/pipeline-flash run: **48 pass**. Existing opt-in legacy browser ink cache tests were not run; the family-specific native verifier is the round-3 evidence.
- Final review film, 12-frame sheet, 24-frame rhythm sheet and grid dump: `artifacts/look-review/ink-bloom-r3/`. Earlier film/read iterations include `ink-bloom-r3-{before,look1,look2,look3,look4,round1,round2,round3,density1,density2,density3}`.

**Self-assessment: look 7/10, not an independent pass.** The opaque clay is gone and fill bursts read immediately, but some sheets still resemble fabric, the small folds are soft, the wake remains axial, portrait is weaker, and Plumes is relatively costly. Independent ≥8 remains unproven.
