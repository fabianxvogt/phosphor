# Density Waves · Spiral Nebula / Spiralnebel

Family **87**, renderer/world ID **`nebula`**. Continuous **Dust → Spiral → Nova**. A bounded volumetric raymarch carries the unresolved gas; one persistent seed-derived particle population carries resolved stars, tracers, ejecta and near-field motes. This is astronomical choreography, not hydrodynamics or an N-body solver.

## Round 3 — Starfront (2026-10-16, openai-codex/gpt-6.1-sol)

The independent baseline was L5 / G2 / E2.5, overall4. The fresh before capture reproduced its diagram-like Dust and soft radial Nova. Three look film iterations plus an early M4 capture are in `artifacts/look-review/nebula-r3-{before,m4,look1,look2,look3}`. Final reviewer evidence is `artifacts/look-review/nebula-r3/`.

- **Dust:** break the particle-line intensity into seeded clumps, add small static transverse deviations, feather the sheath and lower its uniform core. Filaments now use a primary/secondary mixture rather than predominantly white-green wires. The diffuse volume also carries some secondary colour. Same graph, nodes and tracer identities.
- **Spiral:** stronger cloud contrast breaks up the continuous arm outline; hot cores are a secondary-to-white ramp. Existing cold extinction lanes remain.
- **Nova:** finer ridged directional turbulence, less empty directional masking, larger torn-radius variation and oblique curvature through the shell thickness replace radial brush strokes with curved ejecta veils. Front/back palette weighting adds depth; lower particle and interior-haze weights reveal the gas filaments. These are illustrative ejecta, not a hydrodynamics claim.
- **Energy:** fixed tracer cohorts and camera spring remain unchanged. More/thicker directional ridges appear at high energy (ridge exponent32→20), and the established knot/mote/speed controls still apply. Development continues to wind the same web into arms and collapse into the same remnant. No state/preset/schema/seed changes, so no world HISTORY migration.
- **Slot3 Starfront / Sternenfront:** an asymmetric outward flare lights **existing matter only**, in particles and volume. `u_rhythm.w` sets travel and envelope, `.w` count addresses successive sectors by the golden angle, and `.w` hit adds a small bounded local ignition. No full-screen quad, camera impulse, new clock or development-locked event. Existing shock ripple is wider/stronger, and arm-light has a denser authored local pattern.

Three presets keep their names. Zero-indexed signature steps (not sixteenth-normalized):

| Style      | Name           | Starfront loop         | Signature steps | All four tracks, hits/bar |
| ---------- | -------------- | ---------------------- | --------------- | ------------------------- |
| restrained | Distant embers | 32 eighths / 4 bars    | 11,29           | 2.5                       |
| driving    | Spiral beacon  | 32 sixteenths / 2 bars | 0,12,19,28      | 8.0                       |
| accented   | Pulsar crown   | 32 sixteenths / 2 bars | 0,5,11,16,21,28 | 13.0                      |

All gesture envelopes finish before the next hit. Structural shock stays sparse; local light fills the grid.

### Cost and verification

Same 512×256 particle population and scalar RGBA16F atlas. Dust/disk retain the original 24/10 step caps; Nova uses36/18 at1080p/4K. The shared `u_raySteps` governor scales the cap (96→64→40); no engine or limiter changes.

Native ANGLE Metal / M3 Pro, concurrent fleet load; milliseconds p50/p95, state order Dust / Spiral / Nova:

| Probe                         | Dust      | Spiral    | Nova      |
| ----------------------------- | --------- | --------- | --------- |
| stock1080p                    | 5.8/13.0  | 7.0/10.9  | 9.9/13.2  |
| stock4K                       | 13.0/20.4 | 10.0/15.9 | 16.9/22.0 |
| paired1080p final             | 5.6/7.8   | 4.2/8.0   | 5.9/7.2   |
| paired1080p p50 delta vs main | +5.7%     | +10.5%    | +31.1%    |
| paired4K final                | 11.6/26.3 | 8.8/9.5   | 12.6/16.0 |
| paired4K p50 delta vs main    | +3.6%     | 0.0%      | +40.0%    |

