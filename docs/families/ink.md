# Ink Bloom / Tintenblüte

Family **112**, scene `ink`, world **`ink-bloom`**. R5 preserves all eight look names/seeds, schema keys, state names and four gesture IDs. The previous world description is appended to `worlds.mjs` HISTORY. No shared renderer, rhythm, limiter or catalog-preview edits.

## Persistent dye and development

A falling Kelvin vortex develops seeded Widnall lobes. The same lobes feed daughters, which descend and then roll outward. Kaden's nested poloidal sheets supply the internal folds; dark absorbing concentration is separate from translucent scattering pigment.

| State           | Development | Structure                                                    |
| --------------- | ----------- | ------------------------------------------------------------ |
| Drop / Tropfen  | 0           | Tilted rolled parent and two short curved source streams     |
| Plumes / Fahnen | 1           | Lobed parent, 5–7 hanging daughters, bowed receiving streams |
| Nebula / Nebel  | 2           | Taller, diagonally layered parent/daughter crown             |

The first three looks share seed 11201 and identical non-development parameters. Extra looks remain Quiet Infusion, Twin Currents, Silken Tributaries, Velvet Chamber and Marbled Lantern. Seed identity, daughter azimuths and count `5 + (seed + 2) % 3` do not depend on development. Reversal changes geometry continuously without resetting clocks or identity.

R5 applies one reversible affine plume transform to both native volume coordinates and analytic streams: `(1.08x, (1.3 + 0.5 crown)y + 0.55x + 0.22z, 0.9z)`. It enlarges the vertical silhouette rather than adding rings. Exact inverse-ray box intersection retains world-depth units (the local direction is intentionally **not normalized**). Camera framing is closer and offset, with a raised Plumes aim point; far folds fade more strongly than the foreground. Kick remains capped at 2% focal change.

## Material and native rendering

- Kelvin thin-core speed `Γ/(4πR) · (ln(8R/a) − 1/4)` drives the integrated material clock. CPU references retain Kelvin velocity, incompressible Stokes flow, Widnall bending and Kaden roll-up.
- Six seeded vector potentials transport the smooth material coordinates through two backward RK2 steps. The shear envelope now decays to zero outside the atmosphere; its derivative includes both product-rule terms, so the vector-potential curl remains solenoidal. This is a procedural characteristic map, **not** a Navier–Stokes simulation.
- The **48×80×48** coordinate lattice uses duplicate-node gutters: 50×82 tiles, 16×3 layout, **800×246 rgba16f** (about 1.6 MB). It stores parent/daughter poloidal coordinates, never colour, density, lighting or a reduced-resolution picture. The uncached analytic fallback remains available but is not performance-qualified.
- Native compact quartic sheet integration resolves sub-step sheets. Kaden winding is integrated as a periodic train; unresolved turns converge to its mean. Native azimuthal pleats and concentration windows break uniform wrappers into unequal folds. Absorbing cores, thinner secondary-blue dilution and primary-coloured rolls remain separate.
- The native march still honours `u_raySteps`: 22 intervals in Drop/Plumes, 21 in Nebula at engine budget 96. Empty coordinate support is rejected before expensive ring material evaluation, independently per body. A fresh interval enters from a signed outside distance and mean winding, not a constant-density slab. This is an approximation at guard entry, not an image-identity claim.
- One broad bowed stream per daughter replaces redundant fine wires; its taper broadens at reception. Analytic Gaussian tubes integrate the curves. Group box rejection and per-curve ray/sphere rejection avoid drawing streams in empty water. An active burst bypasses the group box because its branches can fly outside Drop's coordinate atlas. Two shorter source streams replace the straight axial feed.

Energy increases winding, turbulence, scalloping, lobe reach and stream wandering. Development independently changes form. Colours come only from the palette: saturated primary dye, secondary thinning folds, near-black absorption, rare local accent. Water gradient, suspended motes, orbit, overlap, key light and depth falloff establish space. No temporal jitter, fullscreen white or limiter bypass is introduced.

