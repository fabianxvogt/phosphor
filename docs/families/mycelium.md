# Living Mycelium

**EXPLORATORY / EMPIRICAL**, round-3 rework, 2026-10-16. Family `mycelium`, number 99. Artistic fungal biology, not a calibrated model. World, states, preset names, seeds and parameter values remain compatible; the previous world description is appended to `HISTORY` in `worlds.mjs`.

## Algorithm and signature

[`mycelium-geometry.mjs`](../../mycelium-geometry.mjs) builds one deterministic network per seed on a 2.4 m periodic forest floor:

- Correlated hyphal tip growth, negative autotropism, lateral branching and apical dichotomy create wandering fans rather than straight connectors. Eight inocula seed the band beside the camera path.
- Anastomosis fuses nearby unrelated tips. Seed 211 has 31,780 nodes and 2,399 fusion edges.
- Multi-source Dijkstra supplies true shortest-path nutrient distances through the looped graph. Sink demand routed back along that tree gives Murray-law cord radii, `r³ ∝ flow`.
- Fruiting sites at those cords grow five cap forms. The seed-211 grove has 45 mushrooms; all six look seeds pass camera-clearance tests over development, cap scale and altitude.
- The unchanged bounded Gray–Scott substrate modulates thread activity and soil glow. Its chemistry, spore-rain recovery and continuity token `gray-scott-uv16-v1` remain intact.

The hero is transport: soft-headed nutrient trains split through the actual branching metric and light the caps when they reach fruiting sites. This replaces the former isolined heightfield; it does not stack a mushroom picture over the old terrain.

## Rendering and development

One fixed opaque mesh head (leaves, twigs, stems and caps) precedes an additive tail (hyphae, spores, glow). Two instances supply threads and their ground light pools; the second instance hides non-thread primitives. No engine changes.

Shared-tangent ribbon strips avoid beaded joints. Minimum core radius is 0.78 px at 1080p (1.56 px diameter), scaled with resolution, with coverage attenuation. Hierarchical widths, dim felt, fuzzy young margins, braided cords, buried threads and local pools replace uniform glowing outlines. Caps have dim crowns, saturated translucent margins and bright radial gills; palette colours alone determine the material. Static floor texture, fog, leaf/twig occlusion, distant trunks, parallax and mixed mushroom scale supply depth.

| State        | Structure                                                                   | Camera                              |
| ------------ | --------------------------------------------------------------------------- | ----------------------------------- |
| 0 Understory | Partially revealed fans, runners, growing tips, dark litter                 | 15 cm high, looking down            |
| 1 Tide       | Full looped web; swelling transport cords and crossing nutrient trains      | Approximately 10.6 cm high, oblique |
| 2 City       | Fine felt dims while the same cord ends fruit, unfurl gills and shed spores | 4.6 cm high, slightly upward        |

Development only changes uniforms: growth, reveal, hierarchy, fruiting and camera. It never regenerates the graph or resets chemistry. Forward and reverse trajectories use the same geometry. Camera laps are closed, with gentle yaw and a 1.5% maximum kick lens response. Fast development changes still crane the camera; there is no spring.

## Looks and energy

State looks: **Hyphal Understory**, **Tidal Lamellae**, **Lantern City** (seed 211). Extra looks retain their original parameter values and seeds: **Spore Floor** (101), **Night Membrane** (149), **Tide Turning** (41), **Street Plan** (18), **Bloom Quarter** (73). They vary felt/cord hierarchy, foraging, cap opening, density and camera height. Schema keys/ranges are unchanged; labels now describe the new renderer.

Energy adds second/third geodesic trains, raises foraging excursion and rate, changes cord hierarchy, increases spore density and speeds the flight rather than applying a global gain. Four integrated periodic clocks drive flight, nutrient travel, streaming and foraging. Fixed-rate camera sway and spore phases remain periodic at late times. At energy 0.1, raw pixels above 0.04 in any channel occupy 19.4% / 56.5% / 71.4% of the three state frames: none is blank.

## Rhythm

Merged `main` including **World rhythm presets** before rhythm work. Three named presets remain:

