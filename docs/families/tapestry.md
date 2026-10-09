# Causal Tapestry (#51) — elementary cellular automata

**Rework 2026-10-09** after owner feedback: the automaton was lost under woven relief and stopped evolving. It is now the hero: crisp cells, the rule's space–time diagram, and a write head that visibly prints each new generation. It never stops generating.

## Algorithm

Wolfram's elementary cellular automata: a ring of binary cells. Each generation, every cell becomes bit `4·left + 2·self + right` of the 8-bit rule number. `stepTapestry(row, rule)` is the exact CPU reference. `TapestryModel` mirrors the whole GPU simulation (seeding, events, stale detection) generation by generation. The opt-in browser gate checks that the GPU history equals it bit for bit.

- **Rings:** one ring of **199** cells (cascade, mirror, tunnel), or three rings of **37** (rails). Both are prime, so they are never powers of two. On the old 512-cell ring, additive rule 90 went black after 256 generations; on 199 it never dies.
- **History:** a 255-generation ring buffer in a 256×256 RGBA8 state texture. Row 0 holds metadata.
- **Background-relative display:** rules whose quiescent background flips (bit 0 set, e.g. 45, 73) are shown as `cell XOR background(t)`. The ground stays dark and never strobes. The background orbit is tracked per row.

## Signature detail in front

- **Cells read as cells.** About 199 cells span a 16:9 frame (≈9.6 px each at 1920×1080). Tiles have a gap and bevel (`weave`); on sub-3-px cells the gap fades out so nothing aliases.
- **The write head.** A glowing line marks the newest generation. A pen sweeps along it and reveals the new row cell by cell during each generation interval. Unlit lattice cells near the head glow faintly, so the grid being written reads.
- **The seed column.** Each cascade records its seed column. For asymmetric two-sided rules (30, 45, …) its live cells are tinted. For rule 30 this is the centre column that Wolfram used as a random number generator. Symmetric rules are left plain, because their axis carries nothing new.
- **Events are visible.** Fresh cascades, injected perturbations and live rule changes (a boundary row) flash in the accent colour and cool with age.

## Endless

1. **Cascades are reborn.** In sparse looks (density < 0.25), a fresh row of seeds starts a new cascade when the single seed's light cone has wrapped the ring. The wrap point comes from the rule's growth bits: left via `001` (bit 1), right via `100` (bit 4). That is 111 generations for two-sided rules on 199 cells: exactly one cascade page. One-sided rules (102, 110, 60) start at the edge their cone crosses away from.
2. **Stale detection.** Each row stores a rotation- and reflection-invariant signature: population, boundaries, and pairs at distance 2 and 3. Once per generation, one controller texel per ring checks the last signatures for any period p ≤ 40. That covers dead, uniform and blinking states, cycles, and shifted cycles such as traffic free-flow or gliders on a ring. A stale ring needs `max(12, 2p + 2)` matching generations and has a 32-generation cooldown. It gets a visible event: a fresh cascade in sparse looks, a local flip-patch in dense looks. In rails, a dead or saturated ring also moves on to another rule.
3. **Rain and phrases.** Above energy 0.3, perturbations rain in with energy. `phrase` adds a seed event every N beats. A dense look that stays quiet for 360 generations is perturbed.
4. **No stall.** The generation clock runs at ≥ 2 generations/s whatever the parameters. The tunnel's rotation phase is integrated in state, so energy changes never jump it. All clocks are bounded integers.
5. **Prefill.** During the engine's 120 warm ticks, the first 200 generations are written one per pass, so a clip opens on a full diagram.
6. **Live rule change** continues from the current row and marks the boundary. Changing the view re-partitions the ring with a fresh row and keeps the visible history.

CPU evidence (`tests/tapestry-gate.test.mjs`): every look is run at energy 0.1/0.5/0.9 for 3000 generations, with 300-generation windows sampled every 100 generations. No window is more than half dead, none is p-periodic for p ≤ 40, and every window has varied signatures. Sparse looks give birth to a new cascade at least every `2·wrapAge`.

## Views (`seedShape`, type values 0–3)

| Value | View        | What it shows                                                                                                                                                                                                                                                                                    |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | **Cascade** | A printed page of Wolfram's diagram: 199 × 112 static cells. The write head sweeps down (up when reversed) and overwrites the oldest generation; a dark erase band runs ahead of it. Cells never move, so they are maximally legible. A two-sided cascade fills exactly one page.                |
| 1     | **Mirror**  | The newest generation is the centre line and history streams out both ways. Energy folds the ring into 1 → 3 mirrored kaleidoscope copies. Reversed flow puts the heads on the top and bottom edges.                                                                                             |
| 2     | **Rails**   | Three 37-cell rings with time running sideways. The centre rail runs the look's rule; the outer rails show a gallery of famous rules (18, 22, 30, 41, 45, 54, 60, 62, 73, 90, 102, 105, 106, 110, 126, 150) side by side from the same kind of seed. Heads sit on opposite sides (counter-flow). |
| 3     | **Tunnel**  | A log-polar map, so every cell stays square and time is depth: the ring is literally a ring. Forward flow sends generations from the vanishing point toward the viewer. Reversed flow writes at r = 0.8 and lets history recede. Sub-pixel cells settle to the row's density.                    |

