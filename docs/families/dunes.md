# Dune Sea · Dünenmeer (#114)

One persistent night desert, `scene-dunes.mjs`, world `dune-sea`. Development is real terrain/camera/front geometry, not a dissolve. Ripples / Sandrippeln → Dunes / Dünen → Storm / Sturm keep seed **11401** and identical non-development parameters. No engine changes. All eight preset names, seeds, look IDs, schema keys and world state definitions remain unchanged in this revision.

## Mathematics and signature

The hero is wind-written sand: a low ripple field leading to distant dunes, sharp crescent brinks with downwind horns, persistent crossed star-dune arms, then the same landscape under a towering internally lit haboob and five rim-lit monoliths.

In the wind-aligned chart, `v = x/11`, crest `c = −3 + 13v²`, crest height `H = h·max(0,(1−v²)(1+.6v²))`, and `d = z−c`. The windward shoulder length is `L = 14−8v²`, height `H·max(0,1−(d/L)²)²`; the lee is `max(0,H−repose·d)`. Unlike a rounded hill, the horns extend beyond the empty centre of the lee, and their shoulders narrow independently. Site rotation and scale are seeded in the fixed staggered 28×32 m chart. The prevailing orientation is oblique to both the eye and key, exposing lit slip planes and cast shadows. Mature repose compensates for site scale, height and the 1.2× mature relief, retaining **34°**. Exact derivatives include the varying shoulder length, transformed star arms and compact cell support. The fourth surface component carries distance to the winning brink for antialiased crest light and wind streamers.

Ripples use `p = 8(.55x+.84z) + 3sin(.5x−.21z) + 1.2sin(.13x+.45z) − phase`, height `.042·(sin(p)+.22sin(2p))`. These are actual intersected geometry at low development and footprint-faded normal detail at the mature scale. They curve obliquely through the close foreground rather than being parallel screen-space lines.

Saltation uses launch velocity `v₀ = .7…1.3 m/s`, gravity **9.81 m/s²**, flight duration `T = 2v₀/g`, distance `U·T·a` and height `v₀·T·a(1−a)` for age `a∈[0,1)`. Grain identity survives landings. Two shallow view-ray samples integrate resolved near grains; three additional depth-correct samples integrate the thin windblown veil over existing brinks. This is analytic saltation, not a collision simulation.

## States and looks

| Look                               | Development | Composition                                                                            |
| ---------------------------------- | ----------: | -------------------------------------------------------------------------------------- |
| Ripples / Sandrippeln              |           0 | Close, low camera across bent ripple geometry towards distant dunes                    |
| Dunes / Dünen                      |           1 | Continuous crane opens a sweeping crescent field with sharp lee edges and crest plumes |
| Storm / Sturm                      |           2 | Internally lit rolling dust wall fills the horizon behind a rim-lit stone group        |
| Silver Silt / Silbersand           |         .15 | Low vantage, stronger ripple relief, quiet wind                                        |
| Crescent Caravan / Sichelkarawane  |           1 | Elevated view, tall dunes, reverse drift                                               |
| Star Sands / Sternensand           |        1.15 | Higher moon, crossed arms and stronger saltation                                       |
| Buried Temple / Versunkener Tempel |        1.85 | Low viewpoint and low relief beneath the stones                                        |
| Night Front / Nachtfront           |           2 | Higher viewpoint, dense dust and faster wind                                           |

## Light, sky and volume

Stronger grazing palette moonlight, restrained camera-side fill, rough diffuse sand, long crisp shadows, antialiased brink light and footprint-limited sparkle make the relief legible. Specular sheen is deliberately small. The moon is a shaded spherical/gibbous surface with maria and fine crater variation, not a uniform disc. A dense resolution-aware star field and a diagonal mottled Milky Way with dark lanes establish the night sky. All colours derive from palette primary/secondary/accent and white/black mixes.

