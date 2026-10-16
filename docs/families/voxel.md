# Data Monolith · Datenmonolith

Family **115**, renderer `voxel`, world `data-monolith`. Eight stable looks/seeds; **1,296 persistent addressed modules**, Rain → Assembly → Unfold. R4 responds to the independent r3 review: broader framed banks, dark machined silicon rather than olive slabs, quieter distant architecture, and one contiguous data-rewrite seam. No schema, state, preset, rhythm-id, engine or limiter changes.

## Mathematics and persistent identity

`voxel-model.mjs` implements a synchronous infinite-lattice additive CA over GF(2):

```
s[g+1](x,y,z) = s[g](x−1,y,z) XOR s[g](x+1,y,z)
             XOR s[g](x,y−1,z) XOR s[g](x,y+1,z)
             XOR s[g](x,y,z−1) XOR s[g](x,y,z+1).
```

Duplicate parents cancel. Frobenius gives six translated cells at distance `2^k` for generation `2^k`. Generation **27 = 16+8+2+1** has exactly 1,296 live addresses. Actual recursive voids determine the architecture; this is not decorative noise. CPU topology is independent of frame rate.

Assembly preserves **8 × 27 × 6** identities, sorted bottom-up with Morton locality within each layer. R4 changes pitch to **(1.05, .28, .70)** and staggers successive depth ranks by **.65** along x: a broad, roughly 10.6-unit bank, 7.5 units high, with a dimmer stepped rear rank. Persistent rank maps every module to a sorted live CA address. Seed changes rain positions/phases, never the CA rule or population. Development does not rebuild buffers.

**225 bridges** join nearest same-axis live-cell pairs across gaps of 10 or 12 lattice units, never skipping a live cell. These remain explicit, quiet scaffolding, not claimed CA cells. Cubes/bridges have depth-correct mirrored instances: **3,042 instances** total, 36 opaque vertices and six additive tail vertices each. No new geometry population or render pass.

## Continuous composition

| State    | Composition                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rain     | Falling modules in a 20 × 20 × 14 hall; short luminous tails, floor mirrors, distant hall lights.                                                                                                     |
| Assembly | Broad offset memory-bank wall; crown visible in the standard film, stepped depth ranks, recessed ports and a diagonal rewrite seam.                                                                   |
| Unfold   | The same addresses open into a 30-unit recursive vault. Broad rectangular modules form overhanging memory banks around real CA voids; near/far scale, occlusion and stronger fog establish hierarchy. |

Fractional development interpolates staggered positions and dimensions, not two dissolved pictures. Reversal retraces the same function. Cosine rain descent hides its continuous return by shrinking geometry. Near-lens rain shrinks before the near plane.

The camera is an integrated closed orbit, with a stable horizon and smooth development dolly/crane. Assembly radius is 11.8, eye height 3.2, target `(1.6,4,0)`; Unfold radius 5.8, eye height 10, target height 16. A higher intermediate crane collided with newly broadened modules and was rejected. CPU camera/position references and conservative sampled cube/bridge clearance pass for distances .85/1/1.3. Kick lens punch remains **1.8%**.

State looks retain seed **1151** and identical non-development params. Extra looks remain **Quiet Addresses**, **Memory Vault**, **Parity Cathedral**, **Broken Register**, **Cold Archive**, with their original identifiers, seeds and parameters.

## Material, depth and energy

R4 uses wide, shallow modules, directional palette-secondary titanium/silicon lighting, a grazing face gradient, dark recessed-panel shadow and a narrow machined lip. Normal transforms account for anisotropic extents and safely handle zero-normal tails. Ports contain three rows of binary subcells rather than identical full-width stripes. Seeded intensity and occupancy vary by module. Cool ports mix the palette secondary with white; saturated primary conductors and rare accent seams stay distinct. Dark faces remain materially visible rather than olive rectangles.

Depth falloff increases from .055 in Rain/Assembly to .11 in Unfold. Distant banks are subordinate, not equally bright wallpaper. Derivative-aware port edges resist minification shimmer. The small memory pad, readout, thin scaffold and mirror floor remain.

Energy enables more illuminated ports (`.18 + .55 × energy` threshold), changes rain occupancy, motion rates and bounded bit displacement—not global brightness. Low-energy frames retain visible occupied space. All colour comes from palette uniforms/mixes with black or white; no full-screen white event.

