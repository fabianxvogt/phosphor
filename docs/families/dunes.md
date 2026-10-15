# Dune Sea · Dünenmeer (#114)

One persistent night desert, `scene-dunes.mjs`, world **`dune-sea`**. Ripples / Sandrippeln → Dunes / Dünen → Storm / Sturm use seed **11401** and identical non-development parameters. All eight preset names, seeds, look IDs, schema keys and world definitions are unchanged. No engine or shared-registry changes.

## Signature and mathematics

The opening now follows a single winding brink from the near foreground towards the horizon. Its world-space centre is `c(z) = −2 + 4.8 sin(.065z) + 1.2 sin(.13z)`. For `d=x−c(z)`, the windward profile is `3.4 max(0,1−(d/9)²)²`; the lee is `max(0,3.4−tan(34°)d)`. Height and exact derivatives taper continuously with `1−smoothstep(0,1,development)`, merging into the persistent barchan field. Importantly, this ridge uses **world coordinates**, never the staggered dune chart; otherwise row boundaries create cliffs and normal moiré. The camera follows the brink before opening into the mature panorama.

For each seeded barchan, `v=x/11`, crest `c=−3+13v²`, crest height `H=h max(0,(1−v²)(1+.6v²))`, shoulder `L=14−8v²`, and downwind distance `d=z−c`. The shoulder is `H max(0,1−(d/L)²)²`; the lee is `max(0,H−repose·d)`. Narrowing shoulders produce separated downwind horns and an empty lee centre. Rotation/scale come from the fixed staggered 28×32 m material chart; crossed arms persist at seeded star-dune sites. Mature repose compensates for site scale and authored height to retain **34°**. Exact normals include shoulder variation, rotation, compact cell support and the leading-ridge maximum.

### Filtered sand, not striped dune faces

Micro-ripples are **filtered shading**, not displaced geometry: tiny grazing-angle displacement was the source of comb-like silhouettes. Their bent phase is

`p = 6(.55x+.84z) + 2.6 sin(.31x−.19z+1.4sin(.09z)) + 2.2 sin(.13x+.35z) + .8 sin(.8x+.57z) − phase`.

Amplitude varies spatially as `.028(.65+.35sin(.2x+.23z))`; the asymmetric second harmonic has weight `.22`. Analytic phase gradients are projected through `dFdx/dFdy` of the hit chart. Gaussian pixel integration attenuates the fundamental by `exp(−w²/2)` and the second harmonic by its **fourth power**. Derivatives are outside per-pixel branches. Ripples fade on steep facets and disappear at mature scale instead of laying regular lines across every dune face. Fine albedo noise is footprint filtered too.

Moonlit grain glints use seeded sub-cell positions, Gaussian pixel kernels and area compensation, with unresolved grains fading away. Resolved glints exceed 1.0 into bloom. Ballistic saltation remains `T=2v₀/g`, `x=UTa`, `y=v₀Ta(1−a)`, **g=9.81**, launch `.7…1.3 m/s`; persistent identities land once per cycle. Near samples reuse the local tangent plane. Three depth-correct samples over nearby brinks carry thin streaming veils; storm gusts add racing, curled dust streamers ahead of the front.

## Storm, light and atmosphere

A continuous dark dust wall supports nested, asymmetric ellipsoidal rolls and smaller cauliflower turrets. **Exact quadratic ray intervals** define a sharp, pixel-antialiased upper silhouette. Physical-width shoulder blending is separate from pixel-width silhouette coverage. The base fades continuously into the rolls; exit intervals extend continuously rather than being replaced by each new sphere, avoiding hard circular or horizontal lighting seams.

Two bounded Beer–Lambert samples integrate behind this exact front, clipped by terrain and five analytic opaque ray-box monoliths. Curled multiscale density, perturbed normals, penetration falloff and height-dependent light make the top moonlit and the base nearly black. A broad, warped, noise-modulated internal scattering field spreads palette light through folds: **no sun/disc primitive and no saturated yellow spot**. This is an economical analytic volume, not a fluid simulation.

Monoliths retain the central **32 m** scale cue, stone-face variation, bright moonlit bevels and antialiased emissive rune columns with soft halos. Glyph cores exceed 1.0. The gibbous textured moon, star field, mottled Milky Way and restrained terrain fill remain. Colour derives only from the palette and white/black mixes. Dense horizon haze fully extinguishes distant material from 100–170 m; near-tangent downward rays finish against the true ground-plane bracket instead of exposing holes or fake vertical facets.

## Looks and arc