- **Dormant threads:** sparse tip syncopation, unhurried waves and phrase-end feed.
- **Root signals:** busier tips, independent colony waves and relayed cord signals.
- **Spore chorus:** sixteenth-note tip fills, stronger waves and spore answers.

Existing gesture IDs/slots stay: x `reaction-front` lights growing tips and a returning glint; y `chemical-band` sends a selected-colony wave; z `feed` injects bounded substrate feed and puffs spores from a selected cluster. Local amplitudes are stronger. Envelopes settle before subsequent hits, including the loop seam.

**Slot 3, `signal-relay` / Signal relay (Signalstaffel):** an accent-coloured soft head and comet tail races through graph distance, splits at branches and flares arriving mushroom gills. Shader code consumes `u_rhythm.w`, `u_rhythmHit.w` and `u_rhythmCount.w`. EN/DE labels and descriptions are additive dictionary entries.

All relay loops span four bars. Zero-based sixteenth positions: restrained **0, 30** (strength 0.65, duration 3 beats); driving **0, 36, 54** (0.9, 2.2 beats); accented **0, 30, 40, 54** (1, 1.8 beats). Events are spatially local, never full-screen white; the shared limiter is unchanged. The family verifier leaves it enabled.

## Cost and verification

Seed 211: **501,402 stored vertices**, **48.1 MB** mesh, fixed opaque head 268,320 vertices, two instances (about one million vertex invocations before culling). Generation occurs only on a seed change; CPU cold-generation latency remains a risk. Full-resolution halo/pool overdraw is the main GPU cost.

ANGLE Metal / Apple M3 Pro, native synchronous whole-frame throughput including post, shared GPU, milliseconds (not venue cadence):

| State      | 1080p p50 / p95 | 4K p50 / p95 | ABBA 1080p p50 main → final | ABBA 4K p50 main → final |
| ---------- | --------------- | ------------ | --------------------------- | ------------------------ |
| Understory | 4.1 / 4.7       | 9.5 / 10.3   | 2.9 → 4.1 (+41%)            | 5.9 → 10.2 (+73%)        |
| Tide       | 7.4 / 11.1      | 9.8 / 10.4   | 2.7 → 4.0 (+48%)            | 5.6 → 9.0 (+61%)         |
| City       | 4.4 / 14.8      | 11.1 / 12.3  | 2.8 → 4.2 (+50%)            | 6.0 → 10.1 (+68%)        |

Both absolute p50 budgets pass. Pair probes correctly return nonzero for a regression over 5%; the new geometry costs +1.2–1.4 ms at 1080p and +3.4–4.3 ms at 4K versus the simpler old terrain.

Verification in `.claude/worktrees/mycelium-r3/artifacts/`:

- `npm test`: **962 pass, 21 opt-in skips, 0 failures**. Includes family CPU determinism, shortest-path optimality, cycle rank, Murray flow, finite mesh, camera clearance, continuous development, preset validation, slot-3 style/spacing and Gray–Scott survival.
- Explicit world-rhythm, pipeline-flash and family tests: **51/51 pass**.
- Typecheck and native-GPU DE/EN i18n: pass. Build: pass. Family files pass Prettier; shared registries retain existing main formatting to keep merges narrow.
- `scripts/verify-mycelium.mjs --rig --port 48460`: **25 frames pass**, all state energies 0.1/0.5/0.9, five extra looks, three portrait states, three 43,200-second states and reversal. Zero GL errors, non-finite uploads or non-finite float-target pixels. Mesh identity persists through reversal. Limiter enabled throughout.
- Three film iterations: `look-review/mycelium-r3-round{1,2,3}/`; final film/sheets/grids: `look-review/mycelium-r3/`; three palette films: `look-review/mycelium-r3-palettes/`; reverse film: `look-review/mycelium-r3-reversal/`.

## Remaining weaknesses

Self-assessed look **7.5/10**, not independent acceptance. The fungus is now legible and has an actual travelling signature, but near caps remain slightly faceted and umbrella-like, Understory is wire-like on small screens, portrait has generous dark headroom, and diffuse spores are subtle. Gills read most strongly above eye level. No true depth of field. Catalogue images still need L0's rebake after integration; this lane does not touch `catalog-previews.mjs`.
