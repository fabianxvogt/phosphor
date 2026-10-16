# Data Monolith · Datenmonolith

Family **115**, renderer `voxel`, world `data-monolith`. Eight stable looks/seeds; one persistent population of **1,296 addressed cubes**, Rain → Assembly → Unfold. Round 3 replaces uniform luminous outlines with solid silicon memory modules and a travelling, slot-3 memory-rewrite gesture. No schema, preset, world/state definition, engine or limiter changes.

## Signature mathematics and identity

`voxel-model.mjs` supplies deterministic geometry and CPU references. The infinite-lattice synchronous additive cellular automaton is:

```
s[g+1](x,y,z) = s[g](x−1,y,z) XOR s[g](x+1,y,z)
             XOR s[g](x,y−1,z) XOR s[g](x,y+1,z)
             XOR s[g](x,y,z−1) XOR s[g](x,y,z+1).
```

Duplicate parents cancel. Over GF(2), Frobenius gives six translated cells at distance `2^k` for generation `2^k`. Generation **27 = 16+8+2+1** contains exactly 1,296 live addresses. Actual recursive voids determine the architecture, not decorative noise. Topology is baked on the CPU, independent of animation rate.

The monolith contains **8 × 27 × 6** cubes at pitch `(0.46, 0.44, 0.46)`. Assembly sorts bottom-up, then by interleaved Morton xyz bits. Persistent rank maps every cube to a sorted live CA address. Seed controls rain positions and fall phases, never the CA rule or population. Development never rebuilds identity buffers.

**225 structural bridges** join nearest same-axis live-cell pairs across gaps of 10 or 12 lattice units without skipping another live cell. These are explicit scaffolding, not claimed CA cells. R3 reduces their half-width from .035 to .012 and quiets their lighting. Cubes and bridges have depth-correct mirrored instances: **3,042 instances** total, with 36 opaque cube vertices plus six additive tail vertices.

## Continuous arc, looks and camera

| State               | Composition                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rain · Regen        | Falling addressed modules through a 20 × 20 × 14 hall, local tails, floor mirrors and distant light columns.                                                          |
| Assembly · Aufbau   | A 12-unit low-angle memory tower. Lit ports and dark module faces replace the old wireframe grid. Its top extends beyond the frame.                                   |
| Unfold · Entfaltung | The same addresses unfold into a 30-unit recursive vault. The camera cranes inside its central void; thin scaffolding, occlusion and fog separate near and far banks. |

Fractional development uses staggered smoothstep positions/dimensions, not a dissolve. Reversal retraces the same law. Rain uses cosine descent and a shrunken hidden return, so position stays continuous through partial assembly. Near-lens rain shrinks before crossing the near plane. Architecture retains its fixed identity.

The integrated closed camera azimuth, continuous dolly/crane and stable horizon remain unchanged. `cameraFrame()` and sampled cube/bridge AABBs guard camera clearance. The schema's minimum distance remains .85. Kick lens punch stays **1.8%**.

The state looks share seed **1151** and identical non-development parameters. Extra looks retain all identifiers: **Quiet Addresses** (slow large rain), **Memory Vault** (closer restrained tower), **Parity Cathedral** (wide/fine architecture), **Broken Register** (partial unfold with stronger displacement), **Cold Archive** (narrow dense vault and slow camera).

## Material and energy

Solid palette-coloured faces have a broad directional key, secondary fill, specular highlight, grazing rim and darkened bevels. Edge emission is drastically reduced and seed-weighted, rather than outlining every cube. Recessed four-row memory banks carry deterministic binary variation. Derivative-aware port edges resist minification shimmer. Existing rare memory pads and face readouts remain.

Energy changes the number of enabled ports (`.18 + .55 × energy` address threshold), rain population, fall/camera rates and bounded bit displacement. It is not a global brightness multiplier. Low energy retains visible occupied geometry and a grounded hall. All colour comes from the palette; accent is reserved for local rewrite banks/addressed bits. No full-screen white events.

## Rhythm

Three named presets remain **Idle registers / Address march / Midnight overflow**. Four independent authored tracks now total **2.75 / 7.75 / 13.25 hits per bar** respectively. Address cohorts and structural row changes remain sparse; scan syncopations and write-head sweeps provide local activity.