## Rhythm

| Style      | EN                | DE                  | Hits/bar |
| ---------- | ----------------- | ------------------- | -------- |
| restrained | Suspended pigment | Schwebendes Pigment | 2.3      |
| driving    | Vortex bloom      | Wirbelblüte         | 6.7      |
| accented   | Widnall flourish  | Widnall-Arabeske    | 8.3      |

All authored grids are unchanged.

- Slot 0 **ring-roll** winds and sweeps the existing folded rim.
- Slot 1 **finger-reach** increases physical lobe/stream reach and relaxes.
- Slot 2 **pigment-wave** now bends the parent folds as its concentration front descends, alongside the existing stream illumination. Driving repeats six eighths; accented repeats twelve sixteenths (three against four).
- Slot 3 **ink-burst / Tintenausbruch** uses the same envelope, hit and count IDs. A facing parent sector peels into a hooked tongue; off-axis dilute concentrations stretch with it, then four unequal tapered branches spread and fade. The former spherical shell subtraction and circular dark hole are removed. The concentration ridge is curved, not a centred ball.

Signature steps (zero-based): restrained division 2, **14/30**, duration 2.4 beats; driving division 2, **14/28/30**, duration 1.8; accented division 4, **26/56/60**, duration 1.6. Progress is recovered from the 0.9-strength envelope. Count selects three facing rim sectors, independently of development.

Both clocks have period 2π; all added uses are periodic. The plume transform has no time dependence. Native health checks include all looks at 0.1/0.5/0.9, three palettes, portrait, reversal, and 3600/4096/43200 seconds.

## R5 verification and limitations

Nine numbered change → capture → read rounds are retained under `artifacts/look-review/ink-bloom-r5-1` through `-9`. Final independent evidence is **`artifacts/look-review/ink-bloom-r5/`**, including the 12-still sheet, held top-state/0.85 v2 rhythm strip aligned to beat 8, evidence JSON and grids. Historical r4 evidence remains read-only in the main checkout's `artifacts/preserved-worktrees/ink-bloom-r3/artifacts/`.

Native synchronous throughput on Apple M3 Pro / ANGLE Metal includes post, excludes asynchronous flash approval and is not venue cadence. Final measurements (`artifacts/ink-r5-final-postguard-*`):

| State  | 1080p p50/p95 ms | 4K p50/p95 ms | ABBA p50 delta vs main ef5b7e9 |
| ------ | ---------------- | ------------- | ------------------------------ |
| Drop   | 5.1 / 5.3        | 29.0 / 34.8   | +27.3%                         |
| Plumes | 5.1 / 5.3        | 28.4 / 35.3   | −13.8%                         |
| Nebula | 5.6 / 5.8        | 27.8 / 34.3   | −14.6%                         |

1080p absolute budget passes this final probe; **4K fails**, and the paired gate exits 1 for Drop's real regression. The ABBA run was contended: Nebula baseline p50/p95 was 13.0/15.1 ms and final 11.1/15.0 ms. An earlier paired run showed Plumes −65.1% with baseline p95 41.3 ms, demonstrating the instability; do not treat those large gains as isolated measurements. Earlier slower probes remain preserved, not silently discarded.

Full suite after capture-v2 main sync: 1033 pass, 22 opt-in browser cases skipped; typecheck, build, native DE/EN i18n and 53 targeted family/rhythm/flash tests pass. Limiter-enabled native health verification: 48 cases, zero GL/non-finite errors, 20.9–43.1% lit. Scene/test/family-doc/plan formatting passes; five shared files retain pre-existing whole-file formatting warnings. Live limiter and governor are untouched. These checks do not establish venue cadence or continuous photosensitivity qualification.

**Self-assessment: L 6.5, not an independent pass.** The burst is no longer a neon doughnut and the crown is taller, but smooth wrapper areas, perforated daughter curls, some connector-like silhouettes and insufficient fine dissolving detail remain visible. Stills cannot establish continuous-motion quality. Do not treat completed checks or grid density as artistic acceptance.
