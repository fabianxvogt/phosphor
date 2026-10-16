# Living Mycelium

**EXPLORATORY / EMPIRICAL**, reworked 2026-10-16 (world-polish lane). The `mycelium` family (number 99) is the continuous world **Living Mycelium**. It is artistic biology, not a calibrated fungal model. The earlier Gray–Scott terrain (2026-10-14/15) is described in git history.

## Algorithm and signature detail

[mycelium-network.mjs](../../mycelium-network.mjs) grows one seeded network on the CPU in `geometry.create(seed)`, on a 2.4 m periodic forest floor:

- **Tip growth.** Hyphal tips extend by about 6 mm per step. Their heading is a correlated random walk (slow meandering arcs) with negative autotropism (they turn away from other hyphae within 1.7 cm) and an outward colony bias. Branching is lateral (order-dependent probability), plus apical dichotomy at the fringe. Eight colonies each start from a germination disc beside the camera line. Surface hyphae drape over the leaves and twigs, and about a quarter run 3–15 mm below the soil surface.
- **Anastomosis.** A tip that comes within 6.5 mm of a different lineage at a similar height fuses and stops. This closes loops (about 2.5k fusions per seed; the cycle rank is tested).
- **Geodesic transport.** Multi-source Dijkstra over the looped graph gives each vertex its shortest-path distance to the colonies (and to three single colonies, for the rhythm wave).
- **Murray-law cords.** Mushroom sites and free tips draw demand. The flow is routed back along the shortest-path tree, and the cord radius is r = 1.1 mm · Q^{1/3}, so r³ is conserved at every junction of the transport tree (tested).
- **Fruiting.** Clusters rise from one base at cord ends beside the camera line. Each cluster mixes five cap forms (conical, bell, umbonate, convex, small bell). Every mushroom passes a CPU clearance test against the camera over development 1–2, both cap scales and the altitude range of the looks.

The signature detail is the **nutrient pulses**. They are trains with a soft head and a trailing streak, travelling along the geodesic distance. They split at every branch and cancel where two fronts meet in a loop (the cut locus of the metric). In the top state they arrive at the cord ends, and the caps flare.