## Parameters

`rule` (Wolfram code), `seedShape` (view), `density` (< 0.25: 1–6 seeds per cascade; otherwise random fill; looks sit at ≤ 0.10 or ≥ 0.36 so autopilot drift of ±0.095 never flips the regime), `scroll` (generations/s, 0–96), `weave` (tile gap and bevel), `playback` (sign = time-flow direction, magnitude = write-head glow), `phrase` (seed event every N beats), `paletteDrift` (colour tide along generations). The keys are unchanged; every value an old preset used still validates.

## Looks

| Look                    | View    | What it shows                                                                  |
| ----------------------- | ------- | ------------------------------------------------------------------------------ |
| 90 · Nested linen       | Cascade | Single-seed Sierpinski triangle, one per page                                  |
| 54 · Twin brocade       | Mirror  | Two seeds of class-4 rule 54, mirrored into a woven texture                    |
| 30 · Wild silk          | Tunnel  | Dense rule 30 chaos receding into the tunnel (reversed)                        |
| 184 · Traffic ribbon    | Cascade | Traffic rule 184 near critical density: jams travel backwards against the cars |
| 110 · Persistent knots  | Cascade | Universal rule 110 from random: gliders on the ether background                |
| 150 · Interference lace | Mirror  | Three-seed additive rule 150, heads on the edges (reversed)                    |
| 22 · Sparse ceremony    | Tunnel  | Single-seed rule 22 fan, receding tunnel                                       |
| 126 · Burning fringe    | Rails   | Fast frieze of rule-126 triangles beside gallery rules                         |
| 30 · Centre column      | Cascade | Rule 30 from one cell, time flowing up, centre column (RNG) tinted             |
| 45 · Chaos fan          | Mirror  | Rule 45 single-seed chaos (background-relative), mirrored fan                  |
| 73 · Walled gardens     | Tunnel  | Rule 73's static walls become radial spokes around chaotic gardens             |
| 18 · Kink rails         | Rails   | Rule 18 from random: Sierpinski fragments and kinks, counter-flowing rails     |
| 102 · Pascal slope      | Cascade | One-sided Sierpinski (Pascal's triangle mod 2) from two seeds                  |
| 41 · Glider loom        | Rails   | Complex rule 41 in the centre rail                                             |

## Energy grammar (structure and motion, not brightness)

- `scroll` × 0.52 at 0.1 → × 1.48 at 0.9 (`energy: { mul: [0.4, 1.6] }`), with a floor of 2 generations/s.
- Seeds per cascade: +1 at energy 0.65, +2 at 0.8. Rain of perturbations: none below 0.3, about 1 every 40 generations at 0.9.
- Mirror folds: 1 → 3 kaleidoscope copies. Tunnel spin: 0.0015 → 0.012 turns/s, integrated.
- Write-head intensity: 0.45 → 1.2 × `|playback|`, plus a small `u_kick` lift. Shared punch 0.8 and pulse 1 come from the engine.

## Cost

- **Simulation:** 256 × 256 = 65,536 texels × 2 passes per 60 Hz tick (`steps: 2`). Most texels fetch only the clock and themselves.
- **Per generation** (at most one per pass): 199 new cells × 3 fetches; one signature texel per ring loops over its ring (≤ 202 fetches); one controller texel per ring runs the stale check (early-exit; at most about 3,300 signature compares in the worst case, about 80 typically).
- **Visual:** per pixel about 6 `texelFetch` plus a few `exp`; the tunnel adds `log` and `atan`. No raymarching and no `maxRenderWidth`.
- **Real GPU:** the reference rig was not re-timed in this lane. The work is about half the texel writes of the old 512 × 512 single-pass loom.
- **SwiftShader:** about 130 ms per tick under a 4× oversubscribed CPU (headless only, not a GPU proxy).

## Tests

`tests/tapestry-gate.test.mjs` covers:

- every Wolfram code on every neighbourhood, and rule-30/110 fixtures
- the old power-of-two death against the new prime rings
- signature invariance
- stale detection: dead, shift, traffic, blink, chaos and cascade states
- seed placement
- live rule change and view change continuity
- gallery rails
- 3000-generation endlessness for every look at three energies
- the preset contract

The opt-in browser part (`node tests/tapestry-gate.test.mjs --port N`) renders every look and compares the full GPU history (cells, rule, background, event kind) with `TapestryModel`.
