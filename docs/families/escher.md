# Impossible Stairs · Unmögliche Treppen (#110)

World `impossible-stairs`, family `escher`, development 0–2. Round 3 preserves all eight look names, seeds, schema keys, three state definitions and existing rhythm IDs. No engine, flash-limiter or preview changes.

## Mathematics and persistent identity

The 48-tread **Penrose covering space** rises locally by 0.045 per tread, gaining 2.16 units per circuit. A plan point `(x,z)` lifts to `(x+0.6h,h,z+h)`. Successive sheets differ along the privileged direction `(0.6,1,1)` and close exactly under orthographic projection. Small cyclic camera excursions introduce bounded parallax without exposing the projective join. This is not a claim of a globally Euclidean ascending loop.

Two additional twelve-tread flights rotate continuously into perpendicular gravity frames; identities never reseed on development or reversal. The analytic visibility path uses ray/box slabs with conservative projected tread/pier candidates. Exhaustive CPU comparison covers 26,076 rays at camera and fader extrema. Shadows use exact boxes; two AO samples retain contact detail. The surrounding two-depth courtyard uses planes and cylinders, open arches, real 0.24-unit soffits/jambs, columns and a dark grouted floor.

Infinity uses the **scale-three / thirty-degree Droste quotient**. For `w=ln(r)/ln(3)+phase`, radius becomes `exp(fract(w)*ln(3))` and angle becomes `angle−π/6*(w−phase)`. Thus `F(3 R(π/6)p)=F(p)`. Whole-cell turns include the authored twist and integrated camera phase. This deforms rays, not two rendered images. A slow `exp(0.14 sin(cameraPhase))` dolly is cyclic, not an unbounded flight. Unresolved recursions converge to dark atmosphere.

## States and looks

| Development | EN / DE                  | Composition                                                         |
| ----------- | ------------------------ | ------------------------------------------------------------------- |
| 0           | Stair / Treppe           | One impossible loop in a midnight arcaded courtyard.                |
| 1           | Relativity / Relativität | Persistent side flights grow and turn into three gravities.         |
| 2           | Infinity / Unendlichkeit | The same stairs and architecture curl into an architectural vortex. |

State presets share seed 11001 and identical non-development parameters. Extra looks remain **Chalk Procession**, **Three Gravities**, **Ivory Labyrinth**, **Endless Atrium**, **Night Loggia**.

## Round-3 lighting and energy grammar

The baseline's white/olive CAD rendering is replaced by secondary-palette-tinted pale plaster, coloured fill, darker enclosing masonry and distance atmosphere. Static world-space material modulation never changes grain per frame. Recessed door lights establish inhabited scale; tread-edge lantern insets and physical lantern heads provide small HDR accents. Light widths use the output pixel footprint. No new image texture, low-resolution colour cache, geometry rebuild or rendering cap is used.

Energy changes procession speed, the smoothly appearing walker cohorts, and the population of door/tread lights, not plaster brightness. Geometry and readable architectural coverage remain present at 0.1. Primary/accent/secondary are always library palette colours; glacier, ember and acid-yellow were checked. Kick framing remains bounded at 1.8%.

## Four authored rhythm gestures

- Slot 0 **tread-procession**: a stronger local light packet climbs persistent addresses. Structural addressing stays at at most two hits/bar.
- Slot 1 **gravity-light**: stronger directional face illumination reveals stair orientation, not the whole frame.
- Slot 2 **recursive-lantern**: walking lantern heads and bodies breathe together with more visible range.
- Slot 3 **lantern-ascent / Lantern ascent / Laternenaufstieg**: each scheduled count advances the leading lantern **three actual treads**. Its head, inset lantern panels and decaying surface-light wake repeat in each gravity and recursion. Reads `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w`; muted tracks contribute no signature emission. Only one extra analytic head per gravity is retained after profiling.

The signature's one-based active steps are: restrained 1/12/23/29 at division 2; driving 1/3/5/7/9/12/14/16 at division 2; accented 1/4/7/9/13/19/21/23/26/29/31 at division 4. The four-bar restrained loop gives isolated arrivals; the eight-beat driving loop climbs steadily; the accented two-bar figure adds offbeat flourishes.

| Style      | Preset         | All four family tracks, hits/bar |
| ---------- | -------------- | -------------------------------: |
| restrained | Empty landings |                              3.3 |
| driving    | Lantern steps  |                              8.4 |
| accented   | Endless ascent |                             14.0 |

These are family-only densities, not inflated by the shared global tracks. All four gestures have independent restrained/driving/accented loops. Events stay local; no full-screen white and no changes to the shared limiter.

The integrated procession clock has period 48; ×3 walkers and ×5 packets complete integer laps. Camera period is 2π and all uses respect that wrap. Late/rate-change variants retain the original clock contract for twelve-hour operation.

## Native verification and measured cost

Apple M3 Pro / Chrome ANGLE Metal. Synchronous full-resolution throughput including post, not a display-cadence qualification. Ports 48840–48843 only. Profiling scripts accept `--families escher` (not the brief's singular `--family`).

| State      | 1080p p50 / p95 ms | 4K p50 / p95 ms | ABBA p50 delta 1080p / 4K vs main |
| ---------- | -----------------: | --------------: | --------------------------------: |
| Stair      |          3.0 / 3.2 |     11.0 / 11.5 |                      0.0% / +4.9% |
| Relativity |          4.1 / 4.3 |     17.3 / 17.7 |                      0.0% / +4.2% |
| Infinity   |          4.6 / 5.2 |     17.8 / 18.2 |                     +2.3% / +5.4% |

1080p meets the 8 ms budget. Standalone 4K Relativity/Infinity miss 16 ms during fleet contention; interleaved final 4K p50 values were 10.8/14.9/15.7 ms. Do not claim an unconditional 4K pass. The pair tool exits 1 for the +5.4% Infinity regression against its 5% relative threshold. No GL errors, non-finite uploads or black frames were observed.

`npm test`: 986 passed, 21 opt-in skipped, zero failures. Typecheck, build, DE/EN native-browser i18n and touched-file formatting pass. The first i18n attempt lacked dist, then the software-GPU stage timed out; build plus `--native-gpu` passed both languages. Family tests cover slot 3, signature timing and all density targets, in addition to unchanged mathematics, presets and continuity. World-rhythm and pipeline-flash tests pass.

`scripts/verify-escher.mjs --rig --port 48842` keeps the live limiter enabled: 34 cases cover all eight looks at 0.1/0.5/0.9, three palettes, portrait states and 43,200 s. Six forward/backward development comparisons are byte-identical on return; zero GL/non-finite errors. This is bounded health evidence, not venue photosensitivity certification.

## Evidence and remaining limits

Worktree-relative canonical evidence: `artifacts/look-review/impossible-stairs-r3/` contains the 30-second MP4, 12-still sheet, 24-frame rhythm sheet and `grids.md`. Before and three intermediate film rounds were inspected. Additional palette, reversal and Night Loggia films are in `artifacts/look-review/escher-{validation,reversal,extra}/`; native stills and health JSON in `artifacts/escher-verification/`; profiles in `artifacts/performance/escher-final-*`; test logs in `artifacts/verification/`.

Self-assessed look **6.5/10**, not an independent pass claim. Improved contrast, cool materials and visible local rhythm do not eliminate the regular block/CAD character. Relativity remains a staged sculpture, not an interconnected inhabited building. Lantern heads are tiny at review-sheet scale; the surface-light wake is more legible. Infinity still has finite annular joins and the 12-hour camera phase can produce a compressed composition. No claim of reaching L≥8.
