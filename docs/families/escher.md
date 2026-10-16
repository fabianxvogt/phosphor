# Impossible Stairs · Unmögliche Treppen (#110)

World `impossible-stairs`, family `escher`, development 0–2. Round 4 retains all eight look names/seeds, schema keys, three state definitions and four rhythm IDs. No engine, flash-limiter, preview or saved-world-definition changes.

## Mathematics and persistent identity

The 48-tread **Penrose covering space** rises locally by 0.045 per tread, gaining 2.16 units per circuit. A plan point `(x,z)` lifts to `(x+0.6h,h,z+h)`. Successive sheets differ along the privileged direction `(0.6,1,1)` and close exactly under orthographic projection. Small cyclic camera excursions introduce bounded parallax without exposing the projective join. This is not a globally Euclidean ascending loop.

The two additional twelve-tread flights now **grow from actual outer-loop landings**, IDs 30 and 6. Their first tread remains exactly fixed to that landing at every development value; subsequent treads scale by `0.65*smoothstep(0,1,development)` and rotate into perpendicular gravities. The same forward/inverse frame transforms position analytic hits, normals, AO, shadows, walkers and signature lanterns. This replaces detached intermediate strips and keeps both complete flights within the principal Relativity composition. Outer Penrose identity is unchanged.

Visibility remains analytic ray/box slabs with conservative projected tread/pier candidates. Exhaustive CPU comparison covers 26,076 rays at camera and fader extrema. Shadows use exact boxes and two AO samples retain contact detail. A back-facing key-light region skips the shadow search, since its directional irradiance is already zero. No ray marcher, new texture, reduced-resolution colour cache or output cap is introduced.

Infinity uses the **scale-three / thirty-degree Droste quotient**. For `w=ln(r)/ln(3)+phase`, radius becomes `exp(fract(w)*ln(3))` and angle becomes `angle−π/6*(w−phase)`. Thus `F(3 R(π/6)p)=F(p)`. Whole-cell turns include authored twist and integrated camera phase. This deforms rays, not rendered-image crossfades. The cyclic `exp(0.14 sin(cameraPhase))` dolly remains unchanged. Recursive depth now controls continuous contrast attenuation and the effective detail footprint: distant repeats become dimmer and softer; unresolved levels converge to dark atmosphere.

## States and looks

| Development | EN / DE                  | Composition                                                        |
| ----------- | ------------------------ | ------------------------------------------------------------------ |
| 0           | Stair / Treppe           | One impossible loop in a midnight masonry courtyard.               |
| 1           | Relativity / Relativität | Landing-rooted flights unfold into three gravities.                |
| 2           | Infinity / Unendlichkeit | The same stairs and enclosing arcade curl into a recursive atrium. |

State presets retain seed 11001 and identical non-development parameters. Extra looks remain **Chalk Procession**, **Three Gravities**, **Ivory Labyrinth**, **Endless Atrium**, **Night Loggia**. Names and saved state/look references did not change.

## Masonry, light and energy

The r3 review identified flat lavender CAD blocks and unreadable dark arch bands. Round 4 uses palette-tinted limestone, restrained 0.007-unit bevel normals, broad bounced key illumination, stationary interpolated mineral variation, footprint-filtered fine grain, worn tread-centre gradients, darker rear joints and subtle pier courses. Analytic silhouettes remain exact boxes; the bevel is a shading treatment, not rounded intersection geometry.

The enclosing two-depth courtyard now has **two storeys of real open arches**, each with cylindrical soffits and straight jambs of 0.24-unit depth. Directionally selected voussoir rims, carved seams and sparse door sconces reveal the mass of the arcade. Apertures are actual missing masonry, not painted black decals. The dark grouted floor is not lifted to reveal the walls.

All colour derives from primary/secondary/accent mixed with black/white. Pink in the authored film belongs to inhabited detail and local events, not every edge. Glacier, ember and acid-yellow remain legible. Energy changes procession speed and smoothly appearing walker/door/tread populations, not the stone's base brightness. Kick framing remains bounded at 1.8%.

## Four authored rhythm gestures

