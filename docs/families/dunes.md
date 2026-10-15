# Dune Sea · Dünenmeer (#114)

One persistent night desert, `scene-dunes.mjs`, world `dune-sea`. The development fader is real relief/camera/front geometry, not a dissolve. The three world snapshots share seed **11401** and every non-development parameter. No engine changes.

## Mathematics and signature

The hero is wind-written sand: close ripples, crescent barchans with leeward horns, a persistent subset of crossed star-dune arms, then the same landscape beneath a rolling haboob and five dark monoliths.

In a dune's wind-aligned chart, `v = x/11`, crest `c = -2 + 7v²`, crest height `H = h·max(0,1−v²)`, and `d = z−c`. The windward profile is `H·max(0,1−(d/14)²)²`; the lee is `max(0,H−tan(34°)·d)`. This gives a broad windward shoulder, a sharp crest and downwind horns rather than a sinusoidal mountain field. Site rotation and size are seeded once in the fixed staggered 28×32 m chart. Mature slip slopes compensate for site scale and the height fader; development deliberately flattens them towards ripples. Secondary arms and a compact, differentiable cell-edge support make star dunes. Normals use the exact transformed analytic derivatives of the winning arm, including the support envelope.

Ripples use `p = 8z + 2sin(.55x+.23z) + .6sin(1.1x−.18z) − phase`, height `.028·(sin(p)+.22sin(2p))`. The second harmonic gives an asymmetric wind profile, while domain bending avoids ruler-straight water waves. These are actual raymarched geometry at low development and band-limited material-normal detail at the mature scale.

Saltation uses launch velocity `v₀ = .7…1.3 m/s`, gravity **9.81 m/s²**, flight duration `T = 2v₀/g`, downwind distance `U·T·a` and height `v₀·T·a(1−a)` for age `a∈[0,1)`. Identity persists over landings. Two shallow view-ray samples integrate nearby Gaussian grains; unresolved grains fade with the pixel footprint. Their carrier uses the local surface height, an approximation rather than a collision simulation. Broad noise-modulated crest streamers remain visible at distance.

## States and eight looks

| Look                               | Development | Composition                                                                 |
| ---------------------------------- | ----------: | --------------------------------------------------------------------------- |
| Ripples / Sandrippeln              |           0 | Low, grazing moonlight across curved ripples and airborne grains            |
| Dunes / Dünen                      |           1 | Continuous crane reveals barchan and star-dune fields with long shadows     |
| Storm / Sturm                      |           2 | Towering, internally lit dust front behind the emerging dark monolith group |
| Silver Silt / Silbersand           |         .15 | Low vantage, strong ripple relief, quiet wind                               |
| Crescent Caravan / Sichelkarawane  |           1 | Elevated view, taller dunes, reverse lateral drift                          |
| Star Sands / Sternensand           |        1.15 | Higher moon, crossed dune arms, stronger saltation                          |
| Buried Temple / Versunkener Tempel |        1.85 | Low viewpoint and low dune relief below the monoliths                       |
| Night Front / Nachtfront           |           2 | High viewpoint, dense suspended sand and fast wind                          |

## Rendering, light and camera

A capped 64-step heightfield march, four local refinements and eight soft-shadow samples. Sky rays skip the field. Mature macro normals are analytic, not four additional field evaluations. Distance haze hides the finite 170 m terrain solve. The dust front uses eight depth-correct slabs through a rolling domain-warped density field; foreground dunes and analytic ray-box monoliths occlude the volume. The narrow internal glow can exceed 1.0; it never flashes the whole image. The shared limiter remains untouched.

Rough sand carries palette secondary/primary moonlight, restrained grazing sheen, contact darkening and long shadows. Accent is confined to the small internal storm glow. No fixed RGB colours. The camera slowly drifts laterally with parallax and cranes continuously with development; no roll, cuts or geometry resets. The central 32 m monolith occupies about 60% of the landscape short side; the smaller stones and dune ridges establish scale. Portrait retains the central group (the off-axis moon may lie outside a narrow portrait view).

## Energy and rhythm

Energy is orthogonal to development. It raises integrated wind speed and the visible saltation population/crest packets, not a master brightness multiplier. The small kick FOV nudge is below 2%; the internal cloud kick is local and bounded.

- **4 beats — Crest saltation:** grain packets and existing crest streamers.
- **8 beats — Slipface stream:** a second independent stream on the same slopes.
- **16 beats — Haboob roll:** an 8% launch-velocity gust plus one bounded internal rolling-fold glow.

The live faders are dune relief, saltation wind and suspended sand.

## Cost and data cache

The optional **128×136 RGBA32F data prepass** holds integer noise-cell corner hashes and fixed seeded dune-site transforms. It is not a heightfield approximation or a cached colour picture: terrain intersection, normals, shadows, grains and the cloud integrate at full output resolution. Analytic fallbacks remain for hosts without float targets. CPU packing tests cover all 1,024 dune-site indices; native cached/fallback comparisons cover three energies × three states (maximum RGB difference 3/255; maximum mean .473/255, from GPU float/code-path rounding).

Measured with `scripts/profile-families.mjs --types --families dunes`, ANGLE Metal / Apple M3 Pro, 12 measured frames, full post path, energy .95:

| State   | 1920×1080 p50 | 3840×2160 p50 |
| ------- | ------------: | ------------: |
| Ripples |        4.6 ms |       14.8 ms |
| Dunes   |        3.4 ms |       11.2 ms |
| Storm   |        4.2 ms |       15.0 ms |

The early uncached 4K prototype cost 19.9 / 21.0 / 27.3 ms. No render-resolution cap or engine extension was used to meet the budget. Timings are synchronous throughput, not a venue cadence qualification; parallel fleet GPU load adds some variation.

## Endlessness and verification

Three integrated 2π clocks own wind/ripple/ballistic age, camera drift and slow dust folding. Every use is periodic (sin/cos, integer harmonics or grain landings); no modulo of raw `u_time`, palette sawtooth, simulation exhaustion or unbounded camera translation. Development changes neither the clocks nor seeded site/particle identities. Reversal is the same field sampled backwards.

`tests/dunes.test.mjs` covers crescent geometry, repose under scaling, 5,000 analytic-normal comparisons, tile joins, identity and reversible continuous development, ripple bounds/periodicity, ballistic acceleration/apex/range/landing, data packing, all eight validated presets, world registration, rhythm and bounded shader paths. `tests/time.test.mjs` covers the integrated clocks. Native GPU verification covers every state at 3600 / 4096 / 43,200 s, all three energies, cached/fallback output, zero GL errors/non-finite uploads and full-size 4K stills.

Visual review: baseline plus four substantial improvement rounds and a final moonlight/performance polish; forward and reverse 30 s films, Silver Silt, portrait, energy ladder for all eight looks, and Copper / Glacier / Symbiosis palette films. **Authored rating: 9/10** for the intended restrained, cinematic night-desert style. Remaining limits: analytic eight-slab dust rather than fluid simulation, repeated finite site topology, and intentionally subtle saltation in the distant view. The landscape remains dark by design; a poor black-level projector will lose some lee-face detail.

Evidence is delivered with the fleet worker's `output/report.md`; regenerating previews/curation is left to integration.