The stock Nova budget is exceeded under contention; paired final medians meet8/16ms but its extra detail genuinely costs31–40%. The paired harness exits1 for regressions above5%; this is a reported cost increase, not a clean performance pass. Raw reports: `artifacts/nebula-r3/final-{perf,pair}-{1080,4k}/profile.json`. The CLI uses `--families` (the brief's singular `--family` is not supported).

Verification: full suite986 pass /21 opt-in skipped /0 fail; typecheck, build, native DE/EN i18n and owned code/docs Prettier pass;19 family tests include preset/continuity/slot3/density/spacing; world-rhythm and flash tests pass. `scripts/verify-nebula.mjs --rig --port <lane-port>` verifies27 palette×state×energy cases (Glacier/Ember/Arctic,0.1/0.5/0.9), seven low-energy portrait looks, reversal and a quantised12h metadata-clock sample. No GL errors or non-finite uploads. Minimum lit fraction across the27 landscape cases is above2.5%; no black frames. The late sample is not a12h soak.

Limiter-enabled native1080p RAF smoke:240 frames, p50/p9516.7/16.8ms, no exemption, zero errors,17 allocated/live textures. Film evidence uses the repository's deterministic capture harness and is **not** live photosensitivity certification.

**Still weak:** Dust retains some schematic graph structure; Nova can read as a feathered shell rather than tangled Crab gas; static raymarch grain is visible in close/portrait views. Self-assessed look6.5/10, not an independent acceptance claim.

## Polish round 2026-10-16 (wave 6)

Wave 5 was judged ~7/10 by L0, and ~6/10 by this lane's own review. Its gas was 2D value noise read at one point in a flattened slab, so Dust looked like cotton and Nova like a flat camouflage ring. The ignition was invisible, energy barely changed the picture and every palette collapsed to one colour. This round replaced the radiance and the camera. The algorithms, presets, seeds, state names and look IDs are unchanged.

- **Volume:** a jittered front-to-back march (emission + absorption) over the union of tight analytic bounds: a cloud ellipsoid, then a thin disk slab, then the shell layers. The jitter changes every frame, so it reads as fine film grain rather than a fixed screen pattern.
- **Dust is the real Zel'dovich web.** Each frame, a data atlas evaluates the 16-mode potential at 96×48×96 points of the cloud frame. It applies one fixed-point inversion `q = x − D·S(x)`, then takes the eigenvalues of the deformation `I + D·∂S/∂q`. One eigenvalue near zero is a pancake, two are a filament and three are a node, and filaments carry the light. A second channel holds two-phase flow noise advected along `S`, so matter visibly **streams along the filaments into the nodes**. Tracer particles also stream along `S` over their own 20 s cycle and are dark where the cycle wraps.
- **Identity:** every potential mode has phase π, so all modes crest at the origin. The **densest node is the seeded centre** for any breathing of the amplitudes (`S(0) = 0`, linear overdensity maximal there). It is the Dust nucleus, the galaxy bulge and the Nova pulsar.
- **Morph 0→1:** the web is sampled at its pre-image. That pre-image is wound by up to 2.4 rad (inner gas turns more), contracted by 1.2 and flattened ×10, so filaments are wound into the disk. This is geometry, not a dissolve.
- **Spiral:** a precomputed 512² disk map in the plane holds four channels: arm crest, clumpy arm light with spurs and fine star-cloud grain, lane optical depth, and HII knots. Arms follow the pattern speed and their texture rides with the gas. Exact sech² columns are integrated per step: disk h = .022 + .018 r, and HII knots sit in a thinner .012 layer. The cold lanes on the concave side stop emitting and hide what is behind them; diffuse midplane dust gives Edge-on Lanes its dark lane. The **bulge is an analytic, path-integrated Gaussian** split at the disk plane: the far half is seen through the lanes.
- **Nova:** filaments live on the **sphere of directions**, in a 512² octahedral map recomputed each frame. Ridged 3D gradient noise is evaluated at the unit direction, so there are no projection streaks or lattice facets, and the same fingers ride outward with the shell. The map's four channels are finger strength, a second ridge for hot cores, patchiness, and a smooth breathing corrugation of the radius. The shell is a thin, limb-brightened layer with radial Rayleigh–Taylor fingers inside it, ejecta pulses running out along the fingers (4 s), an accent forward-shock rim, and a slow 720 s turn. Only the filament layers are marched. The interior synchrotron haze and the Sedov–Taylor fronts `R = R0·c^(2/5)` are path-integrated analytically, so the fronts stay inside the shell.
- **No development-locked flash.** Ignition is a steady structural state. The bulge collapses toward a compact white-hot core as `smoothstep(0, .3, n)`, and the shell grows as `R = 1.55·(.1 + .9 n)` with **bipolar breakout lobes** `(1 + .6(1 − smoothstep(.3, 1, n))·d_y²)` that punch out of the disk and round into a sphere. Holding development at 1.25 gives a steady frame, and reversal never re-fires anything. Real flashes come only from the Core flare gesture, behind the shared limiter.
- **Camera as a journey:** a 144 s orbit, a 60 s crane and a 96 s off-centre look-at drift. Each state has its own distance (3.0 / 2.6 / 4.0), elevation (.32 / .72 / .44), crane depth and offset. In Spiral the crane dips to about 2.0 at .42 rad, so the near arms sweep under the lens. The camera follows a **spring-smoothed development** stored in state texels 1–2 (ω = 1.4/s, |v| ≤ .45/s), so a one-bar drop never lurches. Distance never falls below 2.0, keeping the camera outside the disk and the web's core.
- **Depth:** 1,536 near-field motes (an eighth of the dormant rows) form soft gas wisps and defocused star discs in a shell between the orbit and the form. Only those within about 3 units of the camera draw, so they pass with real parallax. The distant star field, per-star dust extinction and depth fog remain. Stars whose sight line passes behind the bulge or hot core are veiled, so they never shine through it.
- **Palette:** primary = gas (web filaments, inter-arm glow, shell limb); secondary = young stars and arms, Nova filaments; primary→white = hot cores, bulge, pulsar; accent only for HII knots, the pulsar jets and the forward-shock rim. Warm (Ember) and cold (Glacier, Arctic) palettes both read as intentional.

## Round 2 after L0 review (2026-10-16)

L0 scored round 1 about 6.5/10. Dust read as a strip of scribbled sticks, the 0→1 morph as two pictures stacked, and Nova as a glass soap bubble with a straight line through it. Changes:

- **Analytic filament web.** There are 36 seeded nodes; node 0 is the nucleus at the origin. Each node links to its nearest heavier node, giving a tree that drains into the nucleus (`webGraph`), and to its nearest other node that is neither its parent nor its child (loops). The simulation writes the links into spare state texels (x = 129 + 8i, last row). Each of the 70 edges is a cubic Bézier with two seeded control points, so filaments curve, often in an S.
- **Filaments as particle line sprites.** The 7/8 of the dormant rows not used by motes draw 150 soft sprites per edge plus the 35 nodes, about 10.5k points. Each sprite has a core, a gas sheath at 8× the core width, a pixel floor, and a core that never narrows below the sprite spacing, so near filaments don't bead. Fog falls off with depth. Pulses run along each filament into its node, and the tracer particles stream along the same edges. An earlier per-pixel fragment loop over all edges cost about 15 ms at 1080p and was replaced.
- **The grid now carries only the diffuse sheets** between the filaments, at low weight.
- **Winding morph.** `webMorph` turns the inner web furthest, by up to `6e^(−0.8r) + 0.3` rad. The sense is the arms' sense (θ grows outward), and the web contracts by 0.62 and flattens. Each child end retracts toward its node while the filament colour shifts to the arm colour, so the web visibly winds up into the disk. The disk fades in over p = 0.15…0.85, and the filaments fade out over p = 0.35…1.
- **Nova remnant.** The edge is thick and torn: its radius wanders with the direction map, and patches and holes break it up. The radial Rayleigh–Taylor fingers are in the secondary colour with accent knots and drift outward slowly. A mild bipolar elongation (0.22) persists at the top state. The interior synchrotron glow is in the primary colour (σ = 0.62 R). The pulsar jet is short and soft, about 0.13 R; jet stars only travel 0.39. The fresnel rim and the long line are gone, and the analytic Sedov–Taylor front is now faint.
- **Spiral framing:** distance 2.3, elevation 0.9.
- **Camera spring:** ω = 1.2/s, |v| ≤ 0.25/s. A test holds the view turn under ¼ short side per second and the dolly under 0.4 per second for 0→1, 1→2 and 2→0 at 1.5× motion speed.
- **Jitter:** static interleaved-gradient jitter replaces the per-frame jitter, so there is no temporal shimmer on LED walls.

## Energy grammar

Energy changes structure, not overall brightness:

- **Tracers:** energy draws a growing cohort of the fixed population, 1/16 → 1/8 → 1/4. ψ is integrated for the whole quarter, and per-star light is normalised.
- **Dust:** filament sharpness (fibre contrast and hot cores) rises with energy.
- **Spiral:** the HII-knot threshold falls, so more knots light.
- **Nova:** the finger ridge exponent drops from 24 to 13, giving more and thicker filaments.
- **Motes:** the near-field mote density rises.
- **Speed:** motion speed (×0.6–1.5) and web growth (×0.85–1.15) follow the existing energy curves.

## Rhythm

- **Arm light (4 beats):** a pulse runs outward along the arm crests, the web filaments or the remnant fingers.
- **Core flare (8):** the bulge, nucleus, pulsar and jets flare.
- **Shock ripple (16):** a ring of light runs out through whatever matter is present: through the web, a Cartwheel-like ring through the disk, or through the shell.

## Looks

The world states share seed **3141** and identical non-development parameters: **Drifting Dust**, **Grand Spiral**, **Supernova Shell**. Extra looks were re-authored for the new camera:

- **Cosmic Web** (1618): a wide view from above (distance .95, height .8, speed 1.2).
- **Edge-on Lanes** (2718): a close edge-on view (distance .8), with the bulge rising over a dark midplane lane.
- **Open Whirlpool** (577): unchanged.
- **Remnant Bloom** (4669): a close, immersive remnant (distance .82).

`worlds.mjs` is unchanged; no HISTORY entry is needed. Catalog previews of the three re-authored looks need L0's rebake; `tests/catalog-palette.test.mjs` flags them until then.

## Data atlas and cost

The optional `precompute` is a **1296×588 RGBA16F, linearly filtered** atlas of scalar fields, never a colour image:

- web slices: 48 × (98×98), r = filament density, g = streaming fibres; computed only while Dust is visible, with empty corners and voids skipped;
- the octahedral remnant map in the same region while Nova is visible;
- the disk map to the right, while the disk is visible.

The simulation writes the 16-mode table (k, breathing amplitude) as exact float bits into spare texels of the last state row. The atlas, particles and fallback read it, so no shader re-hashes the modes. Every lookup has a direct analytic fallback when float targets are missing.

Steps follow the bounded chord (step .08 at 1080p, .16 at 4K). Caps are 24/12, and the minimum is 8/5 in web and shell states or 2 for the disk slab. At 4K, four pixels share one 1080p pixel's footprint and average the jittered samples.

Native headless Chrome / ANGLE Metal / Apple M3 Pro. `profile-rework-pair.mjs --reference main` (ABBA, level .95) under fleet load:

| State  | 1080p main → final p50 (ratio) | 4K main → final p50 (ratio) | Stock `profile-families` p50 1080p / 4K |
| ------ | ------------------------------ | --------------------------- | --------------------------------------- |
| Dust   | 2.2 → **5.0 ms** (×2.27)       | 5.5 → **11.5 ms** (×2.09)   | 5.1 / 11.6 ms                           |
| Spiral | 2.0 → **3.9 ms** (×1.95)       | 5.0 → **8.8 ms** (×1.76)    | 4.2 / 9.2 ms                            |
| Nova   | 2.0 → **4.3 ms** (×2.15)       | 4.9 → **9.0 ms** (×1.84)    | 4.5 / 9.3 ms                            |

Round-2 numbers. The load average was about 33 during these runs, from four other lanes on the same GPU. On a quiet machine main measures about 1.9–2.0 ms at 1080p, so the ratios put the final at about 4–4.5 ms at 1080p and 10–11 ms at 4K. Targets were ≤ 5 ms at 1080p and ≤ 12 ms at 4K (16 ms ceiling). Optimisation steps, each A/B-measured against its predecessor:

- mode table in state texels (pair ×0.65–0.9);
- single read of the mode table per web texel;
- void early-out and 96-grid web atlas (Dust ×0.76);
- analytic bulge and slab-only disk march;
- analytic remnant interior with a skipped hole;
- corrugation stored in the direction map;
- chord-based step counts with 4K caps.

## Verification

- `tests/nebula.test.mjs`: **18/18 pass** (round 2 adds the filament graph, Bézier edges, winding sense and sprite budget). The suite keeps the gradient, ellipse/crowding, identity, development and time continuity, ψ reversal, Sedov–Taylor, jets and exact dust-column tests. New CPU references cover:
  - the nucleus/pulsar at the seeded node for any clock;
  - the spare-texel layout of the mode table and camera spring;
  - bipolar-to-spherical shell growth, and no `ignite` term anywhere;
  - spring settling without overshoot, with view turn under ¼ short side/s and dolly under ½ size/s through a one-bar drop at 1.5× speed;
  - a camera that stays outside web, disk and shell for every fader position;
  - tracer streaming that restarts only while dark;
  - atlas size, format and fallbacks.
- **Full suite:** `npm test` 913 pass, 21 skipped, 1 failure. The failure is the expected stale baked preview of the re-authored looks, which is L0's rebake. Typecheck passes; i18n smoke passes de/en on the native GPU.
- **Time:** `check-time-wrap.mjs --families nebula` finds no seams at 3600 s, 4096 s or 12 h.
- **Health:** every profile row reports glError, gpuErrors and nonFinite = 0.

## Honest limits

- Dust filaments are a seeded node graph (schematic), not the Zel'dovich caustics themselves; the caustic field survives only as the diffuse sheets.
- Static jitter shows as fine fixed grain in the diffuse gas.
- Nova's fingers are mostly radial; it reads as a remnant, but it is less tangled than the Crab.
- The 4K budget is tight under fleet load.
