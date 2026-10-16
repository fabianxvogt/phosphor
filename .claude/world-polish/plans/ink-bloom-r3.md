# Ink Bloom round 3

## Diagnosis / decision

Reused existing `r3/ink-bloom` worktree (at main 55cb7cc) with unfinished local scene/test/verify changes. Read the complete `main...polish2/ink-bloom` shader diff and round-2 plan. Keep its characteristic-map idea, not its exact crossing renderer: quantized folds and its expensive atlas were not acceptable. Main baseline sheet/rhythm read; SCORES.md is absent. Baseline self-assessment L=6: carved clay donuts and lampshade; rhythm barely registers. Resumed-work capture `artifacts/look-review/ink-bloom-r3-before` is also about 6: translucent but balloon-like, sliced daughters and a straight infinite axial wake.

## Audience weaknesses

1. Thick, smooth blue sheets read as rubber, not pigment suspended in water.
2. Axial Stokes separatrix creates an artificial bright tube to the frame edge.
3. Daughters have thin aliasing and fragmented edge detail, not coherent rolled plumes.
4. Material lacks the fine/broad density hierarchy of dye; colour regions are uniform.
5. Energy changes need to be visible in coverage and filament density; portraits need deliberate framing.
6. Three legacy rhythm tracks barely register, and no fill moment exists.

## Phone moment / concrete work

A close, backlit vortex canopy tears into translucent striated sheets, then a musical fill injects a saturated, scalloped pigment bloom through one side of the SAME curled rim. Dark absorbing knots, fine stretched filaments, soft far haze and parallax must read together. No opaque isosurface, normal rim or full-screen flash.

Three film rounds: (1) finite ragged wake, anisotropic coverage and folds, density contrast; (2) composition/material refinement from sheets, lower aliasing and portrait check; (3) strengthened rhythmic roll/reach/wave plus slot-3 Ink burst, final critique. Preserve ids, state names, seeds, schema and legacy rhythm ids. Append old world definition to HISTORY if story description changes.

Before rhythm merge main for authored presets (parallel worker); preserve three world-specific names. Add slot-3 `ink-burst` using envelope, hit and event count, with restrained/driving/accented loops and >=2 fill hits each. Events reshape a local rim sector, not global brightness.

## Cost / acceptance

Reuse smooth rgba16f displacement atlas (48x64x48), capped RK2 and 96-step visual loop honoring u_raySteps. Risk: aliasing thin sheets with long steps; use spatial filtering, no temporal grain. Risk: fill distortion must not move whole camera or reset material identity. Measure 1080p/4K and ABBA delta against main; budget <=8/16ms p50 (shared-GPU caveat). Run all required CPU, i18n, typecheck, formatting, health/palette/energy/reversal/late checks. Report weak look honestly; independent >=8 is not self-certifiable.

## Execution / critique

- Main's authored presets were merged in `ad214c5` before slot-3 work. Kept all three names and first-three-track placements; raised shader roll/reach/wave amplitudes.
- Film rounds `look1`–`look4`, then `round1`–`round3` evolved the transported dye and local bursts. Read the baseline and resumed sheets: the clay rings were removed, but smooth blue sheets and the straight axial wake remained too balloon-like. Shortened/diluted the wake, added torn coverage, saturation and rare local accent pigment, enlarged the peak and reduced development-driven camera travel.
- Profiling rejected the original native material-map sampling: 1080p p50 6.3/15.2/24.0 ms and 4K 30.0/54.9/83.6 ms. Replaced per-ray-step flow/material evaluation with **physical scalar fields**, not cached colour: scattering concentration, absorbing core, accent concentration and padded distance. The native-resolution pass still computes palette mixing, extinction, lighting and filtered fine fibres. No engine changes.
- Three further change/capture/read rounds (`density1`, `density2`, `density3`) checked this tradeoff. Round 1 lost fine structure; round 2 restored native fibres but made stripes too strong; round 3 increased physical atlas to 96×128×96, filtered the fibres along the ray, and reduced RK2 to two steps. Final engine-budget-derived march is 48→44 steps (96 budget), scaling down with the governor. Peak 4K now 11.2 ms p50; Plumes remains +21% against main in ABBA.
- Slot 3 `ink-burst` uses envelope, hit and count. Zero-based hit steps: restrained 14/31 (division 2), driving 13/15/28/30/31 (division 2), accented 26/30/58/60/62/63 (division 4). One facing rim sector sheds a scalloped packet; no global bright event.
- Preserved state/look names, seeds, schema and legacy gesture ids. Updated the story description and appended the previous definition to `HISTORY`.
- Final self-assessment **L=7/10**, not a claimed independent pass. Better depth, density range and fill accents, but some veils still resemble fabric, the wake remains axial, portrait is weaker, and the physical field softens the smallest folds. Independent >=8 is still unproven; do not inflate this assessment.

