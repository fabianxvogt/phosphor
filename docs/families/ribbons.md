# Attractor Ribbons (97)

World `attractor-ribbons` · `scene-ribbons.mjs` · `ribbons-geometry.mjs`.

192 seeded trajectories are integrated simultaneously in three chaotic flows.
Development carries each ribbon from its Lorenz butterfly, through its Aizawa
vortex, into its Thomas labyrinth. The paths remain exact fixed-step RK4
histories; intermediate development is a geometric interpolation between two
histories, not a new differential equation. No engine change.

## Algorithm and identity

A 224 × 1153 RGBA8 simulation stores 224 samples per trajectory per flow. Two
texels encode each sample's x/y/z and escape generation as 16-bit fractions.
Each sample advances two RK4 substeps: Lorenz h=.005, Aizawa h=.015,
Thomas h=.08. Constants and canonical frames come from the tested attractor
reference. Thomas uses b=.09 (a chaotic labyrinth rather than the compact
b=.1914 knot), box ±11 and scale 1/7. CPU tests verify positive finite-time
Lyapunov exponents and bounded quantized histories.

A 24-bit accumulator shifts histories at whole sample boundaries; vertices
interpolate the fraction between them. Flow, camera and continuous pulse phases
are integrated in simulation texels, not products of late scene time. Reset
warms every history sample immediately. An escaped head respawns with a new
generation; segments spanning generations are suppressed.

Ranks, ribbon ownership and three histories are independent of development.
Morphing and reversal neither reseed nor reset simulation. The mesh retains
128 rendered segments per ribbon and all 224 exact history samples.

## States and looks

- **Wings (0):** Lorenz's recognisable two-lobed butterfly; maximum population
  42%. A broad-side camera sway avoids an edge-on collapse.
- **Vortex (1):** Aizawa's spiral shell and axial tube; maximum population 68%.
- **Labyrinth (2):** Thomas's overlapping loops and long spatial excursions;
  maximum population 88%, with stronger depth falloff.

The eight unchanged looks/seeds are Butterfly Wings / Aizawa Vortex / Thomas
Labyrinth (9701), Long Exposure (9702), Vortex from Below (9703), Labyrinth Rush
(9704), Unfolding Wings (9705), Slow Labyrinth (9706). World state parameters
still differ only in development. Schema, state names and rhythm IDs are stable.

## Round-3 look grammar (2026-10-16)

Four filmed refinement rounds replaced similarly weighted plastic tubes with
broad satin-band impostors against fine tracers. Width follows rank to the fifth
power; longitudinal optical twist and folded margins carry a moving key without
turning every strip into a uniformly glowing outline. The projected band remains
camera-facing: rotating its physical width into depth caused interpenetrating
Aizawa ribbons and was rejected after the palette/aspect review. A stable
rank-based depth bias reduces co-surface fighting. Palette mids carry the body;
white is restricted to small highlights and hot event cores.

Camera focal length is now 2.46 → 2.24 → 1.78, with a slightly lower peak target.
This gives Wings/Vortex more short-side fill without enlarging the Thomas
excursions into the frame border. The orbit remains integrated and continuous;
distance and eye clearance are unchanged. Portrait/square lens relief is
12% in Wings/Vortex and up to 24% in Labyrinth, avoiding a clipped square loop.
Kick focal punch stays bounded at 2.2%. Distance fog, occlusion and a few broad
foreground bands give scale against dim far traces. The background is a faint
palette atmosphere, not an invented non-attractor environment.

Energy changes population by ×(.65+.35×level), width by ×(.65+.5×level), flow
speed ×.55→×1.5, length ±.15, orbit ×.6→×1.6 and pulse density ±.2. It is not a
brightness control. Low energy retains enough paths to identify every flow.

## Four rhythm gestures

1. **Ribbon cohort** (`ribbon-cohort`, slot 0): one in four whole ribbons gets
   a saturated primary-light accent. Sparse count-selected cohort changes.
2. **Flow run** (`flow-run`, slot 1): broad local bands of light follow the
   ribbon's own history coordinate; independent five/six-beat figures.
3. **Head sparks** (`head-sparks`, slot 2): leading tips flare locally in fills;
   the tip region is longer and stronger than before.
4. **Ribbon relay / Bandstaffel** (`ribbon-relay`, slot 3): a hot packet races
   from tail to head through one of three ribbon bundles. A saturated trailing
   wake and local 32% width swell make direction legible. The first hit is
   latched once using `u_rhythmHit.w`; strength reads `u_rhythm.w`, bundle
   selection reads `u_rhythmCount.w`. Spare global texels 4–6 store age,
   strength and bundle. Age advances once per fixed simulation tick over .75 s,
   independently of energy, transport speed and subsequent envelope decay.
   The packet fades completely; no trajectory is relaunched or displaced.

Named presets (unchanged):

| Preset          | Relay placement                                 | Total family hits/bar |
| --------------- | ----------------------------------------------- | --------------------: |
| Loose strands   | eighth steps 5 and 23 of a four-bar loop        |                   3.0 |
| Braided current | eighth steps 1 and 12 of a two-bar loop         |                   6.7 |
| Attractor weave | sixteenth steps 1, 13, 20, 27 of a two-bar loop |                  11.3 |

Bright effects stay on small trajectory regions; no full-frame flash or shared
limiter modification. DE/EN strings are placed beside the existing ribbon keys.

## Cost and verification

Native M3 Pro synchronous whole-frame probes, 36 measured frames/state:
1080p states 0/1/2 p50 **3.9/5.0/2.2 ms**, p95 **5.6/7.4/7.1 ms**;
4K p50 **5.0/5.2/5.0 ms**, p95 **5.6/5.6/5.5 ms**. Fleet contention
inflated the 1080p run (an earlier run was 1.8–2.1 ms p50). Interleaved ABBA
against main: 1080p p50 ratios **1.00/1.00/.95**, 4K **1.00/1.021/1.00**.
These are throughput probes, not venue-cadence acceptance.
Simulation size, integration work and 147,456-vertex mesh are unchanged. A seed
change still does a one-time full-history warm-up.

`tests/ribbons.test.mjs` covers flow constants, quantized bounds, chaos,
continuous/reversible development, camera clearance, energy population,
orthonormal optical frames, deterministic geometry, preset/world validation,
slot-3 presence, three distinct authored loops, grid density and bounded
monotone relay travel. `scripts/verify-ribbons.mjs` checks 45 combinations of
three palettes × five development positions × three energies at 43,200 s,
a live reversal without a slot reset, actual RGBA8 single-hit relay readback,
portrait/square states and a 4K still. Zero GL/non-finite errors.

Evidence is under `artifacts/look-review/attractor-ribbons-r3/` (final film,
12-still sheet, 24-frame rhythm strip, grids) and
`artifacts/ribbons-verification/` (tests, palette ladders, aspect/4K, profiles).

## Remaining limits

The attractor remains an isolated mathematical sculpture, not a fly-through
landscape. Thomas can still look like a compact knot during some phases; dense
Aizawa bands can merge at reduced review resolution and overlapping impostor
edges can show fine jagged occlusion at close inspection. Optical ribbon normals
are impostors, not physically simulated cloth. Chaotic GPU/CPU paths diverge
after a few Lyapunov times; only their statistics should match. Box quantization
introduces approximately 1e-4 relative error per sample.