## Rhythm

Presets remain **Idle registers / Address march / Midnight overflow**, with **2.75 / 7.75 / 13.25 family hits/bar**. All placements and late fills are preserved. No reviewer request for a polyrhythm was made; existing independently placed loops remain unchanged.

- **Slot 0 — Address flip:** modulo-16 persistent cohort activates local ports/edges.
- **Slot 1 — Scan plane:** a narrow cool horizontal readout, independent of data rewriting.
- **Slot 2 — Register shift:** modulo-8 assembled row receives bounded glitch displacement.
- **Slot 3 — Memory rewrite:** one oblique front crosses adjacent banks, not repeated ten-unit storey patches. It retracts modules by up to .20 units, turns them by .20 radians at the front with a .075-radian wake, and replaces the old binary word with the current count-selected word. Written data remains after the seam. Accent marks the moving front, not the entire wake. Muting removes the animated event.

The front reads envelope/hit; count selects old/new port words. Driving duration increases from .95 to **1.65 beats**, making travel readable at half-beat sampling. Zero-based signature placements:

| Preset            | Division | Loop steps | Active steps                | Strength / duration (beats) |
| ----------------- | -------- | ---------- | --------------------------- | --------------------------- |
| Idle registers    | 2        | 32         | 2, 14, 29                   | .9 / 1.4                    |
| Address march     | 2        | 16         | 0, 4, 11, 14                | 1 / 1.65                    |
| Midnight overflow | 4        | 32         | 0, 4, 7, 12, 18, 22, 26, 30 | 1 / .65                     |

Integrated periodic clocks drive fall/orbit/readout. No raw-time seam, frame-random grain, identity reset or development-locked flash. The shared limiter is unchanged. Deterministic review films disable asynchronous approval; live limiter verification is separate.

## R4 verification and cost

Apple M3 Pro / Chrome ANGLE Metal; synchronous whole-frame throughput including post, **40 samples/state**, energy .95:

| State    | 1080p p50 / p95 | 4K p50 / p95  |
| -------- | --------------- | ------------- |
| Rain     | 2.1 / 2.3 ms    | 5.4 / 9.1 ms  |
| Assembly | 2.1 / 2.5 ms    | 5.7 / 7.5 ms  |
| Unfold   | 2.1 / 2.3 ms    | 7.8 / 12.3 ms |

Absolute 8/16 ms p50 budgets pass. Interleaved ABBA versus main, 64 frames/candidate: 1080p **−30.3 / −20.0 / 0%**; 4K initial **0 / +8.3 / +8.0%**, repeat **+2.0 / +5.9 / +3.8%**. Retain both attempts: Assembly remains just above the pair script's +5% threshold. Shared-GPU contention inflates standard 4K results; repeat pair candidate p50 is 5.0/5.4/5.5 ms. These are throughput, not venue cadence qualification.

- `npm test`: **1020 pass, 22 skipped, 0 fail**, including world rhythm and pipeline flash tests.
- Native family suite: **12 pass**, including reversal, 0/3599.99/3600.01/4096/43200-second checks, persistent buffers, ordinary-mesh switching, context loss/recovery, all states at 4K.
- `verify-voxel.mjs`: **72** all-look × energy (.1/.5/.9) × palette (Glacier/Ember/Silver) checks, portrait, **180 limiter-enabled frames**; zero GL/nonfinite/browser errors.
- Typecheck, build, DE/EN native browser i18n pass. Owned code/docs pass Prettier; catalog row is kept local rather than reformatting unrelated shared rows.
- Four change/capture/read rounds: `artifacts/look-review/data-monolith-r4-round{1,2,3,4}/`; sheets and large individual stills inspected. Round 1 rejected overly dark material; round 2 rejected a mostly distant seam; round 3 established the foreground event; round 4 corrected camera clearance and retained data words.
- Final reviewer evidence: `artifacts/look-review/data-monolith-r4/` (film, sheet, rhythm, grids, large assembly/vault/rewrite stills and individual event frames). Audit/native/performance evidence uses the same prefix. Extra Ember Broken Register reversal film: `data-monolith-r4-extra/`.

Self-assessment: **L7.5**, not independent acceptance. Composition, material and event clarity improve substantially; the quiet own-palette vault is still dark and its repeated modules remain a stylistic limitation. Independent ≥8 acceptance is not claimed.