The Gray–Scott field still runs unchanged (acid's step, chemistry band, spore rain, continuity `gray-scott-uv16-v1`). It is now the living **substrate**: it modulates thread activity and the faint soil glow, and the `feed` gesture injects into it.

## Rendering

Everything is one mesh with a fixed opaque head plus an additive tail. Instancing ×2 draws threads (instance 0) and their light pools on the soil (instance 1). There is no engine change.

- **Threads** are polyline strips with shared averaged tangents, so joints have no beads. Width is max(true radius, 0.78 px × resolution scale) with coverage-scaled intensity. Each thread has a soft halo. Cords show braided strands with flowing streaks along the arc length. Young hyphae carry fine slanted side hairs (the fuzzy margin), faded before they alias. Tips glow at the moving growth front. Threads below the surface are attenuated through the soil and shift toward secondary.
- **Mushrooms** have a translucent cap: a dim thick crown, a glowing thin margin and radial striations. The gills from below are the brightest structure. Stems are slender and translucent. Caps tilt slightly back toward the camera line. Lantern glow sprites and spore streams fall from the gills.
- **Litter.** Dark leaves glow faintly through the lamina where hyphae run beneath and have a network-lit rim. Bark twigs are lit from below.
- **Backdrop.** The soil plane has a crumb texture and a faint substrate glow. A ground mist band at the horizon is lit by the network. Faint trunks and moonbeams show at the top state.
- **Wrap.** Every primitive wraps to the copy nearest the camera by its own centre (segment midpoint or object centre). Fog closes by 1.14 m, inside the 1.2 m seam, and culling is per segment, so there are no stretched triangles.

## Development (one key, no reset)

| State        | Picture                                                                                                 | Camera                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 0 Understory | Growth fronts at 56 % of the growth keys: runner hyphae and young fans, fine laterals dim, tips glowing | 15 cm high, 27° down; the floor fills about 90 %            |
| 1 Tide       | The whole looped web, cords swelling, several pulse trains                                              | about 9.5 cm, 16° down; the horizon becomes a lit mist band |
| 2 City       | Fine hyphae pruned, bright cords converging on stems, mushroom grove with gills overhead, spores        | 4.6 cm, level                                               |

The camera height and pitch are nearly linear in development (`crane = 0.7d + 0.3d²` with d = dev/2). A one-bar 0 → 2 drop therefore cranes at about 14°/s on average and about 19°/s at most. There is no state spring.

## Looks

The world states are Hyphal Understory, Tidal Lamellae and Lantern City (seed 211). Extra looks: Spore Floor (101, low skim at 0.35, spore-floor morphology), Night Membrane (149, felt morphology at 1), Tide Turning (41, high oblique at 1.5, fan morphology), Street Plan (18, high camera at 2, cord morphology, small caps) and Bloom Quarter (73, cluster morphology at 1.8, large caps). Schema keys are unchanged. The labels are now Pulse and flight speed, Substrate feed, Mycelium morphology, Fruiting body scale and Cord hierarchy.

## Energy, rhythm, clocks

- **Energy changes structure, not gain.** It adds a second and third pulse train (λ = ½ and ⅓ m), shortens the tails, adds foraging amplitude and rate to the childless fine laterals, raises spore density and speeds the camera up to about 1.7×. Base thread intensity scales by 1.25 → 0.8, so mean frame brightness stays put: 10.4 → 11.1 (Understory), 18.1 → 18.8 (Tide) and 23.5 → 20.9 (City) from energy 0.1 to 0.9.
- **Clocks:** camera laps (period 1), pulse metres (period 1, so λ ∈ {1, ½, ⅓}), cord streaming, foraging phase (2π).
- **Rhythm (ids, slots and periods unchanged):**
  - x `reaction-front`: hyphal tip flare plus a glint running back down each thread.
  - y `chemical-band`: a nutrient wave from colony `count mod 3` across the whole network, over 4 beats.
  - z `feed`: the bounded Gray–Scott feed (simulation), plus a spore puff from cluster `count mod 15`.

## Cost and verification

- **GPU.** About 360k vertices (thread vertices run twice for the pools); the mesh is about 35 MB and is rebuilt only on a seed change. Interleaved pair against `main` on a heavily shared GPU (load average 115–270):
  - 1080p p50 3.7 / 3.7 / 4.0 ms against 2.9 / 2.9 / 3.1 ms.
  - 4K p50 14.6 / 11.5 / 14.0 ms against 7.5 / 7.4 / 7.7 ms.
  - The quiet-GPU estimate is about 10–12.5 ms at 4K. The standalone probes on the same machine are contention-dominated and are not quoted.
- **CPU.** Growth + Dijkstra + mesh in Chrome takes about 80–120 ms per new seed (`scripts/mycelium-gen-timing.mjs`). The hot loops are small top-level functions, because one giant function compiled too slowly and ran unoptimised.
- **Tests** in `tests/mycelium.test.mjs`:
  - determinism and development independence
  - positive cycle rank (anastomosis)
  - Bellman optimality of the pulse distances on every edge
  - Murray r³ conservation at junctions
  - camera clearance for all mushrooms of all six look seeds
  - mesh layout and finiteness
  - rhythm ids and simulation contract
  - Gray–Scott chemistry clamps, survival under state jumps, and the HISTORY upgrade
- **Stills.** `scripts/mycelium-stills.mjs` renders stills and scans the float target for NaN, Inf and negative values. The rework fixed a 0·Inf NaN (rhythm wave) and NaN normals at cap apices.

## Known limits

- There is no true depth of field (an engine feature). Near leaves are only darkened.
- The fuzzy margin is a shader texture, not geometry.
- Gills read well only on caps above the eye line.
- The 4K pair delta is about +4–7 ms; the main costs are halo/pool fill and glow sprites.
- Catalogue previews need a rebake (L0).