| Look | Development | Composition |
| --- | ---: | --- |
| Ripples / Sandrippeln | 0 | Winding foreground brink, filtered ripples, streaming sand and glints |
| Dunes / Dünen | 1 | Crane over sharp crescent dunes, empty lee centres and brink veils |
| Storm / Sturm | 2 | Towering dark-based billowing wall behind glowing, rim-lit stones |
| Silver Silt / Silbersand | .15 | Quiet wind and stronger organic ripple relief |
| Crescent Caravan / Sichelkarawane | 1 | Elevated tall crescents and reverse drift |
| Star Sands / Sternensand | 1.15 | Higher moon, crossed arms and stronger wind |
| Buried Temple / Versunkener Tempel | 1.85 | Low relief and viewpoint beneath the stones |
| Night Front / Nachtfront | 2 | Dense dust and faster wind |

Continuous development changes actual field/camera/front geometry; reversal uses the same sites and clocks. Portrait preserves the main crest and central stone; the off-axis moon can leave narrow framing.

## Energy, rhythm and long shows

Energy changes integrated wind speed and grain/streamer activity, not master brightness. A bounded kick FOV nudge stays below 2%. Existing family gestures are unchanged:

- **4 beats — Crest saltation:** grains on persistent brinks.
- **8 beats — Slipface stream:** an independent existing-slope stream.
- **16 beats — Haboob roll:** local grain lift and internal fold illumination.

Three integrated 2π clocks own wind/grain/ripple phase, camera drift and dust folding. All uses are periodic sin/cos, integer harmonics or landings. No raw hourly wrap, palette sawtooth, exhausted simulation or development-dependent identity reset.

## Cost and measured budgets

Full-resolution rendering. **36** capped terrain steps, four local refinements, an eight-refinement tangent fallback and **five** long-range shadow samples. A separate **exact height-only profile** avoids transporting normals through every march/shadow call. Leading-ridge dominance skips tiled dunes only above their proven maximum. Dark-side shadow and fully extinguished distance skips, nearby-brink plume support, local saltation planes and negligible transmittance avoid unused work.

The optional **128×137 RGBA32F data pass** caches integer noise corners, fixed seeded dune transforms and one row of exact current storm-roll centres/radii. It never caches a colour image or sampled terrain. All data have analytic fallbacks. Nine native cached/fallback comparisons have maximum mean departure below **.60/255**, maximum channel departure **3/255** (opening exactly identical).

ANGLE Metal / Apple M3 Pro, `profile-families.mjs --types --families dunes`, energy .95, including post. Final stable run used 12 samples at 1080p and 36 at 4K:

| State | Previous final → final 1080p p50 | Previous final → final 4K p50 | Final 4K p95 |
| --- | ---: | ---: | ---: |
| Ripples | 4.4 → **4.2 ms** | 14.3 → **13.3 ms** | 14.3 ms |
| Dunes | 4.4 → **3.5 ms** | 12.1 → **11.7 ms** | 12.2 ms |
| Storm | 4.4 → **3.8 ms** | 15.4 → **13.1 ms** | 13.9 ms |

Every state is faster than the previous final and meets **8 / 16 ms p50**. Concurrent fleet activity caused probes as high as 20–33 ms, including similarly elevated unchanged-reference runs. All raw probes are retained; the stable final run passed every state together. These synchronous measurements are not venue-cadence certification.

## Verification and visual assessment

`tests/dunes.test.mjs` covers 34° repose, separated horns, **10,000** exact height-only/full-profile comparisons, **5,000** analytic normal comparisons including the leading ridge, world-chart row continuity, reversible identity, ripple bounds and periodicity, Gaussian Fourier response and harmonic filtering, ballistic acceleration/apex/landing, **2,000** noise-gradient and **2,000** ellipsoid-interval checks, continuous volume joins, Beer–Lambert invariance, bounds, data packing, all eight presets and stable world lookup **by ID**, never registry position. `tests/time.test.mjs` covers clocks.

Native checks cover cached/fallback rendering, all three states across 3600 / 4096 / 43,200 s, zero GL/non-finite errors, full-size 1080p and 4K stills, all-look energy ladders, reverse development, Silver Silt, portrait, and Copper / Glacier / Symbiosis films. Multiple full-size inspections caught and removed intermediate ridge-chart and dust-join defects that were not apparent in strips.

This final round adds **nine filmed iterations** after the new baseline. Honest rating: **8/10 overall** (opening ~8.5, mature ~8, storm ~7.5). The opening is much stronger and the dune-face moiré/disc glow are removed. Remaining weaknesses: storm turbulence is still visibly analytic/repetitive rather than high-end fluid detail; distant dune topology is regular; some silver sand planes are too smooth. It does not merit 9/10 against the retained Liquid Chrome reference.

Detailed paths, raw timings and test status are in the fleet worker's absolute `output/report.md`. Catalog baking/curation remains integration work.
