# Magma Rift · Magmariss

**EXPLORATORY / EMPIRICAL**, worlds wave 4 (2026-10-15), reworked in wave 5 and in the world-polish lane (2026-10-16). Family `magma`, number **104**, world `magma-rift`.

## Algorithm and signature

A continuous volcanic field. One seed-only **drainage tree** decides which seams of a Voronoi basalt crust glow, widen into braided lava rivers and lead to the vent. The vent then founders into a crusted lava lake that erupts. The signature is the exact Voronoi seams, the tree's heat front, and the exact ballistics of spray and bombs.

- **Plates:** seeded sites jitter within `[0.1, 0.9]²` of their lattice cell. A cached 3×3 search finds the nearest site, then the minimum bisector distance `dot((a+b)/2, b-a)/length(b-a)`. This is the exact seam distance, not the F2−F1 approximation. Tests compare 60,000 probes against a 7×7 search. Sites, tilt and plate height never depend on development.
- **Drainage tree:** three meandering trunks leave the vent, and each throws two distributaries downstream. Curve k runs from origin `o` along unit `d` with meander `L(s) = A(sin(ws+p) − sin p + 0.35(sin(2.3ws+q) − sin q))`. Because `L(0) = 0`, every trunk starts at the vent and every branch starts on its trunk (CPU-tested). The distance is `|n − L(s)|/√(1+L'²)`, and the distance to the origin applies before `s = 0`. The tree yields a channel profile and an arrival coordinate (0 at the vent).
- **Seams:** seam half-width is a continuous field: `w = wScale (0.22 + 3 R) (0.3 + 1.4 v²)` with `wScale = 0.03 + 0.056·split + 0.03·…`. `R` is the tree profile and `v` a per-corner variation, both bilinear over the lattice corners the 3×3 search already fetched. The tree therefore only *selects plate seams*; rivers are braided seams one or two plates wide. Nothing is drawn on top of the plates.
- **Crust field and heat front:** every seam has one temperature, taken from both plates' cell data (tree profile and arrival at their lattice corners), so it is symmetric and constant along the seam: no half-hot stubs. Most seams are dull dark-red hairlines with a skewed hash distribution; some are warm, and a few lone seams breathe hot (more with energy). Crack widths vary per lattice corner (0.3–1.7×). Heat soaks softly into the slab beside a crack and reaches zero before the plate's medial axis, so there are no wedge seams. Seed-anchored thin-crust patches let a dull glow through from below. The tree's seams are hot behind `front = mix(0.56, 1.45, smoothstep(0, 0.95, dev)) + 0.14·energy` (arrival units). The front is a pure monotone function of development: forward, cracks spread out from the vent; back, the glow retreats inward and the seams narrow and darken.
- **Terrain/march:** shield, caldera wall and slabs. An exact analytic start skips the empty slab above `FIELD_TOP = 0.92` inside r < 19. A coarse Lipschitz march follows; its hit tolerance only places the start. Then up to five bracketed Newton steps solve the real slab/lava height (the governor budget lowers this to 4 or 3). Lake plates sink by site, as whole plates.
- **Lava:** two reseeded flow layers in each channel's own frame (along, across), cached per lattice corner, give skins that are long along the flow, with ropy folds, torn open by incandescent seams. A white-hot core runs along the tree's centreline and cools to deep red at the banks. Open channels spill a soft glow onto their banks and into the air above. A crack's bottom is its hottest part. Skins resolve only in channels several footprints wide (narrower ones use the skin/lava average); the crust's cracks skip the channel frame entirely.
- **Lake:** a slow rigid turn carries few, large black crust floes. One coarse, angular crack net (ridges of bilinear value noise) has widths that vary along each crack; the cracks open where the fountain pushes the floes apart, and a faint finer net of new cracks lies between them. Ripples run out from the fountain's foot. There is no second Voronoi search.
- **Fountain:** a white-hot molten root (40% of the height) tears apart into **spray**. The spray is four coaxial paraboloids `ρ² = r0² + c|y − yRef|`, which is the exact envelope of droplets leaving the crown with horizontal speed u (`Δy = gρ²/2u²`). Each paraboloid carries a lattice of motion-blurred streaks that rise (inner) or fall (outer umbrella). Their front and back sides give parallax.
- **Bombs:** 14 big bombs and 12 spray sparks fly exact parabolas `p0 + v0 t − ½gt²ŷ` (g = 7) with exact curved tails. Launch speed grows with the eruption. Big bombs end in a local landing flare (0.55 s) inside their precomputed bound, and every flare finishes before the next launch.
- **Ash:** a stem that spreads into an umbrella under the deck. It has 14 ray samples, a tightened per-ray chord, billow plus value-noise break-up, and light from below that also catches the umbrella's underside. A static interleaved-gradient offset hides banding without any temporal flicker.
- **Sky:** an ash deck lit from below, which rolls slowly, plus a haze band at the horizon and distance haze lit by the field. The top of frame stays dark, but not dead.