The haboob is an eight-slab Beer–Lambert volume, depth-tested against terrain and analytic ray-box stones. A wall smoothly unions with three-dimensional seeded rolling billows; curled multiscale noise perturbs density and normals. Rounded shoulder normals avoid planar shading seams visible at 4K. Local extinction darkens the volume interior; one irregular internal glow exceeds 1.0 without flashing the frame. Nearest-base angular dust vortices curl around the stones. Stone faces have palette fill, texture, seams and bright bevel/rim light rather than uniformly black fills.

The camera drifts laterally, cranes with development and never rolls or cuts. The central 32 m stone is the top-state scale cue. Portrait keeps that hero intact; the off-axis moon can leave narrow framing.

## Energy, rhythm and endlessness

Energy changes integrated wind speed and visible grain/streamer activity, not master brightness. The kick FOV nudge is below 2%; internal storm illumination remains local and bounded.

- **4 beats — Crest saltation:** packets on the persistent brinks.
- **8 beats — Slipface stream:** an independent stream on those same slopes.
- **16 beats — Haboob roll:** bounded grain lift and internal rolling-fold illumination.

Three integrated 2π clocks own wind/ripple/grain age, camera drift and dust folding. Uses are periodic sin/cos, integer harmonics or grain landings. No hourly raw-time wrap, palette sawtooth or exhausted simulation; development never changes clocks or material identity. Forward and reverse use the same field.

## Cost

A capped **48-step** terrain solve, four refinements and **six** long-range shadow samples. The exact upper envelope `4.4·relief + .052·ripple` rejects sky only after it is above all possible terrain, including upward rays from the opening eye. A two-scale solve uses conservative macro clearance outside the bounded microrelief envelope and evaluates full ripples near the surface. It does not replace the ripple geometry with shading. Mature normals are analytic. Empty/occluded dust intervals, density-free support and negligible transmittance skip further work.

The optional **128×136 RGBA32F data prepass** contains integer noise-cell corners and fixed seeded dune transforms, never a reduced-resolution image or terrain approximation. The analytic fallback remains. Native comparisons at three energies × three states have maximum mean departure **.681/255**, maximum RGB departure **3/255**, from GPU float/code-path rounding.

ANGLE Metal / Apple M3 Pro, required `profile-families.mjs --types --families dunes`, energy .95, 12 measured frames, full output and post path:

| State   | Baseline 1080p → final | Baseline 4K → final |
| ------- | ---------------------: | ------------------: |
| Ripples |       5.0 → **4.4 ms** |  16.6 → **14.3 ms** |
| Dunes   |       3.4 → **4.4 ms** |  12.8 → **12.1 ms** |
| Storm   |       5.5 → **4.4 ms** |  16.8 → **15.4 ms** |

Every final state meets the new-world limits of 8 / 16 ms p50. These are synchronous throughput measurements, not venue cadence certification. Concurrent fleet GPU activity caused substantial variation in intermediate probes; the raw final and baseline JSON files are retained with the worker evidence.

## Verification and visual review

`tests/dunes.test.mjs` covers horn/lee geometry, physical repose, 5,000 exact-normal comparisons, tile joins and identity/reversal, ripple bounds/periodicity, ballistic acceleration/apex/range/landing, 2,000 exact noise-gradient comparisons, continuous dust shoulder normals, 10,000 terrain-envelope checks and conservative microrelief clearance, data packing, all eight presets and stable world lookup **by ID, never registry position**. `tests/time.test.mjs` covers clocks. Native verification covers all states at 3600 / 4096 / 43,200 s, cached/fallback rendering, zero GL/non-finite errors and full-size 4K stills. All-look energy ladder, reverse, extra look, portrait and Copper / Glacier / Symbiosis films are reviewed.

This revision followed the independent 5/10 review, with a new baseline, a side-by-side **Liquid Chrome** reference and **seven filmed improvement rounds**. The previous 9/10 self-rating was too generous. **Current honest rating: 7.5/10.** Relief and sky read immediately and the storm now has scale and depth, but the analytic dust is still softer and more repetitive than a high-end fluid volume, some sand planes are too smooth/silvered, and low-energy lee faces remain dark. It does not yet match the reference's 9/10 material finish.

Detailed evidence and test status are in the fleet worker's `output/report.md`. Preview baking/curation remains integration work.
