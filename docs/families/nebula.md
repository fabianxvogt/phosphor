# Density Waves · Spiral Nebula / Spiralnebel

Family **87**, renderer/world ID **`nebula`**. Continuous **Dust → Spiral → Nova**. A bounded volumetric raymarch carries the unresolved gas; one persistent seed-derived particle population carries resolved stars, tracers, ejecta and near-field motes. This is astronomical choreography, not hydrodynamics or an N-body solver.

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

| State | 1080p main → final p50 (ratio) | 4K main → final p50 (ratio) | Stock `profile-families` p50 1080p / 4K |
| --- | --- | --- | --- |
| Dust | 2.5 → **5.4 ms** (×2.16) | 6.1 → **11.3 ms** (×1.85) | 5.0 / 11.6 ms |
| Spiral | 2.5 → **3.9 ms** (×1.56) | 5.6 → **10.0 ms** (×1.79) | 4.4 / 11.7 ms |
| Nova | 2.2 → **4.9 ms** (×2.23) | 5.9 → **11.2 ms** (×1.90) | 4.9 / 9.7 ms |

The load average was 65–90 during these runs, from four other lanes on the same GPU. On a quiet machine main measures about 1.9–2.0 ms at 1080p, so the ratios put the final at about 4–4.5 ms at 1080p and 10–11 ms at 4K. Targets were ≤ 5 ms at 1080p and ≤ 12 ms at 4K (16 ms ceiling). Optimisation steps, each A/B-measured against its predecessor:

- mode table in state texels (pair ×0.65–0.9);
- single read of the mode table per web texel;
- void early-out and 96-grid web atlas (Dust ×0.76);
- analytic bulge and slab-only disk march;
- analytic remnant interior with a skipped hole;
- corrugation stored in the direction map;
- chord-based step counts with 4K caps.

## Verification

- `tests/nebula.test.mjs`: **17/17 pass**. The suite keeps the gradient, ellipse/crowding, identity, development and time continuity, ψ reversal, Sedov–Taylor, jets and exact dust-column tests. New CPU references cover:
  - the nucleus/pulsar at the seeded node for any clock;
  - the spare-texel layout of the mode table and camera spring;
  - bipolar-to-spherical shell growth, and no `ignite` term anywhere;
  - spring settling without overshoot, with view turn under ¼ short side/s and dolly under ½ size/s through a one-bar drop at 1.5× speed;
  - a camera that stays outside web, disk and shell for every fader position;
  - tracer streaming that restarts only while dark;
  - atlas size, format and fallbacks.
- **Full suite:** `npm test` 912 pass, 21 skipped, 1 failure. The failure is the expected stale baked preview of the re-authored looks, which is L0's rebake. Typecheck passes; i18n smoke passes de/en on the native GPU.
- **Time:** `check-time-wrap.mjs --families nebula` finds no seams at 3600 s, 4096 s or 12 h.
- **Health:** every profile row reports glError, gpuErrors and nonFinite = 0.

## Honest limits

- Dust filaments are soft at 4K close-ups, limited by the 96×48×96 atlas.
- Jittered marching shows fine grain in stills; it averages in motion.
- Nova is a convincing remnant bubble, but its silhouette is still a smooth sphere-like shell.
- The 4K budget is tight under fleet load.