## r4

Independent r3 review: L 5.5 / G 7 / E 6 → 6.0 (fail). My own read of the r3 sheets agrees: a defocused, corduroy-striped lump on black. Root causes found in code: (a) every sheet is sampled from a 96×128×96 density atlas whose cell is ≈ 18 px on screen, so nothing can be sharper than ~18 px; (b) the "native fibre" term is a world-space plane wave `sin(dot(p,(31,7,-19)))` = literal parallel stripes, plus 44 point samples through 0.035-wide sheets = slice moiré; (c) the burst packet is a 0.22–0.72-unit Gaussian shell tinted with accent; (d) primary/secondary are mixed by a sine in space = mud; (e) camera never frames the cascade.

Response per must-fix item:

1. **Focus/texture.** The atlas stops storing densities. It stores the _smooth characteristic map_ (displacement X−p, 3 ch) plus a skip distance. All sheet functions are evaluated natively per sample from X. Skin sheets are integrated **analytically along each step** (erf of the signed sheet distance between consecutive samples), so a sheet thinner than a step neither vanishes nor aliases. Kaden spiral sheets are band-limited by the step footprint. The plane-wave fibre is deleted; a static per-pixel start jitter removes the remaining slicing. Blur only as depth-of-field: sheet/tube widths grow behind the focus distance.
2. **Ink-burst = packet.** Rendered as analytic overlay geometry, not a tint: a dense absorbing puff (dark core, accent shell, r ≈ 0.12–0.2) ejected from one rim sector (sector bulges = curled rim), travelling ~0.6 units (≈ 13 % of the short side) along a curved path over the first ~60 % of the envelope, then unrolling into 4 thin accent filaments that fade. Only the packet and its filaments carry accent; target ≤ 10 % of lit pixels. Progress is recovered from the envelope (inverse smoothstep), so all burst hits are authored as full `X` at one strength.
3. **Arc/identity.** One persistent body. Drop: a compact vortex ring trailing a twisted 4-filament stem up to the drop's source (falling droplet/plume). Plumes: Widnall lobes with thin tendril legs hanging to daughter rings (r1 cascade topology, now translucent). Nebula: wider parent, daughters roll outward into a crown, longer Widnall fingers. Energy adds fingers per lobe (1→3), turbulence and Kaden turns.
4. **Space/framing.** Camera centre/distance follow the development's bounding box so the body spans ~70–85 % of the short side; slow off-centre drift of the principal point over phrases. Dim backlit water gradient behind, depth fog, two parallax layers of drifting pigment motes (one fine, one out-of-focus foreground).
5. **Secondary gestures.** ring-roll: a bright rim-highlight sweeping ~180° around the primary roll during its envelope. finger-reach: lobe amplitude and tendril length +45 % × envelope (≈ 5 % of body), relaxing over its duration. pigment-wave: brightening band descending through skins and tendrils.
6. **Palette.** Dense roll and tendrils = saturated primary; absorbing core dark; secondary only on the thin torn skins (backlit edges); no spatial sine mixing.