- Slot 0 **tread-procession**: broad count-addressed tread packet, reduced relative to slot 3 so pale tiles no longer compete with the leading lantern.
- Slot 1 **gravity-light**: directional face illumination reveals orientation.
- Slot 2 **recursive-lantern**: walking lantern heads/bodies breathe through recursive levels.
- Slot 3 **lantern-ascent / Lantern ascent / Laternenaufstieg**: every scheduled count advances **three actual treads**. A larger rectangular luminous lantern window, dark cap and surface-reaching stem lead a short exponentially fading riser wake (`exp(-behind*0.72)`). The outer-loop head also casts normal-dependent local spill across adjacent tread, pier and courtyard material boundaries. Smaller gravity flights have their own heads and surface wakes. Hot patches remain local and are distinct from the broader slot-0 packet.

The signature reads `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w`; muted tracks contribute no signature light. One leading analytic head per gravity is retained. This is discrete counted advancement, not a claim of a simulated lantern walking smoothly between all three addresses.

One-based signature steps: restrained **1/12/23/29**, division 2; driving **1/3/5/7/9/12/14/16**, division 2; accented **1/4/7/9/13/19/21/23/26/29/31**, division 4. All placement, duration and strength metadata is preserved from r3.

| Style      | Preset         | Family-track hits/bar |
| ---------- | -------------- | --------------------: |
| restrained | Empty landings |                   3.3 |
| driving    | Lantern steps  |                   8.4 |
| accented   | Endless ascent |                  14.0 |

Unequal loops, syncopation and fills remain intact. No full-screen white or live-limiter changes. Deterministic film captures do not establish venue photosensitivity compliance.

## Endlessness and verification

The integrated procession clock has period 48; ×3 walkers and ×5 packets complete integer laps. Camera period is 2π and all uses respect that wrap. Late/rate-change variants preserve the twelve-hour clock contract.

Native limiter-on `scripts/verify-escher.mjs --rig --port 48842 --out artifacts/escher-verification-r4` passed 34 cases: all eight looks at energy 0.1/0.5/0.9, three palettes, portrait states and 43,200 s. Six forward/backward development comparisons returned byte-identically; zero GL/non-finite errors. This is bounded health evidence, not venue qualification.

Tests cover persistent identity, exact cover/Droste mathematics, projected candidate visibility, landing-rooted growth over 201 development values, clock continuity, preset validity, slot 3 and density targets. Full `npm test`: **1017 passed, 22 opt-in skipped, zero failures**. Typecheck, build, DE/EN native-browser i18n and touched-file Prettier checks pass. World-rhythm and pipeline-flash gates pass.

## Native cost and evidence

Apple M3 Pro / Chrome ANGLE Metal, synchronous full-resolution throughput including post, not display cadence. Final standalone measurements:

| State      | 1080p p50 / p95 ms | 4K p50 / p95 ms | ABBA p50 delta vs main: 1080p / 4K |
| ---------- | -----------------: | --------------: | ---------------------------------: |
| Stair      |          3.2 / 3.3 |     11.6 / 12.3 |                      +6.2% / +3.9% |
| Relativity |          4.1 / 4.2 |     17.8 / 18.7 |                     +2.4% / +11.1% |
| Infinity   |          4.6 / 4.7 |     19.2 / 20.0 |                       0.0% / +6.5% |

1080p passes 8 ms. **4K Relativity/Infinity miss 16 ms**, including interleaved final p50 17.0/17.9 ms. The pair tool's 5% regression gate also fails for the noted rows; contention does not justify claiming a pass. Arithmetic-only mineral hashing, cheaper fine grain, zero-irradiance shadow rejection and one cross-material point light recovered much of the initial r4 cost.

Canonical evidence: `artifacts/look-review/impossible-stairs-r4/` contains film, 12-still sheet, 24-frame rhythm sheet, grids and large Stair/growth/Infinity stills. Four intermediate capture directories (`impossible-stairs-r4-round1` through `round4`) plus the optimized final fifth round were inspected as sheets and individual stills. Test logs: `artifacts/verification/escher-r4-*`; final profiles: `artifacts/performance/escher-r4-final*`.

Self-assessment: **L7.5**, not an independent pass claim. The material/architecture hierarchy and lantern event are clearer, but the repeated slab vocabulary remains deliberately regular; portrait has less stair coverage and late camera phases can compress the vortex. Live timing and 4K cost remain limitations.