Colour is temperature on a blackbody-like curve in palette terms. The three palette colours are ordered by luminance and saturated (×1.35/1.25/1.1): near-black → deep dark colour (T 0.4) → saturated mid colour (0.78) → lightest colour (0.8–1.15) → at most 55% white above 1.22. With Ember this runs red → orange → cream, like real lava. With Phosphor it runs violet-blue → pink → lime, a deliberate palette-driven character change. Obsidian highlights take the secondary colour.

## Data pass and fallback

A **128×257 RGBA32F** pass runs each frame:

- **Row 0:** bomb and group bounds (texels 0–27), plus the nine tree curves (texels 96–122, three per curve).
- **Rows 1–128:** seed-only plate hash and tree profile/arrival at each lattice corner, for cells `[-64, 63]²`.
- **Rows 129–256:** the channel frame (offset across, distance along) at each corner.

This is data, not a reduced-resolution picture. Hosts without float targets evaluate the tree arithmetically, once per plate search (exact instead of bilinear), so that path is not bit-identical to the cached one.

## States and looks

World states share seed **10401** and all non-development parameters. IDs, names, seeds and preset values are unchanged in this pass.

| Development | State EN / DE | Form |
| --- | --- | --- |
| 0 | Crust / Kruste | Black glass and ropy plates; a hot fissure path along the tree near the vent; breathing seams, hairline cracks and glints |
| 1 | Rivers / Flüsse | The whole tree open: braided channels with streaming skins, hot centres and cooler distributaries |
| 2 | Eruption / Ausbruch | Foundered vent lake with floe crust; spray fountain, bombs with landing flares, ash umbrella lit from below |

Extra looks (unchanged parameters; each checked in stills): Black Glass (0.35, low obsidian view), Ember Delta (1.3, high view of the tree), Night Fountain (2, force 1.4, low), Ash Column (1.75, young eruption), Rift Lattice (0.9, small plates, high view of the whole tree).

## Energy, music and camera

- Energy changes flow speed (×0.65–1.45), orbit speed (×0.75–1.4), how far the heat front reaches and how many lone seams glow, skin breakup, spray occupancy (0.32 → 0.8), big bombs (4 → 14), sparks (4 → 12) and embers. It is not a master brightness.
- **Seam pulse** (4 beats): a crack-propagation flash runs out along the hot tree. **Lava surge** (8 beats): a surge front travels down the channels and the skins thin. **Ejecta volley** (16 beats): the fountain bursts, spray and bombs flare, and a bounded under-light swell reaches the ash.
- Kick FOV punch 2%, roll ≤ 0.03 rad. Flares are local sprites; nothing flashes the full screen.
- Camera: endless orbit and a 16-bar crane. During the eruption the vent swings toward a third of the frame and the lens lengthens by 20%, so the fountain fills the frame. Radius and force-aware crane-back are as before.

## Endlessness

Three integrated clocks: orbit (2π), flow (16 cycles) and eruption (64 cycles). Every new use stays periodic: the spray lattices move by integer cells per eruption cycle (−26, 38), the lake ripples use `2·TAU·flow`, and the deck drift uses `TAU·flow/16`. `scripts/check-time-wrap.mjs --families magma` shows no seams at 3600, 4096 and 43,200 s, or at energy/nudge changes at 7200 s.

## Cost

- **Step budget:** magma reads the engine step budget (`u_raySteps`, which the governor lowers 96 → 64 → 40). It scales the coarse march limit, the Newton iterations (5/4/3) and the ash samples (14 → 8). Stills at budget 40 are nearly unchanged. However, the gain is small (0–6% at 4K): the cost is per-pixel shading, not step counts.
- **Measurement conditions:** native M3 Pro, ANGLE Metal. Five lanes shared the GPU and absolute numbers swung up to 2× between runs, so only interleaved ABBA pairs against `main` (`profile-rework-pair.mjs`, 64 frames per candidate) are meaningful.
- **Pair results, final build** (round 2 of this pass, final/main), interleaved ABBA, 64 frames per candidate. Two 1080p runs and one 4K run:

| State | 1080p | 4K |
| --- | --- | --- |
| Crust | 1.05 / 1.04 | 1.01 |
| Rivers | 0.97 / 0.98 | 0.94 |
| Eruption | 0.98 / 0.91 | 0.97 |

- **Earlier build** (674630f), absolute but contended (`profile-families.mjs`, 30 frames), p50 ms: 1080p 6.2 / 8.1 / 8.4, 4K 32.9 / 35.3 / 35.0. These numbers are inflated by the shared GPU.
- **How round 2 paid for its crust field:** the crust's cracks skip the channel frame, one noise was dropped from the subsurface patches, and the Newton cap returned to 5.

- **Where the savings came from:** the analytic slab skip, the looser coarse hit tolerance, the cached tree and channel frame (no per-step river trigonometry), 32 → 12 sparks, the tight ash chord, one ember per cell, and footprint LOD for skins and hairline cracks.
- **Where the extra cost went:** the drainage tree, spray paraboloids, glints and the floe lake.
- **4K:** at wave 4, uncontended 4K ran 17–23 ms on `main`. If the ratios hold, this build would run about 16.5–20 ms, but that was **not measured uncontended**. A 4K-safe path needs an engine render-scale for ray-marched worlds; this family does not reduce resolution itself.

## Verification

- `tests/magma.test.mjs` (21 tests): Voronoi exactness and continuity, identity under development, slab bound, exact ballistics and landing (including flares before relaunch and flare bounds), trail spheres, exact curved tails, camera clearance, clock periodicity (including spray speeds), molten-centre shortcut, tile addresses for both data tiles and the row-0 layout, conservative fountain-root, spray-paraboloid and ash bounds (including the paraboloid's ballistic identity), tree mirror (trunks at the vent, branches on their trunk, seed-only), monotone heat front and symmetric seam temperature, step-budget wiring, presets, world continuity and style limits.
- `npm test` (914 pass, 21 skipped), `npm run typecheck`, `node scripts/test-i18n.mjs --native-gpu`: pass.
- `scripts/verify-magma.mjs`: native stills at chosen development, energy, time, palette, aspect and step budget, with GL error, non-finite and black-frame checks. Default set: five developments × three energies, four palettes, portrait, 43,200 s; all pass with zero errors. Shader logs: `scripts/check-magma-compile.mjs`.
- Films (local, not committed), under `artifacts/films/final/`: `magma-rift`, `magma-rift-ember`, `magma-rift-glacier`, `magma-lava-fountain` (reversal 2 → 0), `magma-night-fountain-ember`. Before/after stills at identical times: `artifacts/compare/`. Ladder: `artifacts/contact/magma-ladder-final/`.

## History

- **Wave 4:** Voronoi crust, flow-layer lava, seven-jet curtain, ballistic ejecta; 1080p met budget, 4K did not.
- **Wave 5:** advected lake material; the jets became one dense molten column; exact curved tails; cached plate hashes. Rated 7.8/10 by the lane and about 7 by L0.
- **World polish (this pass), round 1:**
  - Phase 1 diagnosis, 5.5/10: a uniform neon honeycomb crust, starfish cos Kθ rivers with a pinch at the vent, a neon-tube fountain, a cross-hatched ash funnel, a dead upper third, and energy invisible in stills.
  - The polish replaced the river layout with the seam-selecting drainage tree and added the heat front. It replaced the polar flow material, the lake marbling, the tube, the ash and the sky as described above.
  - World and look definitions are unchanged, so there is no HISTORY entry.
- **World polish, round 2 (after L0 review, about 6.5 overall):**
  - Blackbody-like ramp in palette terms.
  - Crust became a living field: per-seam temperatures, varied widths, soft heat soak and subsurface patches.
  - River core-to-bank temperature profile and glow spill.
  - Fewer, larger lake floes with irregular cracks.

## Remaining limits

Stylised volcanism, not a fluid simulation:

- Spray droplets live on four surfaces, so the falling umbrella's outline can look like a cone.
- The tree path is still the brightest structure in the crust.
- Slab bevels can show faceted wedges.
- Thin groove walls show slight Newton stepping at close range.
- Distant distributaries cool to the dark colour.
- With Phosphor the lava is pink with lime cores.
- 4K has not been qualified within a 60 Hz single-family budget.