Rhythm: grid density targets driving ≥ 6 and accented ≥ 8 hits/bar; add a 3-beat (12-sixteenth) pigment-wave loop as a 3-against-4 cross-rhythm in accented and a 6-eighth loop in driving. Bursts stay fill-locked (ends of bars 2 and 4) but are fewer per fill so each reads as one event.

Cost risk: native material per step (lobe complex power, 2× exp, atan, sqrt, coverage noise) replaces atlas density lookups; tube overlay ≈ 60 segment tests per pixel with bounding-sphere rejection. Profile early; fall back to fewer steps (analytic sheets tolerate long steps).

### Resumed execution / film critique

Preserved interrupted map-only implementation and f1 evidence, then merged main. Round1: deleted the blue/green equal mixing, shortened the cropped drop stem, added static ray phase. Read both sheets: burst is local, but front daughters clip the bottom and connecting strands are wire-like; native profile is unacceptable (18–42 ms at 1080p). Round2: curved strands, conservative sphere/ray rejection, 24→22 analytically integrated ray intervals, and wider development framing. Read both sheets: clipping is resolved but the peak is too small/dim and daughters look perforated. Profile now 6.7/10.4/8.7 ms, still too slow.

Before round3: replace cached world displacement with **poloidal coordinate pairs** for parent and daughters. This is still geometry data, never cached colour/density: native Gaussian integration retains sharp edges, while complex-power lobe and daughter-sector transforms happen once per atlas cell instead of every ray interval. Daughter seam fade pushes coordinates outside support. Native skip derives from coordinate radii. Restore narrow secondary backlighting, strengthen saturated fine curls, improve puff scalloping and avoid bright synthetic connector wires. Measure again; use more intervals only if cost allows.

Round3 read: coordinate cache preserves edge locations, but static ray jitter makes a speckled veil; the mean-density daughters look perforated. Round4 removed jitter entirely, resolved daughter turns when possible and restored thin secondary backlighting. Both sheets read cleaner; full-size detail confirmed the old screen-space speckle was gone. Round5 added energy-dependent daughter scalloping, reduced smooth-coordinate atlas to 64×96×64 and replaced Gaussian sheet quadrature with an analytically integrated compact quartic kernel (not sampled densities). Read both sheets: sharper skins and more irregular daughters, though still too fabric-like. The 4K probe with concurrent own verification was 31–46 ms and was not treated as a pass.

Round6 reduced native angle cost using a tested <0.00021-rad approximation, simplified broad coverage, removed an unused daughter core expression and settled on 22→21 intervals. Read sheet and rhythm strip: the burst remains a small, dark-hearted scalloped packet, fill onset and secondary sweeps are visible, no stripe moiré, but smooth early rings and wiry tendrils remain. Final round corrected Drop's centre after shortening the source stem and enlarged portrait framing; read both final sheets and a final portrait. Every numbered round was change → capture → read → critique.

Final standard native timings (1080p p50/p95; 4K p50/p95): Drop 4.6/6.0;14.2/15.2 ms, Plumes 8.9/9.9;30.4/34.9, Nebula 7.4/7.7;27.3/33.0. ABBA vs main +38.9/+72.7/+77.3% at 1080p, exit 1 for real regressions. A separate isolated component probe measured Plumes 6.1 ms full, 4.5 ms without strands, 3.4 ms without volume: both native integration and analytic overlays contribute. Budget remains a weakness, not excused by shared load. Native 48-case limiter-enabled verifier passes, 25.5–43.9% lit, no GL/non-finite errors; built native DE/EN i18n passes (an initial stale-dist navigation timeout was corrected by building first). Final rhythm density 2.3/6.7/8.3 hits per bar. Honest final self-assessment L=7, not a claimed independent pass. Keep translucent material, stable ids, dark ground, fill locking and limiter intact.
