# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. The r4 revision preserves all eight look names/seeds, schema keys, state names, world description and four gesture ids. No engine, limiter or preview changes.

## Persistent body and development

A falling dye ring develops seeded Widnall lobes. Daughter rings descend from those same lobes, then rise and roll outward. Thin scattering sheets overlap dark absorbing cores: this is a translucent volume, not a normal-lit opaque torus.

| State  | DE      | Development | Structure                                              |
| ------ | ------- | ----------- | ------------------------------------------------------ |
| Drop   | Tropfen | 0           | Wound parent ring and three tapering source filaments  |
| Plumes | Fahnen  | 1           | Lobed parent, 5–7 hanging daughters and bowed tendrils |
| Nebula | Nebel   | 2           | Wider parent, irregular daughter curls rolling outward |

The reversible cascade schedule changes neither seed identity nor integrated clocks. Daughter azimuths and count `5 + (seed + 2) % 3` remain stable. Energy increases daughter scalloping, tendril population (one to three), turbulence, roll winding and motion. Development independently changes the form.

The eight looks remain Drop, Plumes, Nebula, Quiet Infusion, Twin Currents, Silken Tributaries, Velvet Chamber and Marbled Lantern. The first three share seed 11201 and identical non-development parameters. Extra seeds span all three lobe counts.

## Mathematics and native material

- Kelvin thin-ring speed `Γ/(4πR) · (ln(8R/a) − 1/4)` sets the material clock. CPU tests retain the incompressible streamfunction velocity reference.
- The atmosphere uses Stokes `Ψ = r²(k exp(−((r−R)²+y²)/a²) − U/2)`. A finite skin surrounds its rolled core.
- Kaden phase `c(ρ/a)^(−3/2) − θ + roll` draws nested poloidal sheets. Small unresolved turns converge to their train's mean density rather than aliasing.
- Six seeded vector potentials, including the envelope-gradient term of their curl, generate a divergence-free perturbation. Two backward RK2 steps transport coordinates. This is a procedural characteristic map, not a Navier–Stokes simulation.
- The r3 density atlas blurred every edge. R4 instead caches **two poloidal coordinate pairs** (parent and daughter). Density, palette, optical extinction and lighting are evaluated at native output resolution. Daughter seam fading moves coordinates outside dye support.
- Thin sheets use a compact quartic kernel `max(1 − (0.6 d/w)², 0)²`, with an exact polynomial interval integral. It approximates a Gaussian without requiring a ray sample inside every sheet. The periodic roll train uses the corresponding cumulative integral. The legacy `inkCross()` remains a mathematical reference only.
- No planar fibre wave, screen-space random grain or temporal jitter. Far sheet/tube widths grow gradually behind the focus plane. A range-reduced angle approximation has tested error below 0.00021 radians.

The coordinate atlas is **64×96×64**, with 66×98 guttered tiles packed 16×4 into **1056×392 rgba16f** (about 3.3 MB). It contains no colour, lighting or reduced-resolution image. Without the optional float target, coordinates are evaluated analytically; that slower fallback is not venue-qualified.

The native march uses 22 intervals in Drop/Plumes and 21 at Nebula at engine budget 96, scaling with `u_raySteps`. Step lengths cover the complete ray interval. Conservative support skips and early opacity termination avoid empty water. Analytic Gaussian tube/ball integrals draw fine source strands, tendrils and burst pigment; ray/sphere rejection avoids evaluating remote curves.

## Space and palette

A continuous orbit, small elevation swing, phrase-scale off-centre drift, water gradient, depth fog, core absorption and two drifting mote layers establish space. Camera centre/distance follow the development bounds; portrait has its own modest distance adjustment. Kick changes focal length by at most 2%.

Dense scattering dye and tendrils use saturated primary; absorbing cores are nearly black. Secondary lights the thin skins rather than repainting half the volume. Accent exists only in the local burst packet and its four filaments. There is no full-screen white event; `flash-limiter.mjs` is unchanged.

Both integrated clocks have period 2π. Material, orbit and background uses respect those periods; nothing accumulates, freezes, reseeds or resets at development boundaries. Native checks include 3600, 4096 and 43200 seconds.