- **Slot 0 — Address flip:** modulo-16 persistent address cohort activates memory ports and local accent.
- **Slot 1 — Scan plane:** fast local readout across the same matter, plus the existing slow integrated scan.
- **Slot 2 — Register shift:** modulo-8 row moves by at most .30 times the glitch parameter; events remain spaced.
- **Slot 3 — Memory rewrite:** alternating-direction write planes turn addressed modules slightly, move them by at most .13 units and write saturated accent into recessed ports. In Unfold, the plane repeats by ten-unit memory storey, avoiding long empty-space sweeps. It reads `u_rhythm.w`, `u_rhythmHit.w`, `u_rhythmCount.w`; muting the track removes it.

Zero-based signature steps:

| Preset            | Division | Loop | Active steps                | Strength / duration (beats) |
| ----------------- | -------- | ---- | --------------------------- | --------------------------- |
| Idle registers    | 2        | 32   | 2, 14, 29                   | .9 / 1.4                    |
| Address march     | 2        | 16   | 0, 4, 11, 14                | 1 / .95                     |
| Midnight overflow | 4        | 32   | 0, 4, 7, 12, 18, 22, 26, 30 | 1 / .65                     |

All clocks are integrated, periodic fall/camera/readout phases. No raw scene-time arithmetic, frame-random grain, population reset or hourly seam was added. The shared flash limiter is unchanged; deterministic film captures are distinct from limiter-enabled native playback.

## Cost and verification (r3)

Apple M3 Pro / Chrome ANGLE Metal, synchronous whole-frame throughput including post; **40 samples/state**, energy .95:

| State    | 1080p p50 / p95 | 4K p50 / p95 |
| -------- | --------------- | ------------ |
| Rain     | 1.8 / 2.1 ms    | 4.8 / 5.2 ms |
| Assembly | 1.9 / 2.3 ms    | 4.8 / 5.1 ms |
| Unfold   | 1.9 / 2.2 ms    | 5.2 / 5.4 ms |

Interleaved ABBA versus main (64 frames/candidate): initial 1080p p50 deltas **+11.1 / −9.1 / +9.1%** (relative +5% gate fails for Rain/Unfold under contention); 4K **+2.2 / 0 / −2.0%**, gate passes. A second 1080p pair measured **−4.3 / −4.8 / −8.3%** and passed the relative gate; retain both runs rather than hide contention. Absolute 8/16 ms budgets pass comfortably. Raw logs and JSON retained; throughput is not venue cadence qualification. No reduced-resolution pass, new engine capability or additional geometry population.

Verification:

- `npm test`: **983 pass, 21 skipped, 0 fail**; family/CA/continuity, world rhythm and pipeline flash tests pass.
- Native family suite: **11 pass**, including identity-buffer persistence, reversal, 0/3599.99/3600.01/4096/43200-second checks, ordinary-mesh switching, real context loss/recovery and all states at 4K.
- `scripts/verify-voxel.mjs`: **72** all-look × energy (.1/.5/.9) × palette (Glacier/Ember/Silver) checks, portrait still, and **180 limiter-enabled native frames**. Zero GL, nonfinite or browser errors.
- Typecheck, build and DE/EN browser i18n pass. i18n requires built `dist` and `--native-gpu`; initial missing-dist/software-timeout attempts were rerun successfully. Prettier passes on owned code/family docs; shared i18n/catalog have verified pre-existing formatting warnings, so unrelated entries were not reformatted.
- Before and three reviewed iteration films: `artifacts/look-review/data-monolith-r3-{before,round1,round2,round3}/`. Reviewer evidence: `artifacts/look-review/data-monolith-r3/` (sheet, rhythm strip, film and `grids.md`). Additional palette/portrait/native/performance evidence has `data-monolith-r3-*` prefixes. Twelve-second Ember/Glacier films and a portrait Silver reversal were also captured and inspected.

Self-assessed look quality: **6.5–7/10**, not independent acceptance. Solid forms and local write bands are substantially clearer than the L5 baseline; the tower remains narrow, the unfolded vault still reads as repeated modules, and the own-palette olive faces are less impressive than Glacier. An independent ≥8 has not been demonstrated.