## Rhythm

| Style      | EN                | DE                  | Hits/bar |
| ---------- | ----------------- | ------------------- | -------- |
| restrained | Suspended pigment | Schwebendes Pigment | 2.3      |
| driving    | Vortex bloom      | Wirbelblüte         | 6.7      |
| accented   | Widnall flourish  | Widnall-Arabeske    | 8.3      |

- Slot 0 **ring-roll**: bright local highlight sweeps around roughly half the rolled rim while its sheets wind further.
- Slot 1 **finger-reach**: lobes and tendrils extend and relax over the authored envelope (45% envelope-scaled reach modulation).
- Slot 2 **pigment-wave**: a descending backlit band illuminates skins and strands. Driving has a six-eighth loop; accented has a twelve-sixteenth loop: three beats against the four-beat bar.
- Slot 3 **ink-burst / Tintenausbruch**: one curled rim sector bulges and ejects a small scalloped accent packet with a dark core. It travels 0.62 world units, then unrolls into four thin filaments and fades. Envelope progress is recovered by inverse smoothstep; event count selects one of three facing sectors, and the hit briefly pinches the puff. It is independent of development.

All signature hits are full-strength `X` at strength 0.9, preserving a consistent inverse envelope. Zero-based steps:

| Style      | Division | Steps      | Duration, beats |
| ---------- | -------- | ---------- | --------------- |
| restrained | 2        | 14, 30     | 2.4             |
| driving    | 2        | 14, 28, 30 | 1.8             |
| accented   | 4        | 26, 56, 60 | 1.6             |

Hits remain in the second halves of bars 2 and 4. Fewer retriggers than r3 leave time to read each packet. German/English descriptions are additive keys beside the family's existing translations.

## Verification and measured limitations

R4 capture/read rounds: `artifacts/look-review/ink-bloom-r4-round1` through `round6`, plus the final **`artifacts/look-review/ink-bloom-r4/`** film, 12-frame sheet, 24-frame rhythm strip and `grids.md`. Interrupted r4 `f1` work was preserved before merging main.

Native synchronous throughput on Apple M3 Pro / ANGLE Metal, including post but excluding asynchronous flash approval:

| State  | 1080p p50/p95 ms | 4K p50/p95 ms | Paired p50 vs main, 1080p |
| ------ | ---------------- | ------------- | ------------------------- |
| Drop   | 4.6 / 6.0        | 14.2 / 15.2   | +38.9%                    |
| Plumes | 8.9 / 9.9        | 30.4 / 34.9   | +72.7%                    |
| Nebula | 7.4 / 7.7        | 27.3 / 33.0   | +77.3%                    |

**Not a performance pass:** Plumes exceeds the 8 ms 1080p budget, and the last two states exceed 16 ms at 4K. Shared GPU load varies, but the ABBA regression is real. Final paired p50 values were 5.0/7.6/7.8 ms versus main 3.6/4.4/4.4 ms. Replacing the original unbounded native material and tube work reduced initial 1080p 18–42 ms substantially; more optimization is still needed without sacrificing curls.

- Family tests cover Kelvin/Stokes/Kaden mathematics, seed identity, continuity/reversal, compact-sheet quadrature, angle error, inverse envelope, full fill timing, polyrhythmic lengths, grid density, atlas gutters and slot-3 uniforms.
- Family/world-rhythm/pipeline-flash targeted tests: 51 pass.
- Limiter-enabled native verifier: 48 cases covering all looks at 0.1/0.5/0.9, Ember/Glacier/Acid Yellow, portrait, reversal and late time; zero GL/non-finite errors; lit coverage 25.5–43.9%.
- Build, native DE/EN i18n and typecheck pass. Full suite and formatting results are recorded in the lane report.

**Self-assessment: L 7, not an independent ≥8 pass.** Banding, oversized tint events and hard film cropping are improved. The parent/daughter identity is legible again, but early rings remain smooth, some tendrils look artificial, broad skins can resemble fabric, and 4K cost is unresolved. No independent score is claimed.
